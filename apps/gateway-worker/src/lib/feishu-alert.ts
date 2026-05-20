import { supabaseAdmin } from "./supabase.js";

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

export async function sendFeishuFailureAlert(input: {
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

    const json = (await response.json().catch(() => null)) as { code?: number; msg?: string } | null;
    const feishuCode = typeof json?.code === "number" ? json.code : null;
    if (!response.ok || (feishuCode !== null && feishuCode !== 0)) {
      console.error("[gateway-worker] Failed to send Feishu alert", {
        httpStatus: response.status,
        feishuCode,
        responseBody: json,
      });
    }
  } catch (error) {
    console.error("[gateway-worker] Failed to send Feishu alert", error);
  }
}
