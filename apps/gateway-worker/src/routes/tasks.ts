import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  buildGatewayErrorResponse,
  resolveGatewayErrorDefinition,
  sendGatewayError,
} from "../lib/gateway-errors.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { normalizeOutputPayloadByCapability } from "../lib/image-output-contract.js";

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
  RequestValidationError,
} from "../services/request-service.js";

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
