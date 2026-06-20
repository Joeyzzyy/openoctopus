import { env } from "../config.js";
import OSS from "ali-oss";
import { supabaseAdmin } from "./supabase.js";
import { decryptProviderSecret } from "./provider-secret-crypto.js";

type AssetStorageScope = "input" | "output";

export type AssetStorageConfig = {
  provider: "supabase" | "aliyun-oss" | "tencent-cos";
  inputBucket: string;
  outputBucket: string;
  endpoint: string | null;
  region: string | null;
  publicBaseUrl: string | null;
  inputPrefix: string | null;
  outputPrefix: string | null;
  credentialId: string | null;
  providerId: string | null;
  signedUrlTtlSeconds: number;
  custom: boolean;
};

export type PublicAssetStorageConfig = {
  provider: AssetStorageConfig["provider"];
  custom: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readProvider(value: unknown): AssetStorageConfig["provider"] {
  return value === "aliyun-oss" || value === "tencent-cos" ? value : "supabase";
}

function readBucket(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function normalizePrefix(value: unknown) {
  const raw = readString(value);
  if (!raw) return null;
  return raw.replace(/^\/+|\/+$/g, "") || null;
}

function readTtl(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 24 * 60 * 60;
}

function joinPrefix(prefix: string | null, path: string) {
  const normalizedPath = path.replace(/^\/+/g, "");
  return prefix ? `${prefix}/${normalizedPath}` : normalizedPath;
}

export function parseAssetStorageConfig(
  executionConfig: unknown,
  options: { providerId?: string | null } = {}
): AssetStorageConfig {
  const config = isRecord(executionConfig) ? executionConfig : {};
  const assetStorage = isRecord(config.assetStorage) ? config.assetStorage : {};
  const input = isRecord(assetStorage.input) ? assetStorage.input : {};
  const output = isRecord(assetStorage.output) ? assetStorage.output : {};
  const fallbackBucket = readBucket(assetStorage.bucket, env.GENERATED_ASSETS_BUCKET);
  const provider = readProvider(assetStorage.provider);
  const inputBucket = readBucket(input.bucket, fallbackBucket);
  const outputBucket = readBucket(output.bucket, fallbackBucket);
  const inputPrefix = normalizePrefix(input.prefix) ?? normalizePrefix(assetStorage.inputPrefix);
  const outputPrefix = normalizePrefix(output.prefix) ?? normalizePrefix(assetStorage.outputPrefix);

  return {
    provider,
    inputBucket,
    outputBucket,
    endpoint: readString(assetStorage.endpoint),
    region: readString(assetStorage.region),
    publicBaseUrl: readString(assetStorage.publicBaseUrl),
    inputPrefix,
    outputPrefix,
    credentialId: readString(assetStorage.credentialId) ?? readString(assetStorage.storageCredentialId),
    providerId: options.providerId ?? null,
    signedUrlTtlSeconds: readTtl(assetStorage.signedUrlTtlSeconds),
    custom:
      provider !== "supabase" ||
      inputBucket !== env.GENERATED_ASSETS_BUCKET ||
      outputBucket !== env.GENERATED_ASSETS_BUCKET ||
      Boolean(inputPrefix) ||
      Boolean(outputPrefix),
  };
}

export function getAssetStorageBucket(config: AssetStorageConfig, scope: AssetStorageScope) {
  return scope === "input" ? config.inputBucket : config.outputBucket;
}

export function getAssetStorageObjectKey(config: AssetStorageConfig, scope: AssetStorageScope, path: string) {
  return joinPrefix(scope === "input" ? config.inputPrefix : config.outputPrefix, path);
}

async function resolveAliyunConfig(config: AssetStorageConfig) {
  if (!config.credentialId) {
    throw new Error("assetStorage.credentialId is required for aliyun-oss");
  }
  if (!config.providerId) {
    throw new Error("Provider id is required to resolve asset storage credentials");
  }

  const { data, error } = await supabaseAdmin
    .from("provider_asset_storage_credentials")
    .select(
      "provider_id, storage_provider, bucket, region, endpoint, public_base_url, access_key_id_ciphertext, access_key_id_iv, access_key_id_auth_tag, access_key_secret_ciphertext, access_key_secret_iv, access_key_secret_auth_tag, is_active"
    )
    .eq("id", config.credentialId)
    .eq("provider_id", config.providerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data || data.storage_provider !== "aliyun-oss" || data.is_active !== true) {
    throw new Error("Aliyun OSS asset storage credential is missing or inactive");
  }

  return {
    bucket: config.outputBucket || data.bucket,
    endpoint: config.endpoint ?? data.endpoint ?? null,
    region: config.region ?? data.region ?? null,
    publicBaseUrl: config.publicBaseUrl ?? data.public_base_url ?? null,
    accessKeyId: decryptProviderSecret({
      ciphertext: data.access_key_id_ciphertext,
      iv: data.access_key_id_iv,
      authTag: data.access_key_id_auth_tag,
    }),
    accessKeySecret: decryptProviderSecret({
      ciphertext: data.access_key_secret_ciphertext,
      iv: data.access_key_secret_iv,
      authTag: data.access_key_secret_auth_tag,
    }),
  };
}

async function createAliyunClient(config: AssetStorageConfig, scope: AssetStorageScope) {
  const resolved = await resolveAliyunConfig(config);
  const bucket = scope === "input" ? config.inputBucket : config.outputBucket;
  const effectiveBucket = bucket && bucket !== env.GENERATED_ASSETS_BUCKET ? bucket : resolved.bucket;
  const effectiveEndpoint = config.endpoint ?? resolved.endpoint;
  const effectiveRegion = config.region ?? resolved.region;
  if (!effectiveEndpoint && !effectiveRegion) {
    throw new Error("assetStorage.endpoint or assetStorage.region is required for aliyun-oss");
  }
  return new OSS({
    accessKeyId: resolved.accessKeyId,
    accessKeySecret: resolved.accessKeySecret,
    bucket: effectiveBucket,
    endpoint: effectiveEndpoint ?? undefined,
    region: effectiveRegion ?? undefined,
    secure: true,
  });
}

export async function uploadAssetStorageObject(input: {
  config: AssetStorageConfig;
  scope: AssetStorageScope;
  path: string;
  body: Buffer;
  contentType: string;
}) {
  const storageBucket = getAssetStorageBucket(input.config, input.scope);
  const storagePath = getAssetStorageObjectKey(input.config, input.scope, input.path);

  if (input.config.provider === "aliyun-oss") {
    const client = await createAliyunClient(input.config, input.scope);
    await client.put(storagePath, input.body, {
      headers: {
        "Content-Type": input.contentType,
      },
    });
    return {
      storageBucket,
      storagePath,
    };
  }

  if (input.config.provider !== "supabase") {
    throw new Error(`Asset storage provider ${input.config.provider} is not implemented yet`);
  }

  const { error } = await supabaseAdmin.storage
    .from(storageBucket)
    .upload(storagePath, input.body, {
      contentType: input.contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    storageBucket,
    storagePath,
  };
}

export async function downloadAssetStorageObject(input: {
  config: AssetStorageConfig;
  scope: AssetStorageScope;
  path: string;
}) {
  const storagePath = getAssetStorageObjectKey(input.config, input.scope, input.path);
  return downloadAssetStorageObjectByStoragePath({
    config: input.config,
    scope: input.scope,
    storagePath,
  });
}

export async function downloadAssetStorageObjectByStoragePath(input: {
  config: AssetStorageConfig;
  scope: AssetStorageScope;
  storagePath: string;
}) {
  if (input.config.provider === "aliyun-oss") {
    const client = await createAliyunClient(input.config, input.scope);
    const result = await client.get(input.storagePath);
    const contentType =
      typeof result.res?.headers?.["content-type"] === "string"
        ? result.res.headers["content-type"].split(";")[0]
        : "application/octet-stream";
    return {
      buffer: Buffer.isBuffer(result.content) ? result.content : Buffer.from(result.content),
      contentType,
    };
  }

  if (input.config.provider !== "supabase") {
    throw new Error(`Asset storage provider ${input.config.provider} is not implemented yet`);
  }

  const download = await supabaseAdmin.storage
    .from(getAssetStorageBucket(input.config, input.scope))
    .download(input.storagePath);
  if (!download.data) {
    return null;
  }
  const buffer = Buffer.from(await download.data.arrayBuffer());
  return {
    buffer,
    contentType: download.data.type || "application/octet-stream",
  };
}

export function getAssetStoragePublicUrl(input: {
  config: AssetStorageConfig;
  scope: AssetStorageScope;
  path: string;
}) {
  const storagePath = getAssetStorageObjectKey(input.config, input.scope, input.path);
  if (!input.config.publicBaseUrl) {
    return null;
  }
  return new URL(storagePath.split("/").map(encodeURIComponent).join("/"), `${input.config.publicBaseUrl.replace(/\/+$/g, "")}/`).toString();
}

export async function getAssetStorageSignedUrl(input: {
  config: AssetStorageConfig;
  scope: AssetStorageScope;
  path: string;
  method?: "GET" | "PUT";
  contentType?: string;
}) {
  const storagePath = getAssetStorageObjectKey(input.config, input.scope, input.path);
  if (input.config.provider === "aliyun-oss") {
    const client = await createAliyunClient(input.config, input.scope);
    return client.signatureUrl(storagePath, {
      expires: input.config.signedUrlTtlSeconds,
      method: input.method ?? "GET",
      ...(input.contentType ? { "Content-Type": input.contentType } : {}),
    });
  }
  return null;
}

export function buildPublicAssetStorageConfig(config: AssetStorageConfig): PublicAssetStorageConfig {
  return {
    provider: config.provider,
    custom: config.custom,
  };
}
