import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sendGatewayError } from "../lib/gateway-errors.js";
import { decryptProviderSecret } from "../lib/provider-secret-crypto.js";
import { getStream } from "../lib/http.js";
import {
  getAssetStorageBucket,
  parseAssetStorageConfig,
  type AssetStorageConfig,
} from "../lib/asset-storage.js";
import { verifyFileAccessToken } from "../lib/file-access-token.js";
import { supabaseAdmin } from "../lib/supabase.js";
import { authenticateApiKey } from "../services/request-service.js";

const fileAssetParamsSchema = z.object({
  requestId: z.string().uuid(),
  assetIndex: z.coerce.number().int().min(0).max(100),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getAssetSourceUrl(outputPayload: unknown, assetIndex: number) {
  if (!isRecord(outputPayload) || !Array.isArray(outputPayload.assets)) {
    return null;
  }

  const asset = outputPayload.assets[assetIndex];
  if (!isRecord(asset)) {
    return null;
  }

  return typeof asset.sourceUrl === "string"
    ? asset.sourceUrl
    : typeof asset.url === "string"
      ? asset.url
      : null;
}

function parseDataUri(value: string) {
  const match = value.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!match) return null;
  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] ?? "";
  try {
    const buffer = isBase64
      ? Buffer.from(payload, "base64")
      : Buffer.from(decodeURIComponent(payload), "utf8");
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

function isAllowedGeminiDownloadUrl(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "generativelanguage.googleapis.com" &&
      /^\/v[^/]+\/files\/[^/]+:download$/.test(parsed.pathname)
    );
  } catch {
    return false;
  }
}

function copyHeader(
  reply: { header: (name: string, value: string) => unknown },
  headers: Record<string, string | string[] | undefined>,
  name: string
) {
  const value = headers[name.toLowerCase()];
  if (typeof value === "string") {
    reply.header(name, value);
  }
}

function buildAssetCachePath(requestId: string, assetIndex: number) {
  return `${requestId}/${assetIndex}`;
}

function buildAssetCachePathWithExtension(
  requestId: string,
  assetIndex: number,
  mimeType: string | null
) {
  const extension =
    mimeType === "image/jpeg"
      ? "jpg"
      : mimeType === "image/webp"
        ? "webp"
        : mimeType === "image/gif"
          ? "gif"
          : mimeType === "video/mp4"
            ? "mp4"
            : mimeType === "video/webm"
              ? "webm"
              : "png";
  return `${requestId}/${assetIndex}.${extension}`;
}

function readHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
) {
  const value = headers[name.toLowerCase()];
  return typeof value === "string" ? value : undefined;
}

function setGeneratedAssetHeaders(
  reply: { header: (name: string, value: string) => unknown },
  contentType: string,
  contentLength: number
) {
  const extension =
    contentType === "image/jpeg"
      ? "jpg"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : contentType === "video/mp4"
            ? "mp4"
            : contentType === "video/webm"
              ? "webm"
              : "png";
  reply.header("content-type", contentType);
  reply.header("content-length", String(contentLength));
  reply.header("content-disposition", `inline; filename="asset.${extension}"`);
  reply.header("cache-control", "public, max-age=3600");
  reply.header("access-control-allow-origin", "*");
  reply.header("cross-origin-resource-policy", "cross-origin");
}

function hasPrefix(buffer: Buffer, bytes: number[]) {
  if (buffer.length < bytes.length) {
    return false;
  }
  return bytes.every((value, index) => buffer[index] === value);
}

