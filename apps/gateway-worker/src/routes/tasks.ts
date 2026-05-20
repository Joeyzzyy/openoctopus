import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  buildGatewayErrorResponse,
  resolveGatewayErrorDefinition,
  sendGatewayError,
} from "../lib/gateway-errors.js";
import { postJson, postStream } from "../lib/http.js";
import { sendFeishuFailureAlert } from "../lib/feishu-alert.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { normalizeOutputPayloadByCapability } from "../lib/image-output-contract.js";
import { decryptProviderSecret } from "../lib/provider-secret-crypto.js";

function redactOutputPayloadRaw(outputPayload: unknown) {
  if (!outputPayload || typeof outputPayload !== "object" || Array.isArray(outputPayload)) {
    return outputPayload;
  }
  const record = outputPayload as Record<string, unknown>;
  if (!("raw" in record)) {
    return outputPayload;
  }
  const redacted = { ...record };
  delete redacted.raw;
  return redacted;
}

function redactOutputAssetSourceUrl(outputPayload: unknown) {
  if (!outputPayload || typeof outputPayload !== "object" || Array.isArray(outputPayload)) {
    return outputPayload;
  }
  const record = outputPayload as Record<string, unknown>;
  const assets = Array.isArray(record.assets) ? record.assets : null;
  if (!assets) {
    return outputPayload;
  }

  const nextAssets = assets.map((asset) => {
    if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
      return asset;
    }
    const assetRecord = asset as Record<string, unknown>;
    if (!("sourceUrl" in assetRecord)) {
      return asset;
    }
    const rest = { ...assetRecord };
    delete rest.sourceUrl;
    return rest;
  });

  return {
    ...record,
    assets: nextAssets,
  };
}
import { enqueueInferenceJob } from "../queue/runner.js";
import {
  authenticateApiKey,
  createQueuedRequest,
  recordInferenceRequest,
  RequestValidationError,
  resolveProviderSecret,
  resolveRequestRuntime,
  touchApiKeyLastUsed,
} from "../services/request-service.js";
import {
  recordRequestSettlement,
  resolveSettlementAmounts,
} from "../services/billing-service.js";

function isHttpUrl(candidate: string) {
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateReferenceUrlFields(
  input: Record<string, unknown>,
  context: z.RefinementCtx
) {
  const validateReferenceUrlField = (fieldName: string) => {
    const raw = input[fieldName];
    if (raw === undefined || raw === null || raw === "") return;

    const items = Array.isArray(raw) ? raw : [raw];
    if (items.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["input", fieldName],
        message: `${fieldName} must contain at least one accessible HTTP(S) asset URL`,
      });
      return;
    }

    const invalid = items.some((item) => typeof item !== "string" || !isHttpUrl(item.trim()));
    if (invalid) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["input", fieldName],
        message: `${fieldName} must be a usable HTTP(S) asset URL or an array of usable HTTP(S) asset URLs`,
      });
    }
  };

  for (const fieldName of [
    "reference_image",
    "reference_images",
    "reference_video",
    "reference_videos",
    "reference_audio",
    "reference_audios",
  ]) {
    validateReferenceUrlField(fieldName);
  }
}

export const imageRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, context) => {
  validateReferenceUrlFields(value.input, context);
});

export const imageEditRequestSchema = imageRequestSchema.superRefine((value, context) => {
  if (!value.prompt?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["prompt"],
      message: "prompt is required",
    });
  }

  const images = value.input.images;
  if (
    !Array.isArray(images) ||
    images.length === 0 ||
    images.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["input", "images"],
      message: "input.images must be a non-empty array of image URLs",
    });
  }
});

export const videoRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
  duration: z.union([z.number(), z.string()]).optional(),
  duration_seconds: z.union([z.number(), z.string()]).optional(),
  durationSeconds: z.union([z.number(), z.string()]).optional(),
  aspect_ratio: z.string().optional(),
  resolution: z.string().optional(),
}).superRefine((value, context) => {
  validateReferenceUrlFields(value.input, context);
});

const chatMessageSchema = z.object({
  role: z.string().min(1),
  content: z.union([z.string(), z.array(z.unknown())]),
  name: z.string().optional(),
});

