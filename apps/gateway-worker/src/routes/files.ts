import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config.js";
import { sendGatewayError } from "../lib/gateway-errors.js";
import { decryptProviderSecret } from "../lib/provider-secret-crypto.js";
import { getStream } from "../lib/http.js";
import { supabaseAdmin } from "../lib/supabase.js";

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
  reply.header("content-type", contentType);
  reply.header("content-length", String(contentLength));
  reply.header("cache-control", "public, max-age=3600");
  reply.header("access-control-allow-origin", "*");
  reply.header("cross-origin-resource-policy", "cross-origin");
}

export async function registerFileRoutes(app: FastifyInstance) {
  app.get("/v1/files/:requestId/assets/:assetIndex", async (request, reply) => {
    const params = fileAssetParamsSchema.parse(request.params);

    const { data: assetRows, error: assetError } = await supabaseAdmin
      .from("generated_assets")
      .select("storage_bucket, storage_path, mime_type")
      .eq("request_id", params.requestId)
      .like("storage_path", `${params.requestId}/${params.assetIndex}.%`)
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
        setGeneratedAssetHeaders(reply, contentType, buffer.length);
        return reply.code(200).send(buffer);
      }
    }

    const cachePath = buildAssetCachePath(params.requestId, params.assetIndex);
    const cachedDownload = await supabaseAdmin.storage
      .from(env.GENERATED_ASSETS_BUCKET)
      .download(cachePath);
    if (cachedDownload.data) {
      const buffer = Buffer.from(await cachedDownload.data.arrayBuffer());
      const contentType = cachedDownload.data.type || "application/octet-stream";
      setGeneratedAssetHeaders(reply, contentType, buffer.length);
      return reply.code(200).send(buffer);
    }

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("inference_requests")
      .select("id, provider_id, output_payload")
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

    const sourceUrl = getAssetSourceUrl(requestRow.output_payload, params.assetIndex);
    if (sourceUrl?.startsWith("data:")) {
      const parsed = parseDataUri(sourceUrl);
      if (parsed) {
        await supabaseAdmin.storage
          .from(env.GENERATED_ASSETS_BUCKET)
          .upload(cachePath, parsed.buffer, {
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
      await supabaseAdmin.storage
        .from(env.GENERATED_ASSETS_BUCKET)
        .upload(cachePath, bodyBuffer, {
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
