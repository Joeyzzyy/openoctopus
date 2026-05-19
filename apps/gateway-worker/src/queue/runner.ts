import { supabaseAdmin } from "../lib/supabase.js";
import { decryptProviderSecret } from "../lib/provider-secret-crypto.js";
import { normalizeOutputPayloadByCapability } from "../lib/image-output-contract.js";
import { getProviderAdapter } from "../providers/index.js";
import { AssetIntegrityError, persistGeneratedAssets } from "../services/assets-service.js";
import {
  recordRequestSettlement,
  resolveSettlementAmounts,
} from "../services/billing-service.js";

type QueueMessage = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  providerModelId: string;
  credentialId: string;
  providerSlug: string;
  providerBaseUrl: string | null;
  providerConfig: Record<string, unknown> | null;
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
  publicModelSlug: string;
  upstreamModelSlug: string;
  endpoint: string;
  prompt?: string;
  input: Record<string, unknown>;
};

type PollingMessage = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  providerModelId: string;
  credentialId: string;
  providerSlug: string;
  providerBaseUrl: string | null;
  providerConfig: Record<string, unknown> | null;
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
  publicModelSlug: string;
  upstreamModelSlug: string;
  endpoint: string;
  input: Record<string, unknown>;
  upstreamTaskId: string;
};

type QueueEnvelope = {
  msg_id: number;
  message: unknown;
};

type QueueName = "inference_jobs" | "inference_polling";

const POLLING_RECOVERY_STALE_SECONDS = 120;
const POLLING_TIMEOUT_SECONDS = 20 * 60;
const POLLING_RECOVERY_BATCH_SIZE = 20;
const QUEUED_TIMEOUT_SECONDS = 15 * 60;
const QUEUED_TIMEOUT_BATCH_SIZE = 25;
const FEISHU_ERROR_WEBHOOK_URL = process.env.FEISHU_BOT_WEBHOOK_URL?.trim() ?? "";
let hasWarnedMissingFeishuWebhook = false;

function formatShanghaiTimestamp(value: Date | string | null | undefined) {
  if (!value) {
    return "n/a";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return (
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date) + " UTC+8"
  );
}

async function sendFeishuFailureAlert(input: {
  phase: "submit" | "poll" | "timeout" | "system";
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  capability: string;
  publicModelSlug: string;
  providerSlug: string;
  upstreamModelSlug: string;
  endpoint: string;
  errorCode: string;
  errorMessage: string;
  occurredAt?: Date;
}) {
  if (!FEISHU_ERROR_WEBHOOK_URL) {
    if (!hasWarnedMissingFeishuWebhook) {
      hasWarnedMissingFeishuWebhook = true;
      console.warn(
        "[gateway-worker] FEISHU_BOT_WEBHOOK_URL is not configured; failure alerts are disabled."
      );
    }
    return;
  }

  const normalizeReason = () => {
    const lower = input.errorMessage.toLowerCase();
    if (
      lower.includes("429") ||
      lower.includes("quota") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests") ||
      lower.includes("engineoverloaded")
    ) {
      return "Upstream provider is throttling or overloaded. Retry later.";
    }
    if (lower.includes("timed out") || lower.includes("timeout")) {
      return "Upstream request timed out.";
    }
    if (input.errorCode === "provider_credential_unavailable") {
      return "Provider credential is unavailable.";
    }
    if (input.errorCode === "provider_credential_decrypt_failed") {
      return "Provider credential decrypt failed.";
    }
    return "Upstream request failed.";
  };

  const compactRawError = input.errorMessage
    .replace(/\s+/g, " ")
    .replace(/body=\{[\s\S]*$/i, "body=<omitted>")
    .trim();
  const rawPreview =
    compactRawError.length > 420 ? `${compactRawError.slice(0, 420)}...` : compactRawError;

  const [workspaceResp, apiKeyResp] = await Promise.all([
    supabaseAdmin
      .from("workspaces")
      .select("name, slug")
      .eq("id", input.workspaceId)
      .maybeSingle(),
    input.apiKeyId
      ? supabaseAdmin
          .from("api_keys")
          .select("name, key_prefix")
          .eq("id", input.apiKeyId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const workspaceName = workspaceResp.data?.name ?? "Unknown workspace";
  const workspaceSlug = workspaceResp.data?.slug ?? "unknown-workspace";
  const apiKeyName = apiKeyResp.data?.name ?? "unknown-key";
  const apiKeyPrefix = apiKeyResp.data?.key_prefix ?? "n/a";

  const lines = [
    "\u26a0\ufe0f OpenOctopus Request Failed",
    `Reason: ${normalizeReason()}`,
    `Time: ${formatShanghaiTimestamp(input.occurredAt ?? new Date())}`,
    `Phase: ${input.phase}`,
    `Code: ${input.errorCode}`,
    `Request ID: ${input.requestId}`,
    `Workspace: ${workspaceName} (${workspaceSlug})`,
    `API Key: ${apiKeyName} (${apiKeyPrefix})`,
    `Capability: ${input.capability}`,
    `Public Model: ${input.publicModelSlug}`,
    `Upstream: ${input.providerSlug} / ${input.upstreamModelSlug}`,
    `Endpoint: ${input.endpoint}`,
    `Raw: ${rawPreview}`,
  ];

  try {
    const response = await fetch(FEISHU_ERROR_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        msg_type: "post",
        content: {
          post: {
            en_us: {
              title: "OpenOctopus Request Failed",
              content: [
                [
                  { tag: "text", text: "⚠️ " },
                  { tag: "text", text: "Reason: " },
                  { tag: "text", text: normalizeReason() },
                ],
                [
                  { tag: "text", text: "Time: " },
                  { tag: "text", text: formatShanghaiTimestamp(input.occurredAt ?? new Date()) },
                  { tag: "text", text: "   " },
                  { tag: "text", text: "Phase: " },
                  { tag: "text", text: input.phase },
                ],
                [
                  { tag: "text", text: "Code: " },
                  { tag: "text", text: input.errorCode },
                  { tag: "text", text: "   " },
                  { tag: "text", text: "Request ID: " },
                  { tag: "text", text: input.requestId },
                ],
                [
                  { tag: "text", text: "Workspace: " },
                  { tag: "text", text: `${workspaceName} (${workspaceSlug})` },
                ],
                [
                  { tag: "text", text: "API Key: " },
                  { tag: "text", text: `${apiKeyName} (${apiKeyPrefix})` },
                ],
                [
                  { tag: "text", text: "Capability: " },
                  { tag: "text", text: input.capability },
                  { tag: "text", text: "   " },
                  { tag: "text", text: "Public Model: " },
                  { tag: "text", text: input.publicModelSlug },
                ],
                [
                  { tag: "text", text: "Upstream: " },
                  { tag: "text", text: `${input.providerSlug} / ${input.upstreamModelSlug}` },
                ],
                [
                  { tag: "text", text: "Endpoint: " },
                  { tag: "text", text: input.endpoint },
                ],
                [
                  { tag: "text", text: "Raw: " },
                  { tag: "text", text: rawPreview },
                ],
              ],
            },
          },
        },
      }),
    });
    const responseText = await response.text();
    let parsedBody: Record<string, unknown> | null = null;
    try {
      parsedBody = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      parsedBody = null;
    }

    const feishuCode =
      parsedBody && typeof parsedBody.code === "number" ? parsedBody.code : null;
    if (!response.ok || (feishuCode !== null && feishuCode !== 0)) {
      console.error("[gateway-worker] Feishu alert delivery failed", {
        requestId: input.requestId,
        status: response.status,
        statusText: response.statusText,
        feishuCode,
        responseBody:
          responseText.length > 500
            ? `${responseText.slice(0, 500)}...`
            : responseText,
      });
    }
  } catch {
    // keep worker path non-blocking on alert delivery failures
    console.error("[gateway-worker] Feishu alert delivery threw an exception", {
      requestId: input.requestId,
      phase: input.phase,
      errorCode: input.errorCode,
    });
  }
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

function normalizeQueueRows(data: unknown): QueueEnvelope[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (row): row is QueueEnvelope =>
      typeof row === "object" &&
      row !== null &&
      "msg_id" in row &&
      "message" in row
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumericCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getNestedNumber(source: Record<string, unknown> | null, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return null;
    }
    current = record[key];
  }

  return readNumericCandidate(current);
}

function readPath(source: unknown, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return null;
    }
    current = record[key];
  }
  return current ?? null;
}

