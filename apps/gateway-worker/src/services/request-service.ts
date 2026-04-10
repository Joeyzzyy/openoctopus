import crypto from "node:crypto";
import { supabaseAdmin } from "../lib/supabase.js";

export type UnifiedRequestInput = {
  apiKey: string;
  endpoint: "/v1/images/generations" | "/v1/videos/generations";
  capability: "image_generation" | "video_generation";
  model: string;
  prompt?: string;
  input: Record<string, unknown>;
};

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
    throw new Error("Invalid or inactive API key");
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
    throw new Error(`No routing rule found for ${input.model}`);
  }

  const { data: providerModelRow, error: providerModelError } = await supabaseAdmin
    .from("provider_models")
    .select("id, provider_id")
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
    .select("slug")
    .eq("id", providerModelRow.provider_id)
    .maybeSingle();

  if (providerError) {
    throw new Error(providerError.message);
  }

  if (!providerRow) {
    throw new Error("Provider row is missing");
  }

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

  return {
    requestId,
    workspaceId: apiKeyRow.workspace_id,
    apiKeyId: apiKeyRow.id,
    providerModelId: routeRow.primary_provider_model_id,
    providerSlug,
    endpoint: input.endpoint,
    publicModelSlug: input.model,
  };
}
