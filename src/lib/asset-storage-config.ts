const DEFAULT_BUCKET = process.env.GENERATED_ASSETS_BUCKET || "generated-assets";

export type AssetStorageConfig = {
  provider: "supabase" | "aliyun-oss" | "tencent-cos";
  inputBucket: string;
  outputBucket: string;
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

function readTtl(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 24 * 60 * 60;
}

export function parseAssetStorageConfig(executionConfig: unknown): AssetStorageConfig {
  const config = isRecord(executionConfig) ? executionConfig : {};
  const assetStorage = isRecord(config.assetStorage) ? config.assetStorage : {};
  const input = isRecord(assetStorage.input) ? assetStorage.input : {};
  const output = isRecord(assetStorage.output) ? assetStorage.output : {};
  const fallbackBucket = readBucket(assetStorage.bucket, DEFAULT_BUCKET);
  const provider = readProvider(assetStorage.provider);
  const inputBucket = readBucket(input.bucket, fallbackBucket);
  const outputBucket = readBucket(output.bucket, fallbackBucket);

  return {
    provider,
    inputBucket,
    outputBucket,
    signedUrlTtlSeconds: readTtl(assetStorage.signedUrlTtlSeconds),
    custom: provider !== "supabase" || inputBucket !== DEFAULT_BUCKET || outputBucket !== DEFAULT_BUCKET,
  };
}

export function getAssetStorageBucket(config: AssetStorageConfig, scope: "input" | "output") {
  if (config.provider !== "supabase") {
    throw new Error(`Asset storage provider ${config.provider} is not implemented yet`);
  }
  return scope === "input" ? config.inputBucket : config.outputBucket;
}

export function buildPublicAssetStorageConfig(config: AssetStorageConfig): PublicAssetStorageConfig {
  return {
    provider: config.provider,
    custom: config.custom,
  };
}