function normalizeImageAssets(output: Record<string, unknown> | null) {
  if (!output) {
    return output;
  }

  const existingAssets = Array.isArray(output.assets) ? output.assets : [];
  if (existingAssets.length > 0) {
    return output;
  }

  const raw = asRecord(output.raw);
  if (!raw) {
    return output;
  }

  const azureB64 = readPath(raw, ["data", "0", "b64_json"]);
  if (typeof azureB64 === "string" && azureB64.length > 0) {
    return {
      ...output,
      assets: [{ type: "image", url: `data:image/png;base64,${azureB64}` }],
    };
  }

  const azureUrl = readPath(raw, ["data", "0", "url"]);
  if (typeof azureUrl === "string" && azureUrl.length > 0) {
    return {
      ...output,
      assets: [{ type: "image", url: azureUrl }],
    };
  }

  const geminiInlineData = readPath(raw, [
    "candidates",
    "0",
    "content",
    "parts",
    "0",
    "inlineData",
    "data",
  ]);
  const geminiMimeType = readPath(raw, [
    "candidates",
    "0",
    "content",
    "parts",
    "0",
    "inlineData",
    "mimeType",
  ]);
  if (typeof geminiInlineData === "string" && geminiInlineData.length > 0) {
    const mimeType =
      typeof geminiMimeType === "string" && geminiMimeType.length > 0
        ? geminiMimeType
        : "image/png";
    return {
      ...output,
      assets: [{ type: "image", url: `data:${mimeType};base64,${geminiInlineData}` }],
    };
  }

  return output;
}

function resolveVideoDurationSeconds(input: {
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}) {
  const requestInput = input.requestInput ?? null;
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;

  return (
    readNumericCandidate(requestInput?.durationSeconds) ??
    readNumericCandidate(requestInput?.duration_seconds) ??
    readNumericCandidate(requestInput?.duration) ??
    getNestedNumber(output, ["durationSeconds"]) ??
    getNestedNumber(output, ["duration_seconds"]) ??
    getNestedNumber(providerRaw, ["durationSeconds"]) ??
    getNestedNumber(providerRaw, ["duration_seconds"]) ??
    null
  );
}

function withNormalizedVideoDuration(input: {
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}) {
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;

  if (input.capability !== "video_generation" || !output) {
    return {
      output,
      providerRaw,
    };
  }

  const durationSeconds = resolveVideoDurationSeconds(input);
  if (durationSeconds === null) {
    return {
      output,
      providerRaw,
    };
  }

  return {
    output: {
      ...output,
      durationSeconds,
    },
    providerRaw: providerRaw
      ? {
          ...providerRaw,
          durationSeconds,
        }
      : {
          durationSeconds,
        },
  };
}

