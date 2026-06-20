import { env } from "../config.js";
import OSS from "ali-oss";
import { supabaseAdmin } from "./supabase.js";

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
  credentialRef: string | null;
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

function envSafeKey(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function joinPrefix(prefix: string | null, path: string) {
  const normalizedPath = path.replace(/^\/+/g, "");
  return prefix ? `${prefix}/${normalizedPath}` : normalizedPath;
}

export function parseAssetStorageConfig(executionConfig: unknown): AssetStorageConfig {
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
    credentialRef: readString(assetStorage.credentialRef),
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

function getAliyunCredentials(config: AssetStorageConfig) {
  if (!config.credentialRef) {
    throw new Error("assetStorage.credentialRef is required for aliyun-oss");
  }
  const envKey = envSafeKey(config.credentialRef);
  const accessKeyId = process.env[`ASSET_STORAGE_${envKey}_ACCESS_KEY_ID`];
  const accessKeySecret = process.env[`ASSET_STORAGE_${envKey}_ACCESS_KEY_SECRET`];
  if (!accessKeyId || !accessKeySecret) {
    throw new Error(`Missing Aliyun OSS credentials for assetStorage credentialRef "${config.credentialRef}"`);
  }
  return { accessKeyId, accessKeySecret };
}

function createAliyunClient(config: AssetStorageConfig, scope: AssetStorageScope) {
  if (!config.endpoint && !config.region) {
    throw new Error("assetStorage.endpoint or assetStorage.region is required for aliyun-oss");
  }
  const credentials = getAliyunCredentials(config);
  return new OSS({
    ...credentials,
    bucket: getAssetStorageBucket(config, scope),
    endpoint: config.endpoint ?? undefined,
    region: config.region ?? undefined,
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
    const client = createAliyunClient(input.config, input.scope);
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
    const client = createAliyunClient(input.config, input.scope);
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

export function getAssetStorageSignedUrl(input: {
  config: AssetStorageConfig;
  scope: AssetStorageScope;
  path: string;
  method?: "GET" | "PUT";
  contentType?: string;
}) {
  const storagePath = getAssetStorageObjectKey(input.config, input.scope, input.path);
  if (input.config.provider === "aliyun-oss") {
    const client = createAliyunClient(input.config, input.scope);
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