function looksLikeValidBinary(buffer: Buffer, mimeType: string | null) {
  if (buffer.length < 128) {
    return false;
  }
  const normalizedMime = (mimeType ?? "").toLowerCase();
  if (normalizedMime === "image/png") {
    return hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }
  if (normalizedMime === "image/jpeg") {
    return hasPrefix(buffer, [0xff, 0xd8, 0xff]);
  }
  if (normalizedMime === "image/webp") {
    return (
      hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46]) &&
      buffer.length >= 12 &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  if (normalizedMime === "image/gif") {
    return (
      hasPrefix(buffer, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]) ||
      hasPrefix(buffer, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])
    );
  }
  if (normalizedMime === "video/mp4") {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (normalizedMime === "video/webm") {
    return hasPrefix(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
  }
  return true;
}

async function downloadFromGeneratedBucket(storagePath: string, storageConfig: AssetStorageConfig) {
  const download = await supabaseAdmin.storage
    .from(getAssetStorageBucket(storageConfig, "output"))
    .download(storagePath);
  if (!download.data) {
    return null;
  }
  const buffer = Buffer.from(await download.data.arrayBuffer());
  return {
    buffer,
    contentType: download.data.type || "application/octet-stream",
  };
}

async function resolveRequestAssetStorageConfig(providerModelId: string | null) {
  if (!providerModelId) {
    return parseAssetStorageConfig({});
  }

  const { data: providerModel, error } = await supabaseAdmin
    .from("provider_models")
    .select("execution_config")
    .eq("id", providerModelId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return parseAssetStorageConfig(providerModel?.execution_config ?? {});
}

async function markGeneratedAssetInvalid(input: {
  requestId: string;
  storagePath: string;
  reason: string;
}) {
  await supabaseAdmin
    .from("generated_assets")
    .update({
      metadata: {
        assetIntegrity: {
          status: "invalid",
          reason: input.reason,
          checkedAt: new Date().toISOString(),
        },
      },
    })
    .eq("request_id", input.requestId)
    .eq("storage_path", input.storagePath);
}

async function hasAuthorizedFileAccess(input: {
  request: { headers: { authorization?: string }; url: string };
  requestId: string;
  assetIndex: number;
  workspaceId: string;
}) {
  const token = new URL(input.request.url, "http://localhost").searchParams.get("token") ?? undefined;
  if (verifyFileAccessToken({ token, requestId: input.requestId, assetIndex: input.assetIndex })) {
    return true;
  }

  const apiKey = input.request.headers.authorization?.replace(/^Bearer\s+/i, "") ?? "";
  if (!apiKey) {
    return false;
  }

  try {
    const apiKeyRow = await authenticateApiKey(apiKey);
    return apiKeyRow.workspace_id === input.workspaceId;
  } catch {
    return false;
  }
}

export async function registerFileRoutes(app: FastifyInstance) {
  app.get("/v1/files/:requestId/assets/:assetIndex", async (request, reply) => {
    const params = fileAssetParamsSchema.parse(request.params);

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("inference_requests")
      .select("id, workspace_id, provider_id, provider_model_id, output_payload")
      .eq("id", params.requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(requestError.message);
    }

    if (!requestRow) {
      return sendGatewayError(reply, {
        code: "file_not_found",
        statusCode: 404,
      });
    }

    const storageConfig = await resolveRequestAssetStorageConfig(requestRow.provider_model_id);
    if (storageConfig.custom) {
      const authorized = await hasAuthorizedFileAccess({
        request: {
          headers: {
            authorization:
              typeof request.headers.authorization === "string"
                ? request.headers.authorization
                : undefined,
          },
          url: request.url,
        },
        requestId: params.requestId,
        assetIndex: params.assetIndex,
        workspaceId: requestRow.workspace_id,
      });

      if (!authorized) {
        return sendGatewayError(reply, {
          code: "unauthorized",
          statusCode: 401,
        });
      }
    }

    const { data: assetRows, error: assetError } = await supabaseAdmin
      .from("generated_assets")
      .select("storage_bucket, storage_path, mime_type, created_at")
      .eq("request_id", params.requestId)
      .like("storage_path", `${params.requestId}/${params.assetIndex}.%`)
      .order("created_at", { ascending: false })
      .limit(1);

    if (assetError) {
      throw new Error(assetError.message);
    }

    const storedAsset = assetRows?.[0];
    if (storedAsset?.storage_bucket && storedAsset.storage_path) {
      const storedDownload = await supabaseAdmin.storage
        .from(storedAsset.storage_bucket)
        .download(storedAsset.storage_path);
      if (storedDownload.data) {
        const buffer = Buffer.from(await storedDownload.data.arrayBuffer());
        const contentType = storedAsset.mime_type || storedDownload.data.type || "application/octet-stream";
        if (looksLikeValidBinary(buffer, contentType)) {
          setGeneratedAssetHeaders(reply, contentType, buffer.length);
          return reply.code(200).send(buffer);
        }
        await markGeneratedAssetInvalid({
          requestId: params.requestId,
          storagePath: storedAsset.storage_path,
          reason: "invalid_binary_from_generated_assets",
        });
      }
    }
    const outputStorageBucket = getAssetStorageBucket(storageConfig, "output");
    const cachePathBase = buildAssetCachePath(params.requestId, params.assetIndex);
    const candidatePaths = [
      cachePathBase,
      `${cachePathBase}.png`,
      `${cachePathBase}.jpg`,
      `${cachePathBase}.webp`,
      `${cachePathBase}.gif`,
      `${cachePathBase}.mp4`,
      `${cachePathBase}.webm`,
    ];
    for (const path of candidatePaths) {
      const cachedFile = await downloadFromGeneratedBucket(path, storageConfig);
      if (!cachedFile) {
        continue;
      }
      if (!looksLikeValidBinary(cachedFile.buffer, cachedFile.contentType)) {
        continue;
      }
      setGeneratedAssetHeaders(reply, cachedFile.contentType, cachedFile.buffer.length);
      return reply.code(200).send(cachedFile.buffer);
    }

    const sourceUrl = getAssetSourceUrl(requestRow.output_payload, params.assetIndex);
    if (sourceUrl?.startsWith("data:")) {
      const parsed = parseDataUri(sourceUrl);
      if (parsed) {
        await supabaseAdmin.storage
          .from(outputStorageBucket)
          .upload(cachePathBase, parsed.buffer, {
            contentType: parsed.mimeType,
            upsert: true,
          });
        setGeneratedAssetHeaders(reply, parsed.mimeType, parsed.buffer.length);
        return reply.code(200).send(parsed.buffer);
      }
    }

    if (!sourceUrl || !isAllowedGeminiDownloadUrl(sourceUrl)) {
      return sendGatewayError(reply, {
        code: "file_not_found",
        statusCode: 404,
      });
    }

    const { data: credentialRows, error: credentialError } = await supabaseAdmin
      .from("provider_credentials")
      .select("secret_ciphertext, secret_iv, secret_auth_tag")
      .eq("provider_id", requestRow.provider_id)
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (credentialError) {
      throw new Error(credentialError.message);
    }

    const credential = credentialRows?.[0];
    if (!credential?.secret_ciphertext || !credential.secret_iv || !credential.secret_auth_tag) {
      return sendGatewayError(reply, {
        code: "provider_credential_unavailable",
        statusCode: 503,
      });
    }

    const providerSecret = decryptProviderSecret({
      ciphertext: credential.secret_ciphertext,
      iv: credential.secret_iv,
      authTag: credential.secret_auth_tag,
    });

    const range = request.headers.range;
    const upstream = await getStream(sourceUrl, {
      headers: {
        "x-goog-api-key": providerSecret,
        ...(typeof range === "string" ? { range } : {}),
      },
    });

    if (upstream.status === 200) {
      const chunks: Buffer[] = [];
      for await (const chunk of upstream.stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      const bodyBuffer = Buffer.concat(chunks);
      const contentType = readHeaderValue(upstream.headers, "content-type");
      if (!looksLikeValidBinary(bodyBuffer, contentType ?? null)) {
        return sendGatewayError(reply, {
          code: "upstream_result_missing",
          statusCode: 502,
        });
      }
      await supabaseAdmin.storage
        .from(outputStorageBucket)
        .upload(buildAssetCachePathWithExtension(params.requestId, params.assetIndex, contentType ?? null), bodyBuffer, {
          contentType,
          upsert: true,
        });
      setGeneratedAssetHeaders(reply, contentType || "application/octet-stream", bodyBuffer.length);
      return reply.code(200).send(bodyBuffer);
    }

    copyHeader(reply, upstream.headers, "content-type");
    copyHeader(reply, upstream.headers, "content-length");
    copyHeader(reply, upstream.headers, "content-range");
    copyHeader(reply, upstream.headers, "accept-ranges");
    copyHeader(reply, upstream.headers, "cache-control");
    copyHeader(reply, upstream.headers, "etag");
    copyHeader(reply, upstream.headers, "last-modified");

    return reply.code(upstream.status).send(upstream.stream);
  });
}