function withNormalizedOutput(input: {
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}) {
  const withDuration = withNormalizedVideoDuration(input);
  if (input.capability !== "image_generation" && input.capability !== "image_edit") {
    return withDuration;
  }

  return {
    output: normalizeImageAssets(withDuration.output),
    providerRaw: withDuration.providerRaw,
  };
}

function buildSettlementBreakdown(input: {
  customerCharge: number;
  providerCost: number;
  profit: number;
  customerBreakdown?: Record<string, unknown>;
  providerBreakdown?: Record<string, unknown>;
}) {
  return {
    economics: {
      customerCharge: input.customerCharge,
      providerCost: input.providerCost,
      profit: input.profit,
      customer: input.customerBreakdown ?? {},
      provider: input.providerBreakdown ?? {},
    },
  };
}

function assertNoRpcError(error: { message?: string } | null | undefined, action: string) {
  if (error) {
    throw new Error(`${action} failed: ${error.message ?? "Unknown Supabase RPC error"}`);
  }
}

function queueMessageMatchesRequest(
  message: QueueMessage | PollingMessage,
  requestRow: {
    workspace_id: string;
    api_key_id: string | null;
    provider_model_id: string | null;
    capability: string;
    public_model_slug: string;
    endpoint: string | null;
  }
) {
  return (
    requestRow.workspace_id === message.workspaceId &&
    requestRow.api_key_id === message.apiKeyId &&
    requestRow.provider_model_id === message.providerModelId &&
    requestRow.capability === message.capability &&
    requestRow.public_model_slug === message.publicModelSlug &&
    requestRow.endpoint === message.endpoint
  );
}

