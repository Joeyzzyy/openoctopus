import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendGatewayError } from "../lib/gateway-errors.js";
import {
  buildPublicAssetStorageConfig,
  getAssetStorageSignedUrl,
  getAssetStoragePublicUrl,
  parseAssetStorageConfig,
  uploadAssetStorageObject,
} from "../lib/asset-storage.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { authenticateApiKey, RequestValidationError } from "../services/request-service.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const allowedMimeTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/mp4", "m4a"],
  ["audio/aac", "aac"],
  ["audio/ogg", "ogg"],
  ["audio/webm", "webm"],
]);

const querySchema = z.object({
  filename: z.string().trim().min(1).max(180).default("upload"),
  field: z.string().trim().min(1).max(80).default("file"),
  model: z.string().trim().min(1).max(120).optional(),
  capability: z.enum([
    "image_generation",
    "image_edit",
    "image_recognition",
    "document_analysis",
    "text_generation",
    "video_generation",
  ]).optional(),
});

function sanitizePathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "upload";
}

function stripKnownExtension(filename: string) {
  return filename.replace(/\.(png|jpe?g|webp|gif|mp4|webm|mov|mp3|wav|m4a|aac|ogg)$/i, "");
}

async function resolveUploadAssetStorage(input: {
  workspaceId: string;
  model?: string;
  capability?: string;
}) {
  if (!input.model || !input.capability) {
    return parseAssetStorageConfig({});
  }

  const { data: routeRow, error: routeError } = await supabaseAdmin
    .from("routing_rules")
    .select("primary_provider_model_id, workspace_id")
    .eq("public_model_slug", input.model)
    .eq("capability", input.capability)
    .eq("active", true)
    .or(`workspace_id.eq.${input.workspaceId},workspace_id.is.null`)
    .order("workspace_id", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (routeError) {
    throw new Error(routeError.message);
  }

  if (!routeRow?.primary_provider_model_id) {
    return parseAssetStorageConfig({});
  }

  const { data: providerModel, error: providerModelError } = await supabaseAdmin
    .from("provider_models")
    .select("execution_config")
    .eq("id", routeRow.primary_provider_model_id)
    .maybeSingle();

  if (providerModelError) {
    throw new Error(providerModelError.message);
  }

  return parseAssetStorageConfig(providerModel?.execution_config ?? {});
}

export async function registerUploadRoutes(app: FastifyInstance) {
  app.addContentTypeParser(
    Array.from(allowedMimeTypes.keys()).concat("application/octet-stream"),
    { parseAs: "buffer", bodyLimit: MAX_UPLOAD_BYTES },
    (_request, body, done) => {
      done(null, body);
    }
  );

  app.post("/v1/uploads", { bodyLimit: MAX_UPLOAD_BYTES }, async (request, reply) => {
    try {
      const authHeader = request.headers.authorization;
      const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";
      const apiKeyRow = await authenticateApiKey(apiKey);
      const parsed = querySchema.parse(request.query);
      const contentType = String(request.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      const extension = allowedMimeTypes.get(contentType);
      const body = request.body;
      const storageConfig = await resolveUploadAssetStorage({
        workspaceId: apiKeyRow.workspace_id,
        model: parsed.model,
        capability: parsed.capability,
      });

      if (!extension || !Buffer.isBuffer(body) || body.length <= 0 || body.length > MAX_UPLOAD_BYTES) {
        return sendGatewayError(reply, {
          code: "invalid_request",
          statusCode: 400,
        });
      }

      const relativePath = `api-uploads/${apiKeyRow.workspace_id}/${sanitizePathPart(parsed.field)}/${randomUUID()}-${sanitizePathPart(stripKnownExtension(parsed.filename))}.${extension}`;
      const uploaded = await uploadAssetStorageObject({
        config: storageConfig,
        scope: "input",
        path: relativePath,
        body,
        contentType,
      });

      let signedUrl =
        getAssetStorageSignedUrl({
          config: storageConfig,
          scope: "input",
          path: relativePath,
          method: "GET",
        }) ??
        getAssetStoragePublicUrl({
          config: storageConfig,
          scope: "input",
          path: relativePath,
        });

      if (!signedUrl) {
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from(uploaded.storageBucket)
          .createSignedUrl(uploaded.storagePath, storageConfig.signedUrlTtlSeconds);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          throw new Error(signedUrlError?.message ?? "Failed to create upload URL");
        }
        signedUrl = signedUrlData.signedUrl;
      }

      return reply.code(201).send({
        url: signedUrl,
        mimeType: contentType,
        name: parsed.filename,
        size: body.length,
        expiresIn: storageConfig.signedUrlTtlSeconds,
        asset_storage: buildPublicAssetStorageConfig(storageConfig),
      });
    } catch (error) {
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
    }
  });
}
