import { basename } from "node:path";
import { getBuffer, getJson, postJson, putBuffer } from "../lib/http.js";
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

function inferFilename(input: SubmitRequestInput) {
  const explicit =
    readString(input.input.filename) ||
    readString(input.input.file_name) ||
    readString(input.input.fileName);
  if (explicit) {
    return explicit;
  }

  const rawFileUrl =
    readString(input.input.file_url) ||
    readString(input.input.fileUrl) ||
    readString(input.input.document_url) ||
    readString(input.input.documentUrl);
  if (!rawFileUrl) {
    return "document.txt";
  }

  try {
    const parsed = new URL(rawFileUrl);
    const name = basename(parsed.pathname);
    return name || "document.txt";
  } catch {
    return "document.txt";
  }
}

function resolveFileUrl(input: SubmitRequestInput) {
  return (
    readString(input.input.document) ||
    readString(input.input.file_url) ||
    readString(input.input.fileUrl) ||
    readString(input.input.document_url) ||
    readString(input.input.documentUrl)
  );
}

function buildAuthHeaders(secret: string) {
  return {
    Authorization: `Bearer ${secret}`,
    Accept: "application/json",
    "user-agent": "OpenOctopus Gateway",
  };
}

function buildCreatePath(config: Record<string, unknown>) {
  return readString(config.submitPath, "/ecosystem/api/v1/ai-detection");
}

function buildPollPath(config: Record<string, unknown>, taskId: string) {
  const configured = readString(
    config.pollPath,
    "/ecosystem/api/v1/ai-detection/{taskId}"
  );
  return configured.replace("{taskId}", encodeURIComponent(taskId));
}

function extractFailureReason(data: Record<string, unknown>) {
  const candidates = [
    readString(data.error_reason),
    readString(data.reason),
    readString(data.error_message),
    readString(asRecord(data.error)?.message),
  ].filter(Boolean);
  return candidates[0] ?? "AI detection request failed upstream.";
}

export class GrammarlyAiDetectionAdapter implements ProviderAdapter {
  slug = "grammarly-ai-detection-v1";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const fileUrl = resolveFileUrl(input);
    if (!fileUrl) {
      throw new Error("input.file_url is required for document analysis.");
    }
    if (!input.provider.baseUrl) {
      throw new Error("Provider base URL is missing.");
    }

    const executionConfig = asRecord(input.provider.config?.executionConfig) ?? {};
    const authHeaders = buildAuthHeaders(input.provider.secret);

    const download = await getBuffer(fileUrl);
    const contentType = readString(download.headers["content-type"], "application/octet-stream");
    const filename = inferFilename(input);
    const createUrl = new URL(buildCreatePath(executionConfig), input.provider.baseUrl).toString();

    const createResponse = await postJson<Record<string, unknown>>(createUrl, {
      headers: {
        ...authHeaders,
        "content-type": "application/json",
      },
      body: {
        filename,
      },
    });

    const scoreRequestId = readString(createResponse.data.score_request_id);
    const fileUploadUrl = readString(createResponse.data.file_upload_url);
    if (!scoreRequestId || !fileUploadUrl) {
      throw new Error("Upstream Grammarly transaction response is missing score_request_id or file_upload_url.");
    }

    await putBuffer(fileUploadUrl, {
      headers: {
        "content-type": contentType,
      },
      body: download.data,
    });

    return {
      mode: "async",
      upstreamRequestId: scoreRequestId,
      upstreamTaskId: scoreRequestId,
      pollAfterSeconds: 5,
      estimatedCost: 0,
      raw: {
        create_transaction: createResponse.data,
        uploaded_filename: filename,
      },
    };
  }

  async poll(input: PollRequestInput): Promise<PollRequestResult> {
    if (!input.provider.baseUrl) {
      throw new Error("Provider base URL is missing.");
    }

    const executionConfig = asRecord(input.provider.config?.executionConfig) ?? {};
    const authHeaders = buildAuthHeaders(input.provider.secret);
    const pollUrl = new URL(
      buildPollPath(executionConfig, input.upstreamTaskId),
      input.provider.baseUrl
    ).toString();

    const response = await getJson<Record<string, unknown>>(pollUrl, {
      headers: authHeaders,
    });

    const status = readString(response.data.status).toUpperCase();
    if (!status || status === "PENDING") {
      return {
        done: false,
        pollAfterSeconds: 5,
        raw: response.data,
      };
    }

    if (status === "FAILED") {
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage: extractFailureReason(response.data),
        raw: response.data,
      };
    }

    return {
      done: true,
      success: true,
      output: {
        status,
        score_request_id: readString(response.data.score_request_id, input.upstreamTaskId),
        score: asRecord(response.data.score),
        raw: response.data,
      },
      actualCost: 0,
      raw: response.data,
    };
  }
}