async function sendQueueMessage(input: {
  queueName: QueueName;
  message: QueueMessage | PollingMessage;
  delaySeconds?: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("queue_send", {
    queue_name: input.queueName,
    msg: input.message,
    delay: input.delaySeconds ?? 0,
  });

  assertNoRpcError(error, `queue_send(${input.queueName})`);

  if (data === null || data === undefined) {
    throw new Error(`queue_send(${input.queueName}) failed: no message id returned`);
  }
}

async function deleteQueueMessage(input: {
  queueName: QueueName;
  messageId: number;
}) {
  const { data, error } = await supabaseAdmin.rpc("queue_delete", {
    queue_name: input.queueName,
    message_id: input.messageId,
  });

  assertNoRpcError(error, `queue_delete(${input.queueName})`);

  if (data !== true) {
    throw new Error(`queue_delete(${input.queueName}) failed: message ${input.messageId} was not deleted`);
  }
}

async function failRequestAndDeleteQueueMessage(input: {
  queueName: QueueName;
  messageId: number;
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  publicModelSlug: string;
  endpoint: string;
  errorCode: string;
  errorMessage: string;
  startedAt?: Date;
  capability?: string;
  providerSlug?: string;
  upstreamModelSlug?: string;
}) {
  const completedAt = new Date();
  await supabaseAdmin
    .from("inference_requests")
    .update({
      status: "failed",
      error_code: input.errorCode,
      error_message: input.errorMessage,
      actual_cost: 0,
      actual_customer_charge: 0,
      actual_provider_cost: 0,
      actual_profit: 0,
      ...(input.startedAt ? { started_at: input.startedAt.toISOString() } : {}),
      completed_at: completedAt.toISOString(),
    })
    .eq("id", input.requestId);

  try {
    await recordRequestSettlement({
      requestId: input.requestId,
      workspaceId: input.workspaceId,
      apiKeyId: input.apiKeyId,
      publicModelSlug: input.publicModelSlug,
      endpoint: input.endpoint,
      customerCharge: 0,
      providerCost: 0,
      statusCode: 500,
      breakdown: buildSettlementBreakdown({
        customerCharge: 0,
        providerCost: 0,
        profit: 0,
      }),
    });
  } catch {
    // Old queued messages can reference API keys that were later deleted.
    // Do not let settlement backfill failures keep unrecoverable jobs alive.
  }

  await sendFeishuFailureAlert({
    phase: "system",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    apiKeyId: input.apiKeyId,
    capability: input.capability ?? "unknown",
    publicModelSlug: input.publicModelSlug,
    providerSlug: input.providerSlug ?? "unknown-provider",
    upstreamModelSlug: input.upstreamModelSlug ?? "unknown-upstream-model",
    endpoint: input.endpoint,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    occurredAt: completedAt,
  });

  await deleteQueueMessage({
    queueName: input.queueName,
    messageId: input.messageId,
  });
}

async function deleteQueueMessageIfRequestAlreadySucceeded(input: {
  queueName: QueueName;
  messageId: number;
  requestId: string;
}) {
  const { data, error } = await supabaseAdmin
    .from("inference_requests")
    .select("status")
    .eq("id", input.requestId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.status !== "succeeded") {
    return false;
  }

  await deleteQueueMessage({
    queueName: input.queueName,
    messageId: input.messageId,
  });
  return true;
}

export async function queueRpcAvailable() {
  const { error } = await supabaseAdmin.rpc("queue_read", {
    queue_name: "inference_jobs",
    vt: 1,
    qty: 1,
  });

  return !error;
}

export async function enqueueInferenceJob(message: QueueMessage) {
  await sendQueueMessage({
    queueName: "inference_jobs",
    message,
  });
}

export async function processNextInferenceJob() {
  const { data, error } = await supabaseAdmin.rpc("queue_read", {
    queue_name: "inference_jobs",
    vt: 30,
    qty: 1,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = normalizeQueueRows(data)[0] ?? null;
  if (!row) {
    return false;
  }

  const message = row.message as QueueMessage;
  const adapter = getProviderAdapter(await resolveProviderAdapterSlug(message.providerSlug));
  const { data: credentialRow, error: credentialError } = await supabaseAdmin
    .from("provider_credentials")
    .select("secret_ciphertext, secret_iv, secret_auth_tag")
    .eq("id", message.credentialId)
    .maybeSingle();

  if (credentialError) {
    throw new Error(credentialError.message);
  }

  if (!credentialRow?.secret_ciphertext || !credentialRow.secret_iv || !credentialRow.secret_auth_tag) {
    await failRequestAndDeleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_credential_unavailable",
      errorMessage: "Provider credential secret is missing or not managed internally",
      startedAt: new Date(),
      capability: message.capability,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
    });

    return true;
  }

  let providerSecret: string;
  try {
    providerSecret = decryptProviderSecret({
      ciphertext: credentialRow.secret_ciphertext,
      iv: credentialRow.secret_iv,
      authTag: credentialRow.secret_auth_tag,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown provider credential decrypt error";
    await failRequestAndDeleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_credential_decrypt_failed",
      errorMessage,
      startedAt: new Date(),
      capability: message.capability,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
    });
    return true;
  }
  const attemptStartedAt = Date.now();
  const { data: requestRow, error: requestRowError } = await supabaseAdmin
    .from("inference_requests")
    .select("workspace_id, api_key_id, provider_id, provider_model_id, capability, public_model_slug, endpoint, status")
    .eq("id", message.requestId)
    .maybeSingle();

  if (requestRowError) {
    throw new Error(requestRowError.message);
  }

  if (!requestRow || !queueMessageMatchesRequest(message, requestRow)) {
    await deleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
    });

    return true;
  }

  if (
    requestRow?.status === "succeeded" ||
    requestRow?.status === "failed" ||
    requestRow?.status === "cancelled"
  ) {
    await deleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
    });

    return true;
  }

  const { data: existingAttempt, error: existingAttemptError } = await supabaseAdmin
    .from("provider_attempts")
    .select("status, upstream_request_id, upstream_task_id")
    .eq("request_id", message.requestId)
    .eq("attempt_no", 1)
    .maybeSingle();

  if (existingAttemptError) {
    throw new Error(existingAttemptError.message);
  }

  if (
    existingAttempt?.status === "processing" &&
    typeof existingAttempt.upstream_task_id === "string" &&
    existingAttempt.upstream_task_id.length > 0
  ) {
    await sendQueueMessage({
      queueName: "inference_polling",
      message: {
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        providerModelId: message.providerModelId,
        credentialId: message.credentialId,
        providerSlug: message.providerSlug,
        providerBaseUrl: message.providerBaseUrl,
        providerConfig: message.providerConfig,
        capability: message.capability,
        publicModelSlug: message.publicModelSlug,
        upstreamModelSlug: message.upstreamModelSlug,
        endpoint: message.endpoint,
        input: message.input,
        upstreamTaskId: existingAttempt.upstream_task_id,
      },
    });

    await deleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
    });

    return true;
  }

  if (existingAttempt?.status === "succeeded" || existingAttempt?.status === "failed") {
    await deleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
    });

    return true;
  }

  const { error: attemptInsertError } = await supabaseAdmin
    .from("provider_attempts")
    .insert({
      request_id: message.requestId,
      provider_id: requestRow?.provider_id,
      provider_model_id: requestRow?.provider_model_id,
      attempt_no: 1,
      status: "sent",
      request_payload: {
        publicModelSlug: message.publicModelSlug,
        upstreamModelSlug: message.upstreamModelSlug,
        prompt: message.prompt,
        input: message.input,
      },
    });

  if (attemptInsertError) {
    throw new Error(attemptInsertError.message);
  }

  let result;
  try {
    result = await adapter.submit({
      requestId: message.requestId,
      capability: message.capability,
      publicModelSlug: message.publicModelSlug,
      upstreamModelSlug: message.upstreamModelSlug,
      prompt: message.prompt,
      input: message.input,
      provider: {
        slug: message.providerSlug,
        baseUrl: message.providerBaseUrl,
        config: message.providerConfig,
        secret: providerSecret,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown provider submit error";
    const completedAt = new Date();

    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: "provider_submit_failed",
        error_message: errorMessage,
        started_at: new Date(attemptStartedAt).toISOString(),
        completed_at: completedAt.toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "failed",
        error_message: errorMessage,
        latency_ms: Date.now() - attemptStartedAt,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    try {
      await recordRequestSettlement({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        customerCharge: 0,
        providerCost: 0,
        statusCode: 500,
        breakdown: buildSettlementBreakdown({
          customerCharge: 0,
          providerCost: 0,
          profit: 0,
        }),
      });
    } catch {
      // Never block failure alerting on settlement write errors.
    }

    await sendFeishuFailureAlert({
      phase: "submit",
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      capability: message.capability,
      publicModelSlug: message.publicModelSlug,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_submit_failed",
      errorMessage,
      occurredAt: completedAt,
    });

    await deleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
    });

    return true;
  }

  if (result.mode === "sync") {
    try {
      const normalizedSyncResult = withNormalizedOutput({
        capability: message.capability,
        requestInput: message.input,
        output: result.output,
        providerRaw: asRecord(result.output.raw),
      });
      const providerRaw = normalizedSyncResult.providerRaw;
      const normalizedOutput = normalizeOutputPayloadByCapability({
        capability: message.capability,
        outputPayload: normalizedSyncResult.output ?? result.output,
      }) as Record<string, unknown>;
      const persistedOutput = await persistGeneratedAssets({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        output: normalizedOutput,
      });
      const settlement = await resolveSettlementAmounts({
        providerModelId: message.providerModelId,
        publicModelSlug: message.publicModelSlug,
        requestInput: message.input,
        output: persistedOutput,
        providerRaw,
        providerReportedAmount: result.estimatedCost,
      });
      await supabaseAdmin
        .from("inference_requests")
        .update({
          status: "succeeded",
          output_payload: persistedOutput,
          actual_cost: settlement.customer.total,
          actual_customer_charge: settlement.customer.total,
          actual_provider_cost: settlement.provider.total,
          actual_profit: settlement.actualProfit,
          estimated_cost: settlement.customer.total,
          estimated_customer_charge: settlement.customer.total,
          estimated_provider_cost: settlement.provider.total,
          estimated_profit: settlement.actualProfit,
          started_at: new Date(attemptStartedAt).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .eq("id", message.requestId);

      await supabaseAdmin
        .from("provider_attempts")
        .update({
          status: "succeeded",
          upstream_request_id: result.upstreamRequestId,
          response_payload: persistedOutput,
          latency_ms: Date.now() - attemptStartedAt,
        })
        .eq("request_id", message.requestId)
        .eq("attempt_no", 1);

      await recordRequestSettlement({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        customerCharge: settlement.customer.total,
        providerCost: settlement.provider.total,
        statusCode: 200,
        breakdown: buildSettlementBreakdown({
          customerCharge: settlement.customer.total,
          providerCost: settlement.provider.total,
          profit: settlement.actualProfit,
          customerBreakdown: {
            currency: settlement.customer.currency,
            components: settlement.customer.components,
            metrics: settlement.customer.metrics,
          },
          providerBreakdown: {
            currency: settlement.provider.currency,
            components: settlement.provider.components,
            metrics: settlement.provider.metrics,
          },
        }),
      });
    } catch (error) {
      const alreadySucceeded = await deleteQueueMessageIfRequestAlreadySucceeded({
        queueName: "inference_jobs",
        messageId: row.msg_id,
        requestId: message.requestId,
      });
      if (alreadySucceeded) {
        return true;
      }
      const reason =
        error instanceof AssetIntegrityError
          ? `asset_integrity_failed(index=${error.assetIndex}, reason=${error.reasonCode})`
          : error instanceof Error
            ? error.message
            : "result_persist_failed";
      await failRequestAndDeleteQueueMessage({
        queueName: "inference_jobs",
        messageId: row.msg_id,
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        errorCode: "upstream_result_missing",
        errorMessage: reason,
        startedAt: new Date(attemptStartedAt),
        capability: message.capability,
        providerSlug: message.providerSlug,
        upstreamModelSlug: message.upstreamModelSlug,
      });
      return true;
    }
  } else {
    const settlement = await resolveSettlementAmounts({
      providerModelId: message.providerModelId,
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
      providerReportedAmount: result.estimatedCost,
    });
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        estimated_cost: settlement.customer.total,
        estimated_customer_charge: settlement.customer.total,
        estimated_provider_cost: settlement.provider.total,
        estimated_profit: settlement.estimatedProfit,
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "processing",
        upstream_request_id: result.upstreamRequestId,
        upstream_task_id: result.upstreamTaskId,
        response_payload:
          result.mode === "async" && result.raw && typeof result.raw === "object" && !Array.isArray(result.raw)
            ? result.raw
            : undefined,
        latency_ms: Date.now() - attemptStartedAt,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await sendQueueMessage({
      queueName: "inference_polling",
      delaySeconds: result.pollAfterSeconds,
      message: {
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        providerModelId: message.providerModelId,
        credentialId: message.credentialId,
        providerSlug: message.providerSlug,
        providerBaseUrl: message.providerBaseUrl,
        providerConfig: message.providerConfig,
        capability: message.capability,
        publicModelSlug: message.publicModelSlug,
        upstreamModelSlug: message.upstreamModelSlug,
        endpoint: message.endpoint,
        input: message.input,
        upstreamTaskId: result.upstreamTaskId,
      },
    });
  }

  await deleteQueueMessage({
    queueName: "inference_jobs",
    messageId: row.msg_id,
  });

  return true;
}

export async function processNextPollingJob() {
  const { data, error } = await supabaseAdmin.rpc("queue_read", {
    queue_name: "inference_polling",
    vt: 30,
    qty: 1,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = normalizeQueueRows(data)[0] ?? null;
  if (!row) {
    return false;
  }

  const message = row.message as PollingMessage;
  const adapter = getProviderAdapter(await resolveProviderAdapterSlug(message.providerSlug));
  const { data: requestRow, error: requestRowError } = await supabaseAdmin
    .from("inference_requests")
    .select("workspace_id, api_key_id, provider_model_id, capability, public_model_slug, endpoint, status")
    .eq("id", message.requestId)
    .maybeSingle();

  if (requestRowError) {
    throw new Error(requestRowError.message);
  }

  if (!requestRow || !queueMessageMatchesRequest(message, requestRow)) {
    await deleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
    });

    return true;
  }

  if (
    requestRow?.status === "succeeded" ||
    requestRow?.status === "failed" ||
    requestRow?.status === "cancelled"
  ) {
    await deleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
    });

    return true;
  }

  const { data: credentialRow, error: credentialError } = await supabaseAdmin
    .from("provider_credentials")
    .select("secret_ciphertext, secret_iv, secret_auth_tag")
    .eq("id", message.credentialId)
    .maybeSingle();

  if (credentialError) {
    throw new Error(credentialError.message);
  }

  if (!credentialRow?.secret_ciphertext || !credentialRow.secret_iv || !credentialRow.secret_auth_tag) {
    await failRequestAndDeleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_credential_unavailable",
      errorMessage: "Provider credential secret is missing or not managed internally",
      capability: message.capability,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
    });

    return true;
  }

  let providerSecret: string;
  try {
    providerSecret = decryptProviderSecret({
      ciphertext: credentialRow.secret_ciphertext,
      iv: credentialRow.secret_iv,
      authTag: credentialRow.secret_auth_tag,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown provider credential decrypt error";
    await failRequestAndDeleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_credential_decrypt_failed",
      errorMessage,
      capability: message.capability,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
    });
    return true;
  }

  if (!adapter.poll) {
    await deleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
    });
    return true;
  }

  let result;
  try {
    result = await adapter.poll({
      requestId: message.requestId,
      upstreamTaskId: message.upstreamTaskId,
      capability: message.capability,
      input: message.input,
      provider: {
        slug: message.providerSlug,
        baseUrl: message.providerBaseUrl,
        config: message.providerConfig,
        secret: providerSecret,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown provider poll error";
    const completedAt = new Date();

    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: "provider_poll_failed",
        error_message: errorMessage,
        completed_at: completedAt.toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    try {
      await recordRequestSettlement({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        customerCharge: 0,
        providerCost: 0,
        statusCode: 500,
        breakdown: buildSettlementBreakdown({
          customerCharge: 0,
          providerCost: 0,
          profit: 0,
        }),
      });
    } catch {
      // Never block failure alerting on settlement write errors.
    }

    await sendFeishuFailureAlert({
      phase: "poll",
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      capability: message.capability,
      publicModelSlug: message.publicModelSlug,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_poll_failed",
      errorMessage,
      occurredAt: completedAt,
    });

    await deleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
    });

    return true;
  }

  if (!result.done) {
    await supabaseAdmin
      .from("inference_requests")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "processing",
        response_payload: result.raw,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    // Send the next poll before deleting the current message. If the send fails,
    // the current message stays available after its visibility timeout instead
    // of leaving the request permanently stuck in "processing".
    await sendQueueMessage({
      queueName: "inference_polling",
      message,
      delaySeconds: result.pollAfterSeconds,
    });

    await deleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
    });

    return true;
  }

  if (result.success) {
    try {
      const normalizedPollingResult = withNormalizedOutput({
        capability: message.capability,
        requestInput: message.input,
        output: result.output,
        providerRaw: result.raw,
      });
      const normalizedOutput = normalizeOutputPayloadByCapability({
        capability: message.capability,
        outputPayload: normalizedPollingResult.output ?? result.output,
      }) as Record<string, unknown>;
      const normalizedProviderRaw = normalizedPollingResult.providerRaw ?? result.raw;
      const persistedOutput = await persistGeneratedAssets({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        output: normalizedOutput,
      });
      const settlement = await resolveSettlementAmounts({
        providerModelId: message.providerModelId,
        publicModelSlug: message.publicModelSlug,
        requestInput: message.input,
        output: persistedOutput,
        providerRaw: normalizedProviderRaw,
        providerReportedAmount: result.actualCost,
      });
      await supabaseAdmin
        .from("inference_requests")
        .update({
          status: "succeeded",
          output_payload: persistedOutput,
          actual_cost: settlement.customer.total,
          actual_customer_charge: settlement.customer.total,
          actual_provider_cost: settlement.provider.total,
          actual_profit: settlement.actualProfit,
          completed_at: new Date().toISOString(),
        })
        .eq("id", message.requestId);

      await supabaseAdmin
        .from("provider_attempts")
        .update({
          status: "succeeded",
          response_payload: normalizedProviderRaw,
        })
        .eq("request_id", message.requestId)
        .eq("attempt_no", 1);

      await recordRequestSettlement({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        customerCharge: settlement.customer.total,
        providerCost: settlement.provider.total,
        statusCode: 200,
        breakdown: buildSettlementBreakdown({
          customerCharge: settlement.customer.total,
          providerCost: settlement.provider.total,
          profit: settlement.actualProfit,
          customerBreakdown: {
            currency: settlement.customer.currency,
            components: settlement.customer.components,
            metrics: settlement.customer.metrics,
          },
          providerBreakdown: {
            currency: settlement.provider.currency,
            components: settlement.provider.components,
            metrics: settlement.provider.metrics,
          },
        }),
      });
    } catch (error) {
      const alreadySucceeded = await deleteQueueMessageIfRequestAlreadySucceeded({
        queueName: "inference_polling",
        messageId: row.msg_id,
        requestId: message.requestId,
      });
      if (alreadySucceeded) {
        return true;
      }
      const reason =
        error instanceof AssetIntegrityError
          ? `asset_integrity_failed(index=${error.assetIndex}, reason=${error.reasonCode})`
          : error instanceof Error
            ? error.message
            : "result_persist_failed";
      await failRequestAndDeleteQueueMessage({
        queueName: "inference_polling",
        messageId: row.msg_id,
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        errorCode: "upstream_result_missing",
        errorMessage: reason,
        capability: message.capability,
        providerSlug: message.providerSlug,
        upstreamModelSlug: message.upstreamModelSlug,
      });
      return true;
    }
  } else {
    const completedAt = new Date();
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: result.errorCode,
        error_message: result.errorMessage,
        actual_cost: 0,
        actual_customer_charge: 0,
        actual_provider_cost: 0,
        actual_profit: 0,
        completed_at: completedAt.toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "failed",
        response_payload: result.raw,
        error_message: result.errorMessage,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    try {
      await recordRequestSettlement({
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        publicModelSlug: message.publicModelSlug,
        endpoint: message.endpoint,
        customerCharge: 0,
        providerCost: 0,
        statusCode: 500,
        breakdown: buildSettlementBreakdown({
          customerCharge: 0,
          providerCost: 0,
          profit: 0,
        }),
      });
    } catch {
      // Never block failure alerting on settlement write errors.
    }

    await sendFeishuFailureAlert({
      phase: "poll",
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      capability: message.capability,
      publicModelSlug: message.publicModelSlug,
      providerSlug: message.providerSlug,
      upstreamModelSlug: message.upstreamModelSlug,
      endpoint: message.endpoint,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      occurredAt: completedAt,
    });
  }

  await deleteQueueMessage({
    queueName: "inference_polling",
    messageId: row.msg_id,
  });

  return true;
}

