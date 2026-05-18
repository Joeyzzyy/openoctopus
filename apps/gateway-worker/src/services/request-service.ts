import crypto from "node:crypto";
import { parseBillingConfig, resolveBillingBreakdown } from "../lib/billing-config.js";
import {
  pickRuntimeCredential,
  type RuntimeProviderCredential,
} from "../lib/provider-runtime-guard.js";
import { supabaseAdmin } from "../lib/supabase.js";

type ProviderCredentialRow = {
  id: string;
  provider_id: string;
  secret_source: string;
  environment: string;
  is_active: boolean;
  secret_ciphertext: string | null;
  secret_iv: string | null;
  secret_auth_tag: string | null;
};

export type UnifiedRequestInput = {
  apiKey: string;
  endpoint:
    | "/v1/images/generations"
    | "/v1/images/edits"
    | "/v1/images/recognitions"
    | "/v1/videos/generations";
  capability: "image_generation" | "image_edit" | "image_recognition" | "video_generation";
  requestSource?: "api" | "playground";
  model: string;
  prompt?: string;
  input: Record<string, unknown>;
};

export class RequestValidationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string
  ) {
    super(message);
    this.name = "RequestValidationError";
  }
}

export async function authenticateApiKey(apiKey: string) {
  const secretHash = crypto
    .createHash("sha256")
    .update(apiKey)
    .digest("hex");

  const { data: apiKeyRow, error: apiKeyError } = await supabaseAdmin
    .from("api_keys")
    .select("id, workspace_id, created_by, status, key_prefix")
    .eq("secret_hash", secretHash)
    .maybeSingle();

  if (apiKeyError) {
    throw new RequestValidationError(
      "Failed to read API key record",
      503,
      "database_operation_failed"
    );
  }

  if (!apiKeyRow || apiKeyRow.status !== "active") {
    throw new RequestValidationError("Invalid or inactive API key", 401, "invalid_api_key");
  }

  return apiKeyRow;
}

function resolveRuntimeCredential(rows: ProviderCredentialRow[]) {
  const runtimeCredentials: RuntimeProviderCredential[] = rows.map((row) => ({
    id: row.id,
    secret_source: row.secret_source,
    environment: row.environment,
    is_active: row.is_active,
    has_encrypted_secret_material: Boolean(
      row.secret_ciphertext && row.secret_iv && row.secret_auth_tag
    ),
  }));

  const credential = pickRuntimeCredential(runtimeCredentials);
  if (credential) {
    const selectedRow = rows.find((row) => row.id === credential.id);
    if (selectedRow) {
      return selectedRow;
    }
  }

  if (rows.some((row) => row.secret_source !== "internal_encrypted")) {
    throw new RequestValidationError(
      "Active provider credential still uses a legacy external reference. Rotate it in /internal before sending live traffic.",
      409,
      "provider_credential_legacy"
    );
  }

  if (rows.some((row) => !row.secret_ciphertext || !row.secret_iv || !row.secret_auth_tag)) {
    throw new RequestValidationError(
      "Active provider credential is missing encrypted secret material. Re-save or rotate the key in /internal.",
      409,
      "provider_credential_incomplete"
    );
  }

  if (rows.length > 0) {
    throw new RequestValidationError(
      "No runnable active provider credential found for this provider.",
      409,
      "provider_credential_unusable"
    );
  }

  throw new RequestValidationError(
    "No active provider credential found for this provider.",
    409,
    "provider_credential_missing"
  );
}

