import type { FastifyInstance } from "fastify";
import { z } from "zod";
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

export async function registerFileRoutes(app: FastifyInstance) {
  app.get("/v1/files/:requestId/assets/:assetIndex", async (request, reply) => {
    const params = fileAssetParamsSchema.parse(request.params);

    const { data: requestRow, error: requestError } = await supabaseAdmin
      .from("inference_requests")
      .select("id, provider_id, output_payload")
      .eq("id", params.requestId)
      .maybeSingle();

    if (requestError) {
      throw new Error(requestError.message);
    }

    if (!requestRow) {
      return reply.code(404).send({
        error: {
          code: "file_not_found",
          message: "Generated file not found",
        },
      });
    }

    const sourceUrl = getAssetSourceUrl(requestRow.output_payload, params.assetIndex);
    if (!sourceUrl || !isAllowedGeminiDownloadUrl(sourceUrl)) {
      return reply.code(404).send({
        error: {
          code: "file_not_found",
          message: "Generated file is not available through this proxy",
        },
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
      return reply.code(503).send({
        error: {
          code: "provider_credential_unavailable",
          message: "Provider credential secret is unavailable",
        },
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