type RecoveryAttemptRow = {
  request_id: string;
  upstream_task_id: string | null;
  status: string;
  updated_at: string;
  inference_requests: {
    id: string;
    status: string;
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
    public_model_slug: string;
    provider_id: string;
    provider_model_id: string;
    endpoint: string;
    workspace_id: string;
    api_key_id: string | null;
    input_payload: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  } | null;
};

type RecoveryProviderModelRow = {
  id: string;
  provider_id: string;
  upstream_model_slug: string;
  execution_config: Record<string, unknown> | null;
};

type RecoveryProviderRow = {
  id: string;
  slug: string;
  base_url: string | null;
  config: Record<string, unknown> | null;
};

type RecoveryCredentialRow = {
  id: string;
  provider_id: string;
};

async function markProcessingRequestTimeout(input: {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  publicModelSlug: string;
  endpoint: string;
}) {
  const completedAt = new Date();
  await supabaseAdmin
    .from("inference_requests")
    .update({
      status: "failed",
      error_code: "upstream_timeout",
      error_message: "Upstream task timed out during polling.",
      actual_cost: 0,
      actual_customer_charge: 0,
      actual_provider_cost: 0,
      actual_profit: 0,
      completed_at: completedAt.toISOString(),
    })
    .eq("id", input.requestId)
    .eq("status", "processing");

  await supabaseAdmin
    .from("provider_attempts")
    .update({
      status: "failed",
      error_message: "Marked failed by timeout watchdog after prolonged polling.",
    })
    .eq("request_id", input.requestId)
    .eq("attempt_no", 1)
    .eq("status", "processing");

  try {
    await recordRequestSettlement({
      requestId: input.requestId,
      workspaceId: input.workspaceId,
      apiKeyId: input.apiKeyId,
      publicModelSlug: input.publicModelSlug,
      endpoint: input.endpoint,
      customerCharge: 0,
      providerCost: 0,
      statusCode: 504,
      breakdown: buildSettlementBreakdown({
        customerCharge: 0,
        providerCost: 0,
        profit: 0,
      }),
    });
  } catch {
    // Never block timeout alerting on settlement write errors.
  }

  await sendFeishuFailureAlert({
    phase: "timeout",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    apiKeyId: input.apiKeyId,
    capability: "unknown",
    publicModelSlug: input.publicModelSlug,
    providerSlug: "unknown-provider",
    upstreamModelSlug: "unknown-upstream-model",
    endpoint: input.endpoint,
    errorCode: "upstream_timeout",
    errorMessage: "Upstream task timed out during polling.",
    occurredAt: completedAt,
  });
}