function normalizeOpenAiCompatibleMessages(messages: unknown) {
  if (!Array.isArray(messages)) {
    return messages;
  }

  return messages.map((message) => {
    if (!message || typeof message !== "object" || Array.isArray(message)) {
      return message;
    }

    const record = { ...(message as Record<string, unknown>) };

    if (record.tool_call_id === undefined && typeof record.toolCallId === "string") {
      record.tool_call_id = record.toolCallId;
    }

    if (record.tool_calls === undefined && Array.isArray(record.toolCalls)) {
      record.tool_calls = record.toolCalls;
    }

    if (record.function_call === undefined && record.functionCall && typeof record.functionCall === "object") {
      record.function_call = record.functionCall;
    }

    return record;
  });
}

const INTEGER_INPUT_PARAM_KEYS = new Set([
  "max_tokens",
  "max_output_tokens",
  "seed",
  "n",
  "num_images",
  "top_k",
]);

const NUMBER_INPUT_PARAM_KEYS = new Set([
  "temperature",
  "top_p",
  "presence_penalty",
  "frequency_penalty",
]);

function sanitizeInputValue(key: string | null, value: unknown): unknown {
  if (value === null || value === undefined) return undefined;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    if (key && INTEGER_INPUT_PARAM_KEYS.has(key) && /^-?\d+$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    if (key && NUMBER_INPUT_PARAM_KEYS.has(key) && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeInputValue(null, item)).filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizeInputValue(entryKey, entryValue);
      if (sanitized !== undefined) {
        next[entryKey] = sanitized;
      }
    }
    return next;
  }

  return value;
}

function sanitizeInputRecord(input: Record<string, unknown>) {
  return (sanitizeInputValue(null, input) as Record<string, unknown>) ?? {};
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function fillTemplate(input: string, values: Record<string, string>) {
  return input.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => values[key] ?? "");
}

function buildAuthHeaders(config: Record<string, unknown>, secret: string) {
  const authType = readString(config.authType || "bearer");
  if (authType === "query") {
    return {
      headers: {} as Record<string, string>,
      applyQuery(url: URL) {
        url.searchParams.set(readString(config.authQueryParam) || "key", secret);
      },
    };
  }
  if (authType === "header") {
    return {
      headers: {
        [readString(config.authHeaderName) || "x-api-key"]: secret,
      },
      applyQuery() {},
    };
  }
  const headerName = readString(config.authHeaderName) || "Authorization";
  const headerPrefix = readString(config.authHeaderPrefix || "Bearer");
  return {
    headers: {
      [headerName]: headerPrefix ? `${headerPrefix} ${secret}` : secret,
    },
    applyQuery() {},
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
    customerCharge: input.customerCharge,
    providerCost: input.providerCost,
    estimatedProfit: input.profit,
    actualProfit: input.profit,
    ...(input.customerBreakdown ? { customerBreakdown: input.customerBreakdown } : {}),
    ...(input.providerBreakdown ? { providerBreakdown: input.providerBreakdown } : {}),
  };
}

export const codingChatRequestSchema = z
  .object({
    model: z.string().min(1),
    prompt: z.string().min(1).optional(),
    messages: z.preprocess(normalizeChatMessagesValue, z.array(chatMessageSchema).optional()),
    input: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const hasPrompt = Boolean(value.prompt?.trim());
    const normalizedInputMessages = normalizeChatMessagesValue(value.input?.messages);
    const hasMessages =
      (Array.isArray(value.messages) && value.messages.length > 0) ||
      (Array.isArray(normalizedInputMessages) && normalizedInputMessages.length > 0);
    if (!hasPrompt && !hasMessages) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["messages"],
        message: "prompt or messages is required",
      });
    }
  });

type OpenAiChatStreamSummary = {
  upstreamRequestId: string | null;
  model: string | null;
  text: string;
  reasoningText: string;
  usage: Record<string, unknown> | null;
  finishReason: string | null;
  lastEvent: Record<string, unknown> | null;
};

function createOpenAiChatStreamSummary(): OpenAiChatStreamSummary {
  return {
    upstreamRequestId: null,
    model: null,
    text: "",
    reasoningText: "",
    usage: null,
    finishReason: null,
    lastEvent: null,
  };
}

