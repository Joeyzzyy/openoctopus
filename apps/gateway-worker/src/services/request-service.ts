import crypto from "node:crypto";
import { parseBillingConfig } from "../lib/billing-config.js";
import { supabaseAdmin } from "../lib/supabase.js";

type ProviderCredentialRow = {
  id: string;
  provider_id: string;
  secret_source: string;
  environment: string;
};

export type UnifiedRequestInput = {
  apiKey: string;
  endpoint: "/v1/images/generations" | "/v1/videos/generations";
  capability: "image_generation" | "video_generation";
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

function pickRuntimeCredential(rows: ProviderCredentialRow[]) {
  const encryptedProduction = rows.find(
    (row) => row.secret_source === "internal_encrypted" && row.environment === "production"
  );
  if (encryptedProduction) {
    return encryptedProduction;
  }

  const encryptedAny = rows.find((row) => row.secret_source === "internal_encrypted");
  if (encryptedAny) {
    return encryptedAny;
  }

  if (rows.length > 0) {
    throw new Error("Active provider credential is still using a legacy external reference. Rotate it in /internal before live traffic.");
  }

  throw new Error("No active provider credential found for this provider");
}

export async function createQueuedRequest(input: UnifiedRequestInput) {
  const secretHash = crypto
    .createHash("sha256")
    .update(input.apiKey)
    .digest("hex");

  const { data: apiKeyRow, error: apiKeyError } = await supabaseAdmin
    .from("api_keys")
    .select("id, workspace_id, status, key_prefix")
    .eq("secret_hash", secretHash)
    .maybeSingle();

  if (apiKeyError) {
    throw new Error(apiKeyError.message);
  }

  if (!apiKeyRow || apiKeyRow.status !== "active") {
    throw new RequestValidationError("Invalid or inactive API key", 401, "invalid_api_key");
  }

  const { data: walletRows, error: walletError } = await supabaseAdmin
    .from("wallet_transactions")
    .select("amount_delta")
    .eq("workspace_id", apiKeyRow.workspace_id);

  if (walletError) {
    throw new Error(walletError.message);
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
    throw new Error(routeError.message);
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
    throw new Error(supportedModelError.message);
  }

  if (!supportedModelRow?.active) {
    throw new RequestValidationError(
      `Model ${input.model} is not active`,
      404,
      "model_not_available"
    );
  }

  try {
    parseBillingConfig(supportedModelRow.billing_config);
  } catch {
    throw new RequestValidationError(
      `Model ${input.model} is missing a valid billing configuration`,
      409,
      "model_billing_not_configured"
    );
  }

  const { data: providerModelRow, error: providerModelError } = await supabaseAdmin
    .from("provider_models")
    .select("id, provider_id, upstream_model_slug")
    .eq("id", routeRow.primary_provider_model_id)
    .maybeSingle();

  if (providerModelError) {
    throw new Error(providerModelError.message);
  }

  if (!providerModelRow) {
    throw new Error("Primary provider model is missing");
  }

  const { data: providerRow, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("slug, base_url, config")
    .eq("id", providerModelRow.provider_id)
    .maybeSingle();

  if (providerError) {
    throw new Error(providerError.message);
  }

  if (!providerRow) {
    throw new Error("Provider row is missing");
  }

  const { data: credentialRows, error: credentialError } = await supabaseAdmin
    .from("provider_credentials")
    .select("id, provider_id, secret_source, environment")
    .eq("provider_id", providerModelRow.provider_id)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (credentialError) {
    throw new Error(credentialError.message);
  }

  const credential = pickRuntimeCredential((credentialRows ?? []) as ProviderCredentialRow[]);

  const requestId = crypto.randomUUID();
  const providerSlug = providerRow.slug;

  const { error: insertError } = await supabaseAdmin.from("inference_requests").insert({
    id: requestId,
    workspace_id: apiKeyRow.workspace_id,
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
    status: "queued",
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: lastUsedError } = await supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRow.id);

  if (lastUsedError) {
    throw new Error(lastUsedError.message);
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
      providerRow.config && typeof providerRow.config === "object" && !Array.isArray(providerRow.config)
        ? (providerRow.config as Record<string, unknown>)
        : null,
    upstreamModelSlug: providerModelRow.upstream_model_slug,
    endpoint: input.endpoint,
    publicModelSlug: input.model,
  };
}
