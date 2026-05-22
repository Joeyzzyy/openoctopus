import { getJson, postJson } from "../lib/http.js";
import type {
  PollRequestInput,
  PollRequestResult,
  ProviderAdapter,
  SubmitRequestInput,
  SubmitRequestResult,
} from "./types.js";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveText(input: SubmitRequestInput) {
  const rawText = readString(input.input.text) || readString(input.prompt);
  return rawText || "";
}

function resolveFileUrl(input: SubmitRequestInput) {
  return (
    readString(input.input.document) ||
    readString(input.input.file) ||
    readString(input.input.file_url) ||
    readString(input.input.fileUrl) ||
    readString(input.input.document_url) ||
    readString(input.input.documentUrl)
  );
}

function resolveWebsiteUrl(input: SubmitRequestInput) {
  return readString(input.input.website) || readString(input.input.website_url) || readString(input.input.websiteUrl);
}

function buildAuthHeaders(secret: string) {
  return {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
    "user-agent": "OpenOctopus Gateway",
  };
}

function buildSubmitPath(config: Record<string, unknown>) {
  return readString(config.submitPath, "/v2/ai-content-detection");
}

function buildPollPath(config: Record<string, unknown>, taskId: string) {
  const configured = readString(config.pollPath, "/v2/ai-content-detection/{taskId}");
  return configured.replace("{taskId}", encodeURIComponent(taskId));
}

function normalizeSuccessfulOutput(data: Record<string, unknown>) {
  const score: Record<string, unknown> = {};
  const humanScore = readNumber(data.score);
  if (humanScore !== null) {
    score.human_score = humanScore;
    score.score = humanScore;
  }
  const readabilityScore = readNumber(data.readability_score);
  if (readabilityScore !== null) score.readability_score = readabilityScore;
  const creditsUsed = readNumber(data.credits_used);
  if (creditsUsed !== null) score.credits_used = creditsUsed;
  const creditsRemaining = readNumber(data.credits_remaining);
  if (creditsRemaining !== null) score.credits_remaining = creditsRemaining;
  const version = readString(data.version);
  if (version) score.version = version;
  const language = readString(data.language);
  if (language) score.language = language;
  const inputType = readString(data.input);
  if (inputType) score.input = inputType;
  const attackDetected = asRecord(data.attack_detected);
  if (attackDetected) score.attack_detected = attackDetected;
  if (Array.isArray(data.sentences)) score.sentences = data.sentences;

  return {
    status: "COMPLETED",
    ...(Object.keys(score).length > 0 ? { score } : {}),
    raw: data,
  };
}

export class WinstonAiDetectionAdapter implements ProviderAdapter {
  slug = "winston-ai-detection-v1";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    if (!input.provider.baseUrl) {
      throw new Error("Provider base URL is missing.");
    }

    const executionConfig = asRecord(input.provider.config?.executionConfig) ?? {};
    const submitUrl = new URL(buildSubmitPath(executionConfig), input.provider.baseUrl).toString();
    const authHeaders = buildAuthHeaders(input.provider.secret);
    const text = resolveText(input);
    const fileUrl = resolveFileUrl(input);
    const websiteUrl = resolveWebsiteUrl(input);

    const body: Record<string, unknown> = {
      version: readString(input.input.version, readString(executionConfig.defaultVersion, "4.14")),
      sentences: readBoolean(
        input.input.sentences,
        readBoolean(executionConfig.defaultSentences, true)
      ),
      language: readString(input.input.language, readString(executionConfig.defaultLanguage, "auto")),
    };

    if (websiteUrl) {
      body.website = websiteUrl;
    } else if (fileUrl) {
      body.file = fileUrl;
    } else {
      body.text = text;
    }

    const response = await postJson<Record<string, unknown>>(submitUrl, {
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      body,
    });

    return {
      mode: "sync",
      upstreamRequestId:
        readString(response.data.id) ||
        readString(response.data.request_id) ||
        readString(response.data.scan_id) ||
        input.requestId,
      output: normalizeSuccessfulOutput(response.data),
      estimatedCost: 0,
    };
  }

  async poll(input: PollRequestInput): Promise<PollRequestResult> {
    if (!input.provider.baseUrl) {
      throw new Error("Provider base URL is missing.");
    }

    const executionConfig = asRecord(input.provider.config?.executionConfig) ?? {};
    const pollUrl = new URL(
      buildPollPath(executionConfig, input.upstreamTaskId),
      input.provider.baseUrl
    ).toString();
    const authHeaders = buildAuthHeaders(input.provider.secret);
    const response = await getJson<Record<string, unknown>>(pollUrl, {
      headers: authHeaders,
    });
    const status = readString(response.data.status).toUpperCase();

    if (!status || status === "PENDING" || status === "PROCESSING") {
      return {
        done: false,
        pollAfterSeconds: 5,
        raw: response.data,
      };
    }

    if (status === "FAILED" || status === "ERROR") {
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage:
          readString(response.data.message) ||
          readString(response.data.error) ||
          readString(asRecord(response.data.error)?.message) ||
          "AI detection request failed upstream.",
        raw: response.data,
      };
    }

    return {
      done: true,
      success: true,
      output: normalizeSuccessfulOutput(response.data),
      actualCost: 0,
      raw: response.data,
    };
  }
}