async function markQueuedRequestTimeout(input: {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  publicModelSlug: string;
  endpoint: string;
  capability: string;
}) {
  const completedAt = new Date();
  const { data: updatedRequest, error: updateError } = await supabaseAdmin
    .from("inference_requests")
    .update({
      status: "failed",
      error_code: "service_unavailable",
      error_message: "Queued request timed out before worker processing.",
      actual_cost: 0,
      actual_customer_charge: 0,
      actual_provider_cost: 0,
      actual_profit: 0,
      completed_at: completedAt.toISOString(),
    })
    .eq("id", input.requestId)
    .eq("status", "queued")
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(updateError.message);
  }
  if (!updatedRequest) {
    return false;
  }

  try {
    await recordRequestSettlement({
      requestId: input.requestId,
      workspaceId: input.workspaceId,
      apiKeyId: input.apiKeyId,
      publicModelSlug: input.publicModelSlug,
      endpoint: input.endpoint,
      customerCharge: 0,
      providerCost: 0,
      statusCode: 503,
      breakdown: buildSettlementBreakdown({
        customerCharge: 0,
        providerCost: 0,
        profit: 0,
      }),
    });
  } catch {
    // Never block timeout alerting on settlement write errors.
  }

  await sendFeishuFailureAlert({
    phase: "timeout",
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    apiKeyId: input.apiKeyId,
    capability: input.capability,
    publicModelSlug: input.publicModelSlug,
    providerSlug: "unknown-provider",
    upstreamModelSlug: "unknown-upstream-model",
    endpoint: input.endpoint,
    errorCode: "service_unavailable",
    errorMessage: "Queued request timed out before worker processing.",
    occurredAt: completedAt,
  });

  return true;
}

