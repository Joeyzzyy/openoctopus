import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { enqueueInferenceJob } from "../queue/runner.js";
import {
  createQueuedRequest,
  RequestValidationError,
} from "../services/request-service.js";

const imageRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

const videoRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
  duration: z.union([z.number(), z.string()]).optional(),
  duration_seconds: z.union([z.number(), z.string()]).optional(),
  durationSeconds: z.union([z.number(), z.string()]).optional(),
  aspect_ratio: z.string().optional(),
  resolution: z.string().optional(),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    if (!isRecord(current) || !(key in current)) {
      return null;
    }
    current = current[key];
  }
  return current ?? null;
}

function inferImageMimeType(raw: Record<string, unknown> | null, assetUrl: string) {
  const fromRaw =
    readPath(raw, ["data", "0", "mime_type"]) ??
    readPath(raw, ["data", "0", "mimeType"]) ??
    readPath(raw, ["output_format"]);
  if (typeof fromRaw === "string" && fromRaw.trim().length > 0) {
    const value = fromRaw.trim();
    if (value.includes("/")) {
      return value;
    }
    return `image/${value}`;
  }

  if (assetUrl.startsWith("data:")) {
    const match = assetUrl.match(/^data:([^;,]+)[;,]/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "image/png";
}

function normalizeImageOutputPayload(outputPayload: unknown) {
  const output = isRecord(outputPayload) ? outputPayload : {};
  const raw = isRecord(output.raw) ? output.raw : null;
  const existingAssets = Array.isArray(output.assets) ? output.assets : [];

  const normalizedAssets = (existingAssets.length > 0 ? existingAssets : [null])
    .map((asset, index) => {
      const assetRecord = isRecord(asset) ? asset : null;
      const fallbackUrl =
        typeof readPath(raw, ["data", "0", "url"]) === "string"
          ? (readPath(raw, ["data", "0", "url"]) as string)
          : typeof readPath(raw, ["data", "0", "b64_json"]) === "string"
            ? `data:image/png;base64,${String(readPath(raw, ["data", "0", "b64_json"]))}`
            : typeof readPath(raw, ["candidates", "0", "content", "parts", "0", "inlineData", "data"]) === "string"
              ? `data:${String(readPath(raw, ["candidates", "0", "content", "parts", "0", "inlineData", "mimeType"]) ?? "image/png")};base64,${String(
                  readPath(raw, ["candidates", "0", "content", "parts", "0", "inlineData", "data"])
                )}`
              : null;
      const url =
        typeof assetRecord?.url === "string" && assetRecord.url.length > 0
          ? assetRecord.url
          : fallbackUrl;
      if (!url) {
        return null;
      }

      const sourceUrl =
        typeof assetRecord?.sourceUrl === "string" && assetRecord.sourceUrl.length > 0
          ? assetRecord.sourceUrl
          : undefined;
      const width = Number(readPath(raw, ["data", "0", "width"]) ?? readPath(raw, ["width"]));
      const height = Number(readPath(raw, ["data", "0", "height"]) ?? readPath(raw, ["height"]));
      const mimeType = inferImageMimeType(raw, url);

      return {
        id: `${index}`,
        index,
        type: "image",
        url,
        ...(sourceUrl ? { sourceUrl } : {}),
        mimeType,
        ...(Number.isFinite(width) && width > 0 ? { width } : {}),
        ...(Number.isFinite(height) && height > 0 ? { height } : {}),
      };
    })
    .filter((item) => item !== null);

  return {
    format: "openoctopus.image.output.v1",
    raw: output.raw ?? null,
    assets: normalizedAssets,
  };
}

export async function registerTaskRoutes(app: FastifyInstance) {
  const sendRequestError = (reply: { code: (statusCode: number) => { send: (body: unknown) => unknown } }, error: unknown) => {
    if (error instanceof RequestValidationError) {
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    throw error;
  };

  app.get("/v1/models", async () => {
    const { data, error } = await supabaseAdmin
      .from("provider_models")
      .select("id, public_model_slug, upstream_model_slug, capability, active, provider_id, providers(name, slug)")
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

    try {
      const queued = await createQueuedRequest({
        apiKey,
        endpoint: "/v1/images/generations",
        capability: "image_generation",
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
        capability: "image_generation",
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
        model: parsed.model,
        prompt: parsed.prompt,
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
        capability: "video_generation",
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

  app.get("/v1/tasks/:id", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const { data, error } = await supabaseAdmin
      .from("inference_requests")
      .select("id, status, capability, public_model_slug, output_payload, error_code, error_message, created_at, completed_at")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return {
        id: params.id,
        status: "not_found",
      };
    }

    if ((data.capability === "image_generation" || data.capability === "image_edit") && data.status === "succeeded") {
      return {
        ...data,
        output_payload: normalizeImageOutputPayload(data.output_payload),
      };
    }

    return data;
  });
}