async function resolveProviderAdapterSlug(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("provider_adapter_aliases")
    .select("adapter_slug")
    .eq("alias_slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.adapter_slug ?? slug;
}

export async function createQueuedRequest(input: UnifiedRequestInput) {
  const apiKeyRow = await authenticateApiKey(input.apiKey);

  const { data: walletRows, error: walletError } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount_delta")
    .eq("workspace_id", apiKeyRow.workspace_id);

  if (walletError) {
    throw new RequestValidationError(
      "Failed to read wallet balance",
      503,
      "database_operation_failed"
    );
  }

  const walletBalance = (walletRows ?? []).reduce(
    (sum, row) => sum + Number(row.amount_delta ?? 0),
    0
  );

  if (walletBalance <= 0) {
    throw new RequestValidationError(
      "Insufficient balance. Please top up your wallet before making API requests.",
      402,
      "insufficient_balance"
    );
  }

  const { data: routeRow, error: routeError } = await supabaseAdmin
    .from("routing_rules")
    .select("id, primary_provider_model_id, fallback_provider_model_id")
    .eq("public_model_slug", input.model)
    .eq("capability", input.capability)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (routeError) {
    throw new RequestValidationError(
      "Failed to resolve routing rule",
      503,
      "database_operation_failed"
    );
  }

  if (!routeRow) {
    throw new RequestValidationError(
      `No routing rule found for ${input.model}`,
      404,
      "model_not_available"
    );
  }

  const { data: supportedModelRow, error: supportedModelError } = await supabaseAdmin
    .from("supported_models")
    .select("billing_config, active")
    .eq("model_slug", input.model)
    .maybeSingle();

  if (supportedModelError) {
    throw new RequestValidationError(
      "Failed to read supported model",
      503,
      "database_operation_failed"
    );
  }

  if (!supportedModelRow?.active) {
    throw new RequestValidationError(
      `Model ${input.model} is not active`,
      404,
      "model_not_available"
    );
  }

  let customerBillingConfig;
  try {
    customerBillingConfig = parseBillingConfig(supportedModelRow.billing_config);
  } catch {
    throw new RequestValidationError(
      `Model ${input.model} is missing a valid billing configuration`,
      409,
      "model_billing_not_configured"
    );
  }

  let estimatedCustomerCharge: number;
  try {
    estimatedCustomerCharge = resolveBillingBreakdown({
      config: customerBillingConfig,
      requestInput: input.input,
    }).total;
  } catch {
    throw new RequestValidationError(
      `Failed to evaluate billing for ${input.model}`,
      503,
      "billing_resolution_failed"
    );
  }

  if (estimatedCustomerCharge > walletBalance) {
    throw new RequestValidationError(
      "Insufficient balance. Please top up your wallet before making API requests.",
      402,
      "insufficient_balance"
    );
  }

  const { data: providerModelRow, error: providerModelError } = await supabaseAdmin
    .from("provider_models")
    .select("id, provider_id, upstream_model_slug, pricing, active, execution_template, execution_config")
    .eq("id", routeRow.primary_provider_model_id)
    .maybeSingle();

  if (providerModelError) {
    throw new RequestValidationError(
      "Failed to read provider model",
      503,
      "database_operation_failed"
    );
  }

  if (!providerModelRow) {
    throw new Error("Primary provider model is missing");
  }

  if (!providerModelRow.active) {
    throw new RequestValidationError(
      `Primary provider model for ${input.model} is not active.`,
      409,
      "provider_model_inactive"
    );
  }

  try {
    parseBillingConfig(providerModelRow.pricing);
  } catch {
    throw new RequestValidationError(
      `Provider pricing is missing a valid billing configuration for ${input.model}`,
      409,
      "provider_pricing_not_configured"
    );
  }

  const { data: providerRow, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("slug, base_url, config, status")
    .eq("id", providerModelRow.provider_id)
    .maybeSingle();

  if (providerError) {
    throw new RequestValidationError(
      "Failed to read provider",
      503,
      "database_operation_failed"
    );
  }

  if (!providerRow) {
    throw new Error("Provider row is missing");
  }

  if (providerRow.status === "offline") {
    throw new RequestValidationError(
      `Provider ${providerRow.slug} is offline.`,
      409,
      "provider_offline"
    );
  }

  const providerSlug = providerModelRow.execution_template?.trim()
    ? providerModelRow.execution_template
    : await resolveProviderAdapterSlug(providerRow.slug);
  const modelExecutionConfig =
    providerModelRow.execution_config &&
    typeof providerModelRow.execution_config === "object" &&
    !Array.isArray(providerModelRow.execution_config)
      ? (providerModelRow.execution_config as Record<string, unknown>)
      : {};

  const { data: credentialRows, error: credentialError } = await supabaseAdmin
    .from("provider_credentials")
    .select(
      "id, provider_id, secret_source, environment, is_active, secret_ciphertext, secret_iv, secret_auth_tag"
    )
    .eq("provider_id", providerModelRow.provider_id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (credentialError) {
    throw new RequestValidationError(
      "Failed to read provider credentials",
      503,
      "database_operation_failed"
    );
  }

  const credential = resolveRuntimeCredential((credentialRows ?? []) as ProviderCredentialRow[]);

  const requestId = crypto.randomUUID();

  const { error: insertError } = await supabaseAdmin.from("inference_requests").insert({
    id: requestId,
    workspace_id: apiKeyRow.workspace_id,
    user_id: apiKeyRow.created_by,
    api_key_id: apiKeyRow.id,
    capability: input.capability,
    public_model_slug: input.model,
    provider_id: providerModelRow.provider_id,
    endpoint: input.endpoint,
    provider_model_id: routeRow.primary_provider_model_id,
    input_payload: input.input,
    normalized_params: {
      prompt: input.prompt ?? null,
    },
    request_source: input.requestSource ?? "api",
    status: "queued",
  });

  if (insertError) {
    throw new RequestValidationError(
      "Failed to record queued request",
      503,
      "request_record_write_failed"
    );
  }

  const { error: lastUsedError } = await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRow.id);

  if (lastUsedError) {
    throw new RequestValidationError(
      "Failed to update API key last_used_at",
      503,
      "api_key_touch_failed"
    );
  }

  return {
    requestId,
    workspaceId: apiKeyRow.workspace_id,
    apiKeyId: apiKeyRow.id,
    providerModelId: routeRow.primary_provider_model_id,
    credentialId: credential.id,
    providerSlug,
    providerBaseUrl: providerRow.base_url ?? null,
    providerConfig:
      {
        ...(providerRow.config && typeof providerRow.config === "object" && !Array.isArray(providerRow.config)
          ? (providerRow.config as Record<string, unknown>)
          : {}),
        executionConfig: {
          ...modelExecutionConfig,
        },
      },
    upstreamModelSlug: providerModelRow.upstream_model_slug,
    endpoint: input.endpoint,
    publicModelSlug: input.model,
  };
}