export function consumeOpenAiChatSseBuffer(
  buffer: string,
  summary: OpenAiChatStreamSummary
) {
  let remaining = buffer;

  while (true) {
    const boundaryIndex = remaining.indexOf("\n\n");
    if (boundaryIndex < 0) {
      break;
    }

    const rawEvent = remaining.slice(0, boundaryIndex);
    remaining = remaining.slice(boundaryIndex + 2);

    const payload = rawEvent
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");

    if (!payload || payload === "[DONE]") {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      summary.lastEvent = parsed;
      summary.upstreamRequestId ||= typeof parsed.id === "string" ? parsed.id : null;
      summary.model ||= typeof parsed.model === "string" ? parsed.model : null;
      if (asRecord(parsed.usage)) {
        summary.usage = asRecord(parsed.usage);
      }
      const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
      for (const choice of choices) {
        const record = asRecord(choice);
        const delta = asRecord(record?.delta);
        const content = delta?.content;
        const reasoningContent = delta?.reasoning_content;
        if (typeof content === "string") {
          summary.text += content;
        }
        if (typeof reasoningContent === "string") {
          summary.reasoningText += reasoningContent;
        }
        if (typeof record?.finish_reason === "string") {
          summary.finishReason = record.finish_reason;
        }
      }
    } catch {
      // Ignore malformed partial event payloads.
    }
  }

  return remaining;
}

function extractOpenAiResponseText(response: Record<string, unknown>) {
  const choices = Array.isArray(response.choices) ? response.choices : [];
  const firstChoice = asRecord(choices[0]);
  const message = asRecord(firstChoice?.message);
  return typeof message?.content === "string" ? message.content : "";
}

function normalizeChatMessagesValue(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return [{ role: "user", content: trimmed }];
      }
    }
    return [{ role: "user", content: trimmed }];
  }

  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      return value.map((item) => ({ role: "user", content: item }));
    }
    return value;
  }

  return value;
}

export const chatRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  messages: z.preprocess(normalizeChatMessagesValue, z.array(chatMessageSchema).optional()),
  input: z.record(z.string(), z.unknown()).default({}),
}).superRefine((value, context) => {
  const hasPrompt = Boolean(value.prompt?.trim());
  const normalizedInputMessages = normalizeChatMessagesValue(value.input.messages);
  const hasMessages =
    (Array.isArray(value.messages) && value.messages.length > 0) ||
    (Array.isArray(normalizedInputMessages) && normalizedInputMessages.length > 0);
  if (!hasPrompt && !hasMessages) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["messages"],
      message: "prompt or messages is required",
    });
  }
});