export async function recoverStuckQueuedRequests() {
  const timeoutBefore = new Date(Date.now() - QUEUED_TIMEOUT_SECONDS * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("inference_requests")
    .select("id, workspace_id, api_key_id, capability, public_model_slug, endpoint, created_at")
    .eq("status", "queued")
    .lt("created_at", timeoutBefore)
    .order("created_at", { ascending: true })
    .limit(QUEUED_TIMEOUT_BATCH_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    workspace_id: string;
    api_key_id: string | null;
    capability: string;
    public_model_slug: string;
    endpoint: string;
    created_at: string;
  }>;

  let recoveredCount = 0;

  for (const row of rows) {
    const recovered = await markQueuedRequestTimeout({
      requestId: row.id,
      workspaceId: row.workspace_id,
      apiKeyId: row.api_key_id,
      capability: row.capability,
      publicModelSlug: row.public_model_slug,
      endpoint: row.endpoint,
    });
    if (recovered) {
      recoveredCount += 1;
    }
  }

  return recoveredCount;
}

export async function recoverStuckPollingRequests() {
  const staleBefore = new Date(Date.now() - POLLING_RECOVERY_STALE_SECONDS * 1000).toISOString();
  const timeoutBefore = new Date(Date.now() - POLLING_TIMEOUT_SECONDS * 1000).toISOString();

  const { data: attemptsData, error: attemptsError } = await supabaseAdmin
    .from("provider_attempts")
    .select(
      "request_id, upstream_task_id, status, updated_at, inference_requests(id, status, capability, public_model_slug, provider_id, provider_model_id, endpoint, workspace_id, api_key_id, input_payload, created_at, updated_at)"
    )
    .eq("attempt_no", 1)
    .eq("status", "processing")
    .lt("updated_at", staleBefore)
    .order("updated_at", { ascending: true })
    .limit(POLLING_RECOVERY_BATCH_SIZE);

  if (attemptsError) {
    throw new Error(attemptsError.message);
  }

  const candidates = ((attemptsData ?? []) as unknown as RecoveryAttemptRow[]).filter(
    (row) =>
      row.inference_requests?.status === "processing" &&
      typeof row.upstream_task_id === "string" &&
      row.upstream_task_id.length > 0
  );

  if (candidates.length === 0) {
    return 0;
  }

  const requestRows = candidates
    .map((row) => row.inference_requests)
    .filter((row): row is NonNullable<RecoveryAttemptRow["inference_requests"]> => row !== null);
  const requestById = new Map(requestRows.map((row) => [row.id, row]));
  const providerModelIds = Array.from(new Set(requestRows.map((row) => row.provider_model_id)));
  const providerIds = Array.from(new Set(requestRows.map((row) => row.provider_id)));

  const [{ data: providerModels, error: providerModelsError }, { data: providers, error: providersError }, { data: credentials, error: credentialsError }] =
    await Promise.all([
      supabaseAdmin
        .from("provider_models")
        .select("id, provider_id, upstream_model_slug, execution_config")
        .in("id", providerModelIds),
      supabaseAdmin
        .from("providers")
        .select("id, slug, base_url, config")
        .in("id", providerIds),
      supabaseAdmin
        .from("provider_credentials")
        .select("id, provider_id")
        .in("provider_id", providerIds)
        .eq("is_active", true)
        .order("updated_at", { ascending: false }),
    ]);

  if (providerModelsError) {
    throw new Error(providerModelsError.message);
  }
  if (providersError) {
    throw new Error(providersError.message);
  }
  if (credentialsError) {
    throw new Error(credentialsError.message);
  }

  const providerModelById = new Map(
    ((providerModels ?? []) as RecoveryProviderModelRow[]).map((row) => [row.id, row])
  );
  const providerById = new Map(((providers ?? []) as RecoveryProviderRow[]).map((row) => [row.id, row]));
  const credentialByProviderId = new Map<string, RecoveryCredentialRow>();

  for (const row of (credentials ?? []) as RecoveryCredentialRow[]) {
    if (!credentialByProviderId.has(row.provider_id)) {
      credentialByProviderId.set(row.provider_id, row);
    }
  }

  let recoveredCount = 0;

  for (const attempt of candidates) {
    const requestRow = requestById.get(attempt.request_id);
    if (!requestRow) {
      continue;
    }

    const createdAtMs = Date.parse(requestRow.created_at);
    const timeoutBeforeMs = Date.parse(timeoutBefore);
    if (Number.isFinite(createdAtMs) && createdAtMs < timeoutBeforeMs) {
      await markProcessingRequestTimeout({
        requestId: requestRow.id,
        workspaceId: requestRow.workspace_id,
        apiKeyId: requestRow.api_key_id,
        publicModelSlug: requestRow.public_model_slug,
        endpoint: requestRow.endpoint,
      });
      recoveredCount += 1;
      continue;
    }

    const providerModel = providerModelById.get(requestRow.provider_model_id);
    const provider = providerById.get(requestRow.provider_id);
    const credential = credentialByProviderId.get(requestRow.provider_id);

    if (!providerModel || !provider || !credential || !attempt.upstream_task_id) {
      continue;
    }

    await sendQueueMessage({
      queueName: "inference_polling",
      message: {
        requestId: requestRow.id,
        workspaceId: requestRow.workspace_id,
        apiKeyId: requestRow.api_key_id,
        providerModelId: requestRow.provider_model_id,
        credentialId: credential.id,
        providerSlug: provider.slug,
        providerBaseUrl: provider.base_url,
        providerConfig: {
          ...(provider.config ?? {}),
          executionConfig: {
            ...(providerModel.execution_config ?? {}),
          },
        },
        capability: requestRow.capability,
        publicModelSlug: requestRow.public_model_slug,
        upstreamModelSlug: providerModel.upstream_model_slug,
        endpoint: requestRow.endpoint,
        input: requestRow.input_payload ?? {},
        upstreamTaskId: attempt.upstream_task_id,
      },
    });

    await supabaseAdmin
      .from("inference_requests")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestRow.id)
      .eq("status", "processing");

    recoveredCount += 1;
  }

  return recoveredCount;
}
