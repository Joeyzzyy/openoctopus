import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config.js";
import { sendGatewayError } from "../lib/gateway-errors.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { authenticateApiKey, RequestValidationError } from "../services/request-service.js";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;

const allowedMimeTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);

const querySchema = z.object({
  filename: z.string().trim().min(1).max(180).default("upload"),
  field: z.string().trim().min(1).max(80).default("file"),
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
  return filename.replace(/\.(png|jpe?g|webp|gif)$/i, "");
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

      if (!extension || !Buffer.isBuffer(body) || body.length <= 0 || body.length > MAX_UPLOAD_BYTES) {
        return sendGatewayError(reply, {
          code: "invalid_request",
          statusCode: 400,
        });
      }

      const storagePath = `api-uploads/${apiKeyRow.workspace_id}/${sanitizePathPart(parsed.field)}/${randomUUID()}-${sanitizePathPart(stripKnownExtension(parsed.filename))}.${extension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from(env.GENERATED_ASSETS_BUCKET)
        .upload(storagePath, body, {
          contentType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
        .from(env.GENERATED_ASSETS_BUCKET)
        .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(signedUrlError?.message ?? "Failed to create upload URL");
      }

      return reply.code(201).send({
        url: signedUrlData.signedUrl,
        mimeType: contentType,
        name: parsed.filename,
        size: body.length,
        expiresIn: SIGNED_URL_TTL_SECONDS,
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