export async function registerTaskRoutes(app: FastifyInstance) {
  const sendRequestError = (reply: { code: (statusCode: number) => { send: (body: unknown) => unknown } }, error: unknown) => {
    if (error instanceof RequestValidationError) {
      return sendGatewayError(reply, {
        code: error.code,
        statusCode: error.statusCode,
      });
    }

    return sendGatewayError(reply, {
      code: "internal_error",
      statusCode: 500,
    });
  };

  app.get("/v1/models", async () => {
    const { data, error } = await supabaseAdmin
      .from("provider_models")
      .select(
        "id, public_model_slug, upstream_model_slug, capability, active, provider_id, providers(name, slug), supported_models(active)"
      )
      .eq("active", true)
      .order("public_model_slug", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const grouped = new Map<
      string,
      {
        id: string;
        model: string;
        capability: string;
        routes: Array<{ provider: string; providerSlug: string; upstreamModel: string }>;
      }
    >();

    for (const row of data ?? []) {
      const supportedModel = Array.isArray(row.supported_models)
        ? row.supported_models[0]
        : row.supported_models;
      if (!supportedModel?.active) {
        continue;
      }

      const key = row.public_model_slug;
      const provider = Array.isArray(row.providers) ? row.providers[0] : row.providers;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: row.id,
          model: row.public_model_slug,
          capability: row.capability,
          routes: [],
        });
      }

      grouped.get(key)?.routes.push({
        provider: provider?.name ?? "Unknown provider",
        providerSlug: provider?.slug ?? "unknown",
        upstreamModel: row.upstream_model_slug,
      });
    }

    return {
      data: Array.from(grouped.values()),
    };
  });

  app.post("/v1/images/generations", async (request, reply) => {
    const parsed = imageRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const sourceHeader =
      typeof request.headers["x-openoctopus-request-source"] === "string"
        ? request.headers["x-openoctopus-request-source"]
        : "";
    const requestSource = sourceHeader === "playground" ? "playground" : "api";

    try {
      const queued = await createQueuedRequest({
        apiKey,
        endpoint: "/v1/images/generations",
        capability: "image_generation",
        requestSource,
        model: parsed.model,
        prompt: parsed.prompt,
        input: parsed.input,
      });

      try {
        await enqueueInferenceJob({
          requestId: queued.requestId,
          workspaceId: queued.workspaceId,
          apiKeyId: queued.apiKeyId,
          providerModelId: queued.providerModelId,
          credentialId: queued.credentialId,
          providerSlug: queued.providerSlug,
          providerBaseUrl: queued.providerBaseUrl,
          providerConfig: queued.providerConfig,
          capability: "image_generation",
          publicModelSlug: parsed.model,
          upstreamModelSlug: queued.upstreamModelSlug,
          endpoint: queued.endpoint,
          prompt: parsed.prompt,
          input: parsed.input,
        });
      } catch {
        throw new RequestValidationError(
          "Failed to enqueue image generation job",
          503,
          "queue_unavailable"
        );
      }

      return reply.code(202).send({
        id: queued.requestId,
        status: "queued",
      });
    } catch (error) {
      return sendRequestError(reply, error);
    }
  });

  app.post("/v1/images/edits", async (request, reply) => {
    const parsed = imageEditRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const sourceHeader =
      typeof request.headers["x-openoctopus-request-source"] === "string"
        ? request.headers["x-openoctopus-request-source"]
        : "";
    const requestSource = sourceHeader === "playground" ? "playground" : "api";

    try {
      const queued = await createQueuedRequest({
        apiKey,
        endpoint: "/v1/images/edits",
        capability: "image_edit",
        requestSource,
        model: parsed.model,
        prompt: parsed.prompt,
        input: parsed.input,
      });

      try {
        await enqueueInferenceJob({
          requestId: queued.requestId,
          workspaceId: queued.workspaceId,
          apiKeyId: queued.apiKeyId,
          providerModelId: queued.providerModelId,
          credentialId: queued.credentialId,
          providerSlug: queued.providerSlug,
          providerBaseUrl: queued.providerBaseUrl,
          providerConfig: queued.providerConfig,
          capability: "image_edit",
          publicModelSlug: parsed.model,
          upstreamModelSlug: queued.upstreamModelSlug,
          endpoint: queued.endpoint,
          prompt: parsed.prompt,
          input: parsed.input,
        });
      } catch {
        throw new RequestValidationError(
          "Failed to enqueue image edit job",
          503,
          "queue_unavailable"
        );
      }

      return reply.code(202).send({
        id: queued.requestId,
        status: "queued",
      });
    } catch (error) {
      return sendRequestError(reply, error);
    }
  });

  app.post("/v1/images/recognitions", async (request, reply) => {
    const parsed = imageRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const sourceHeader =
      typeof request.headers["x-openoctopus-request-source"] === "string"
        ? request.headers["x-openoctopus-request-source"]
        : "";
    const requestSource = sourceHeader === "playground" ? "playground" : "api";

    try {
      const queued = await createQueuedRequest({
        apiKey,
        endpoint: "/v1/images/recognitions",
        capability: "image_recognition",
        requestSource,
        model: parsed.model,
        prompt: parsed.prompt,
        input: parsed.input,
      });

      await enqueueInferenceJob({
        requestId: queued.requestId,
        workspaceId: queued.workspaceId,
        apiKeyId: queued.apiKeyId,
        providerModelId: queued.providerModelId,
        credentialId: queued.credentialId,
        providerSlug: queued.providerSlug,
        providerBaseUrl: queued.providerBaseUrl,
        providerConfig: queued.providerConfig,
        capability: "image_recognition",
        publicModelSlug: parsed.model,
        upstreamModelSlug: queued.upstreamModelSlug,
        endpoint: queued.endpoint,
        prompt: parsed.prompt,
        input: parsed.input,
      });

      return reply.code(202).send({
        id: queued.requestId,
        status: "queued",
      });
    } catch (error) {
      return sendRequestError(reply, error);
    }
  });

  app.post("/v1/chat/completions", async (request, reply) => {
    const parsed = chatRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const sourceHeader =
      typeof request.headers["x-openoctopus-request-source"] === "string"
        ? request.headers["x-openoctopus-request-source"]
        : "";
    const requestSource = sourceHeader === "playground" ? "playground" : "api";
    const normalizedInput: Record<string, unknown> = sanitizeInputRecord(parsed.input);
    const normalizedMessages =
      parsed.messages ??
      (Array.isArray(normalizeChatMessagesValue(parsed.input.messages))
        ? (normalizeChatMessagesValue(parsed.input.messages) as Array<Record<string, unknown>>)
        : undefined);
    if (normalizedMessages && normalizedInput.messages === undefined) {
      normalizedInput.messages = normalizedMessages;
    }

    try {
      const queued = await createQueuedRequest({
        apiKey,
        endpoint: "/v1/chat/completions",
        capability: "text_generation",
        requestSource,
        model: parsed.model,
        prompt: parsed.prompt,
        messages: normalizedMessages,
        input: normalizedInput,
      });

      await enqueueInferenceJob({
        requestId: queued.requestId,
        workspaceId: queued.workspaceId,
        apiKeyId: queued.apiKeyId,
        providerModelId: queued.providerModelId,
        credentialId: queued.credentialId,
        providerSlug: queued.providerSlug,
        providerBaseUrl: queued.providerBaseUrl,
        providerConfig: queued.providerConfig,
        capability: "text_generation",
        publicModelSlug: parsed.model,
        upstreamModelSlug: queued.upstreamModelSlug,
        endpoint: queued.endpoint,
        prompt: parsed.prompt,
        input: normalizedInput,
      });

      return reply.code(202).send({
        id: queued.requestId,
        status: "queued",
      });
    } catch (error) {
      return sendRequestError(reply, error);
    }
  });

  const handleCodingChatCompletions = async (
    request: { body: unknown; headers: Record<string, unknown> },
    reply: {
      code: (statusCode: number) => { send: (body: unknown) => unknown };
      header: (name: string, value: string) => void;
      hijack: () => void;
      raw: import("node:http").ServerResponse;
    }
  ) => {
    let activeResolved:
      | Awaited<ReturnType<typeof resolveRequestRuntime>>
      | null = null;
    const parsed = codingChatRequestSchema.parse(request.body);
    const authHeader =
      typeof request.headers.authorization === "string" ? request.headers.authorization : "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "") ?? "";
    const sourceHeader =
      typeof request.headers["x-openoctopus-request-source"] === "string"
        ? request.headers["x-openoctopus-request-source"]
        : "";
    const requestSource = sourceHeader === "playground" ? "playground" : "api";
    const rawBody = parsed as Record<string, unknown>;
    const normalizedMessages =
      parsed.messages ??
      (Array.isArray(normalizeChatMessagesValue(parsed.input?.messages))
        ? (normalizeChatMessagesValue(parsed.input?.messages) as Array<Record<string, unknown>>)
        : undefined);
    const topLevelInput = Object.fromEntries(
      Object.entries(rawBody).filter(
        ([key]) => !["model", "prompt", "messages", "input"].includes(key)
      )
    );
    const normalizedInput = sanitizeInputRecord({
      ...(asRecord(parsed.input) ?? {}),
      ...topLevelInput,
    });
    if (normalizedMessages && normalizedInput.messages === undefined) {
      normalizedInput.messages = normalizedMessages;
    }

    try {
      const resolved = await resolveRequestRuntime({
        apiKey,
        endpoint: "/chat/completions",
        capability: "text_generation",
        requestSource,
        model: parsed.model,
        prompt: parsed.prompt,
        messages: normalizedMessages,
        input: normalizedInput,
      });
      activeResolved = resolved;

      const executionConfig = asRecord(resolved.providerConfig.executionConfig) ?? {};
      const clientProtocol = readString(executionConfig.clientProtocol);
      if (clientProtocol !== "openai-chat") {
        throw new RequestValidationError(
          "This text model is not enabled for coding-agent passthrough.",
          409,
          "model_not_available"
        );
      }

      const credentialRow = await resolveProviderSecret(resolved.credentialId);
      const providerSecret = decryptProviderSecret({
        ciphertext: credentialRow.secret_ciphertext!,
        iv: credentialRow.secret_iv!,
        authTag: credentialRow.secret_auth_tag!,
      });

      const baseUrl = resolved.providerBaseUrl;
      if (!baseUrl) {
        throw new RequestValidationError(
          "Provider base URL is missing.",
          409,
          "provider_credential_unusable"
        );
      }

      const submitPath = readString(executionConfig.submitPath);
      if (!submitPath) {
        throw new RequestValidationError(
          "Provider submitPath is missing.",
          409,
          "provider_credential_unusable"
        );
      }

      const upstreamUrl = new URL(
        fillTemplate(submitPath, { upstreamModel: resolved.upstreamModelSlug }),
        baseUrl
      );
      const authConfig = buildAuthHeaders(executionConfig, providerSecret);
      authConfig.applyQuery(upstreamUrl);

      const upstreamBody: Record<string, unknown> = {
        ...rawBody,
        model: resolved.upstreamModelSlug,
      };
      if (Array.isArray(upstreamBody.messages)) {
        upstreamBody.messages = normalizeOpenAiCompatibleMessages(upstreamBody.messages);
      }
      if (
        upstreamBody.input &&
        typeof upstreamBody.input === "object" &&
        !Array.isArray(upstreamBody.input)
      ) {
        const inputRecord = { ...(upstreamBody.input as Record<string, unknown>) };
        if (Array.isArray(inputRecord.messages)) {
          inputRecord.messages = normalizeOpenAiCompatibleMessages(inputRecord.messages);
        }
        upstreamBody.input = inputRecord;
      }

      const startedAt = new Date().toISOString();
      await recordInferenceRequest({
        ...resolved,
        status: "processing",
        startedAt,
      });
      await touchApiKeyLastUsed(resolved.apiKeyId);

      const { error: attemptInsertError } = await supabaseAdmin.from("provider_attempts").insert({
        request_id: resolved.requestId,
        provider_id: resolved.providerId,
        provider_model_id: resolved.providerModelId,
        attempt_no: 1,
        status: "processing",
        request_payload: {
          publicModelSlug: resolved.publicModelSlug,
          upstreamModelSlug: resolved.upstreamModelSlug,
          prompt: parsed.prompt,
          input: normalizedInput,
          clientProtocol,
        },
      });

      if (attemptInsertError) {
        throw new Error(attemptInsertError.message);
      }

      if (rawBody.stream === true) {
        const upstreamResponse = await postStream(upstreamUrl.toString(), {
          headers: authConfig.headers,
          body: upstreamBody,
        });

        reply.hijack();
        reply.raw.writeHead(
          upstreamResponse.status,
          Object.fromEntries(
            Object.entries(upstreamResponse.headers).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string"
            )
          )
        );

        const summary = createOpenAiChatStreamSummary();
        let textBuffer = "";
        const responseChunks: Buffer[] = [];

        for await (const chunk of upstreamResponse.stream) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          responseChunks.push(buffer);
          reply.raw.write(buffer);
          textBuffer = consumeOpenAiChatSseBuffer(
            textBuffer + buffer.toString("utf8"),
            summary
          );
        }
        reply.raw.end();

        if (upstreamResponse.status < 200 || upstreamResponse.status >= 300) {
          const errorText = Buffer.concat(responseChunks).toString("utf8");
          const errorCode = "provider_submit_failed";
          await supabaseAdmin
            .from("inference_requests")
            .update({
              status: "failed",
              error_code: errorCode,
              error_message: errorText,
              completed_at: new Date().toISOString(),
            })
            .eq("id", resolved.requestId);
          await supabaseAdmin
            .from("provider_attempts")
            .update({
              status: "failed",
              error_message: errorText,
              upstream_request_id: summary.upstreamRequestId,
            })
            .eq("request_id", resolved.requestId)
            .eq("attempt_no", 1);
          await sendFeishuFailureAlert({
            phase: "submit",
            requestId: resolved.requestId,
            workspaceId: resolved.workspaceId,
            apiKeyId: resolved.apiKeyId,
            capability: resolved.capability,
            publicModelSlug: resolved.publicModelSlug,
            providerSlug: resolved.providerSlug,
            upstreamModelSlug: resolved.upstreamModelSlug,
            endpoint: resolved.endpoint,
            errorCode,
            errorMessage: errorText,
          });
          await recordRequestSettlement({
            requestId: resolved.requestId,
            workspaceId: resolved.workspaceId,
            apiKeyId: resolved.apiKeyId,
            publicModelSlug: resolved.publicModelSlug,
            endpoint: resolved.endpoint,
            customerCharge: 0,
            providerCost: 0,
            statusCode: upstreamResponse.status,
            breakdown: buildSettlementBreakdown({
              customerCharge: 0,
              providerCost: 0,
              profit: 0,
            }),
          });
          return reply;
        }

        const normalizedOutput = normalizeOutputPayloadByCapability({
          capability: "text_generation",
          outputPayload: {
            text: summary.text,
            raw: {
              id: summary.upstreamRequestId,
              model: summary.model,
              usage: summary.usage,
              finish_reason: summary.finishReason,
              reasoning_content: summary.reasoningText || undefined,
            },
          },
        }) as Record<string, unknown>;

        const settlement = await resolveSettlementAmounts({
          providerModelId: resolved.providerModelId,
          publicModelSlug: resolved.publicModelSlug,
          requestInput: normalizedInput,
          output: normalizedOutput,
          providerRaw: asRecord(normalizedOutput.raw),
        });

        await supabaseAdmin
          .from("inference_requests")
          .update({
            status: "succeeded",
            output_payload: normalizedOutput,
            actual_cost: settlement.customer.total,
            actual_customer_charge: settlement.customer.total,
            actual_provider_cost: settlement.provider.total,
            actual_profit: settlement.actualProfit,
            estimated_cost: settlement.customer.total,
            estimated_customer_charge: settlement.customer.total,
            estimated_provider_cost: settlement.provider.total,
            estimated_profit: settlement.actualProfit,
            completed_at: new Date().toISOString(),
          })
          .eq("id", resolved.requestId);

        await supabaseAdmin
          .from("provider_attempts")
          .update({
            status: "succeeded",
            upstream_request_id: summary.upstreamRequestId,
            response_payload: normalizedOutput,
          })
          .eq("request_id", resolved.requestId)
          .eq("attempt_no", 1);

        await recordRequestSettlement({
          requestId: resolved.requestId,
          workspaceId: resolved.workspaceId,
          apiKeyId: resolved.apiKeyId,
          publicModelSlug: resolved.publicModelSlug,
          endpoint: resolved.endpoint,
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

        return reply;
      }

      const upstreamResponse = await postJson<Record<string, unknown>>(upstreamUrl.toString(), {
        headers: authConfig.headers,
        body: upstreamBody,
      });

      const text = extractOpenAiResponseText(upstreamResponse.data);
      const normalizedOutput = normalizeOutputPayloadByCapability({
        capability: "text_generation",
        outputPayload: {
          text,
          raw: upstreamResponse.data,
        },
      }) as Record<string, unknown>;

      const settlement = await resolveSettlementAmounts({
        providerModelId: resolved.providerModelId,
        publicModelSlug: resolved.publicModelSlug,
        requestInput: normalizedInput,
        output: normalizedOutput,
        providerRaw: upstreamResponse.data,
      });

      await supabaseAdmin
        .from("inference_requests")
        .update({
          status: "succeeded",
          output_payload: normalizedOutput,
          actual_cost: settlement.customer.total,
          actual_customer_charge: settlement.customer.total,
          actual_provider_cost: settlement.provider.total,
          actual_profit: settlement.actualProfit,
          estimated_cost: settlement.customer.total,
          estimated_customer_charge: settlement.customer.total,
          estimated_provider_cost: settlement.provider.total,
          estimated_profit: settlement.actualProfit,
          completed_at: new Date().toISOString(),
        })
        .eq("id", resolved.requestId);

      await supabaseAdmin
        .from("provider_attempts")
        .update({
          status: "succeeded",
          upstream_request_id:
            typeof upstreamResponse.data.id === "string" ? upstreamResponse.data.id : null,
          response_payload: normalizedOutput,
        })
        .eq("request_id", resolved.requestId)
        .eq("attempt_no", 1);

      await recordRequestSettlement({
        requestId: resolved.requestId,
        workspaceId: resolved.workspaceId,
        apiKeyId: resolved.apiKeyId,
        publicModelSlug: resolved.publicModelSlug,
        endpoint: resolved.endpoint,
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

      return reply.code(200).send(upstreamResponse.data);
    } catch (error) {
      if (activeResolved) {
        const errorMessage = error instanceof Error ? error.message : "Unknown coding gateway error";
        const errorCode =
          error instanceof RequestValidationError ? error.code : "provider_submit_failed";
        await supabaseAdmin
          .from("inference_requests")
          .update({
            status: "failed",
            error_code: errorCode,
            error_message: errorMessage,
            completed_at: new Date().toISOString(),
          })
          .eq("id", activeResolved.requestId);
        await supabaseAdmin
          .from("provider_attempts")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("request_id", activeResolved.requestId)
          .eq("attempt_no", 1);
        await sendFeishuFailureAlert({
          phase: "submit",
          requestId: activeResolved.requestId,
          workspaceId: activeResolved.workspaceId,
          apiKeyId: activeResolved.apiKeyId,
          capability: activeResolved.capability,
          publicModelSlug: activeResolved.publicModelSlug,
          providerSlug: activeResolved.providerSlug,
          upstreamModelSlug: activeResolved.upstreamModelSlug,
          endpoint: activeResolved.endpoint,
          errorCode,
          errorMessage,
        });
        try {
          await recordRequestSettlement({
            requestId: activeResolved.requestId,
            workspaceId: activeResolved.workspaceId,
            apiKeyId: activeResolved.apiKeyId,
            publicModelSlug: activeResolved.publicModelSlug,
            endpoint: activeResolved.endpoint,
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
          // Ignore settlement write failures on direct coding passthrough errors.
        }
      }
      if (reply.raw.headersSent) {
        return reply;
      }
      if (!(error instanceof RequestValidationError) && activeResolved) {
        return sendGatewayError(reply, {
          code: "provider_submit_failed",
          statusCode: 502,
        });
      }
      return sendRequestError(reply, error);
    }
  };

  app.post("/chat/completions", handleCodingChatCompletions);
  app.post("/v1/code/chat/completions", handleCodingChatCompletions);

  app.post("/v1/videos/generations", async (request, reply) => {
    const parsed = videoRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    const sourceHeader =
      typeof request.headers["x-openoctopus-request-source"] === "string"
        ? request.headers["x-openoctopus-request-source"]
        : "";
    const requestSource = sourceHeader === "playground" ? "playground" : "api";
    const normalizedInput: Record<string, unknown> = {
      ...parsed.input,
    };
    if (parsed.duration !== undefined && normalizedInput.duration === undefined) {
      normalizedInput.duration = parsed.duration;
    }
    if (
      parsed.duration_seconds !== undefined &&
      normalizedInput.duration_seconds === undefined
    ) {
      normalizedInput.duration_seconds = parsed.duration_seconds;
    }
    if (
      parsed.durationSeconds !== undefined &&
      normalizedInput.durationSeconds === undefined
    ) {
      normalizedInput.durationSeconds = parsed.durationSeconds;
    }
    if (parsed.aspect_ratio !== undefined && normalizedInput.aspect_ratio === undefined) {
      normalizedInput.aspect_ratio = parsed.aspect_ratio;
    }
    if (parsed.resolution !== undefined && normalizedInput.resolution === undefined) {
      normalizedInput.resolution = parsed.resolution;
    }

    try {
      const queued = await createQueuedRequest({
        apiKey,
        endpoint: "/v1/videos/generations",
        capability: "video_generation",
        requestSource,
        model: parsed.model,
        prompt: parsed.prompt,
        input: normalizedInput,
      });

      try {
        await enqueueInferenceJob({
          requestId: queued.requestId,
          workspaceId: queued.workspaceId,
          apiKeyId: queued.apiKeyId,
          providerModelId: queued.providerModelId,
          credentialId: queued.credentialId,
          providerSlug: queued.providerSlug,
          providerBaseUrl: queued.providerBaseUrl,
          providerConfig: queued.providerConfig,
          capability: "video_generation",
          publicModelSlug: parsed.model,
          upstreamModelSlug: queued.upstreamModelSlug,
          endpoint: queued.endpoint,
          prompt: parsed.prompt,
          input: normalizedInput,
        });
      } catch {
        throw new RequestValidationError(
          "Failed to enqueue video generation job",
          503,
          "queue_unavailable"
        );
      }

      return reply.code(202).send({
        id: queued.requestId,
        status: "queued",
      });
    } catch (error) {
      return sendRequestError(reply, error);
    }
  });

  app.get("/v1/tasks/:id", async (request, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
    let auth;
    try {
      auth = await authenticateApiKey(apiKey);
    } catch (error) {
      if (error instanceof RequestValidationError) {
        return sendGatewayError(reply, {
          code: error.code,
          statusCode: error.statusCode,
        });
      }
      throw error;
    }

    const { data, error } = await supabaseAdmin
      .from("inference_requests")
      .select("id, workspace_id, api_key_id, status, capability, public_model_slug, output_payload, error_code, error_message, created_at, completed_at")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      const notFound = await buildGatewayErrorResponse({
        code: "task_not_found",
        statusCode: 404,
      });
      return {
        id: params.id,
        status: "not_found",
        error_code: notFound.error.code,
        error_message: notFound.error.message,
        error: notFound.error,
      };
    }

    if (data.workspace_id !== auth.workspace_id || data.api_key_id !== auth.id) {
      const notFound = await buildGatewayErrorResponse({
        code: "task_not_found",
        statusCode: 404,
      });
      return {
        id: params.id,
        status: "not_found",
        error_code: notFound.error.code,
        error_message: notFound.error.message,
        error: notFound.error,
      };
    }

    if (data.status === "succeeded") {
      const normalizedOutputPayload = normalizeOutputPayloadByCapability({
        capability: data.capability,
        outputPayload: data.output_payload,
      });
      const redactedOutputPayload = redactOutputAssetSourceUrl(
        redactOutputPayloadRaw(normalizedOutputPayload)
      );
      return {
        ...data,
        output_payload: redactedOutputPayload,
      };
    }

    if (data.status === "failed") {
      const publicError = await resolveGatewayErrorDefinition(data.error_code);
      return {
        ...data,
        error_code: publicError.code,
        error_message: publicError.publicMessage,
        error: {
          code: publicError.code,
          message: publicError.publicMessage,
          retryable: publicError.retryable,
        },
      };
    }

    return data;
  });
}
