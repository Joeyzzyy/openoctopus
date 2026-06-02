import { supabaseAdmin } from "../lib/supabase.js";
import { env } from "../config.js";
import {
  getAssetStorageBucket,
  parseAssetStorageConfig,
  type AssetStorageConfig,
} from "../lib/asset-storage.js";

type PersistAssetInput = {
  requestId: string;
  workspaceId: string;
  output: Record<string, unknown>;
  executionConfig?: unknown;
};

type CachedAsset = {
  url: string;
  storageBucket: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

type AssetIntegrity = {
  status: "valid" | "invalid";
  reason: string;
};

const MIN_VALID_BINARY_BYTES = 128;

export class AssetIntegrityError extends Error {
  readonly assetIndex: number;
  readonly reasonCode: string;

  constructor(input: { assetIndex: number; reasonCode: string }) {
    super(`Asset integrity check failed at index ${input.assetIndex}: ${input.reasonCode}`);
    this.name = "AssetIntegrityError";
    this.assetIndex = input.assetIndex;
    this.reasonCode = input.reasonCode;
  }
}

function readNumericCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function resolveAssetDurationMs(
  asset: Record<string, unknown>,
  output: Record<string, unknown>
) {
  const assetDurationSeconds =
    readNumericCandidate(asset.durationSeconds) ??
    readNumericCandidate(asset.duration_seconds) ??
    readNumericCandidate(asset.duration);
  if (assetDurationSeconds !== null) {
    return Math.round(assetDurationSeconds * 1000);
  }

  const outputDurationSeconds =
    readNumericCandidate(output.durationSeconds) ??
    readNumericCandidate(output.duration_seconds);
  if (outputDurationSeconds !== null) {
    return Math.round(outputDurationSeconds * 1000);
  }

  return null;
}

function buildAssetCachePath(requestId: string, assetIndex: number, mimeType: string | null) {
  const extension =
    mimeType === "image/jpeg" ? "jpg"
      : mimeType === "image/webp" ? "webp"
        : mimeType === "video/mp4" ? "mp4"
          : mimeType === "video/webm" ? "webm"
            : "png";
  return `${requestId}/${assetIndex}.${extension}`;
}

function buildPublicAssetUrl(requestId: string, assetIndex: number) {
  const path = `/v1/files/${encodeURIComponent(requestId)}/assets/${assetIndex}`;
  return env.GATEWAY_PUBLIC_BASE_URL ? new URL(path, env.GATEWAY_PUBLIC_BASE_URL).toString() : path;
}

function parseDataUri(value: string) {
  const match = value.match(/^data:([^;,]+);base64,(.*)$/s);
  if (!match?.[1] || !match?.[2]) {
    return null;
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function hasPrefix(buffer: Buffer, bytes: number[]) {
  if (buffer.length < bytes.length) {
    return false;
  }
  return bytes.every((value, index) => buffer[index] === value);
}

function looksLikeValidBinary(buffer: Buffer, mimeType: string | null) {
  if (buffer.length < MIN_VALID_BINARY_BYTES) {
    return false;
  }

  if (!mimeType) {
    return true;
  }

  const normalizedMime = mimeType.toLowerCase();
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

async function cacheAsset(input: {
  requestId: string;
  assetIndex: number;
  url: string;
  mimeType?: string;
  storageConfig: AssetStorageConfig;
}): Promise<{ cached: CachedAsset | null; integrity: AssetIntegrity }> {
  const dataUri = parseDataUri(input.url);
  let buffer: Buffer | null = dataUri?.buffer ?? null;
  let mimeType = dataUri?.mimeType ?? input.mimeType ?? null;

  if (!buffer && (input.url.startsWith("https://") || input.url.startsWith("http://"))) {
    const response = await fetch(input.url);
    if (!response.ok) {
      return {
        cached: null,
        integrity: {
          status: "invalid",
          reason: `upstream_fetch_not_ok_${response.status}`,
        },
      };
    }
    buffer = Buffer.from(await response.arrayBuffer());
    mimeType = response.headers.get("content-type")?.split(";")[0] ?? mimeType;
  }

  if (!buffer) {
    return {
      cached: null,
      integrity: {
        status: "invalid",
        reason: "asset_buffer_missing",
      },
    };
  }

  if (!looksLikeValidBinary(buffer, mimeType)) {
    return {
      cached: null,
      integrity: {
        status: "invalid",
        reason: "asset_binary_signature_mismatch",
      },
    };
  }

  const storagePath = buildAssetCachePath(input.requestId, input.assetIndex, mimeType);
  const storageBucket = getAssetStorageBucket(input.storageConfig, "output");
  const { error } = await supabaseAdmin.storage
    .from(storageBucket)
    .upload(storagePath, buffer, {
      contentType: mimeType ?? "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    cached: {
      url: buildPublicAssetUrl(input.requestId, input.assetIndex),
      storageBucket,
      storagePath,
      mimeType,
      sizeBytes: buffer.byteLength,
    },
    integrity: {
      status: "valid",
      reason: "asset_binary_validated",
    },
  };
}

export async function persistGeneratedAssets(input: PersistAssetInput) {
  const assets = Array.isArray(input.output.assets) ? input.output.assets : [];
  const storageConfig = parseAssetStorageConfig(input.executionConfig);

  if (assets.length === 0) {
    return input.output;
  }

  const nextAssets: unknown[] = [];
  const rows = [];
  const checkedAt = new Date().toISOString();

  for (const [index, asset] of assets.entries()) {
    if (
      typeof asset !== "object" ||
      asset === null ||
      !("url" in asset) ||
      typeof (asset as { url?: unknown }).url !== "string"
    ) {
      nextAssets.push(asset);
      continue;
    }

    const assetRecord = asset as Record<string, unknown> & { url: string; type?: string };
    const { cached, integrity } = await cacheAsset({
      requestId: input.requestId,
      assetIndex: index,
      url: assetRecord.url,
      mimeType: typeof assetRecord.mimeType === "string" ? assetRecord.mimeType : undefined,
      storageConfig,
    });
    if (integrity.status === "invalid") {
      throw new AssetIntegrityError({
        assetIndex: index,
        reasonCode: integrity.reason,
      });
    }
    const storedUrl = cached?.url ?? assetRecord.url;
    nextAssets.push({
      ...assetRecord,
      url: storedUrl,
      sourceUrl: typeof assetRecord.sourceUrl === "string" ? assetRecord.sourceUrl : assetRecord.url,
      ...(cached?.mimeType ? { mimeType: cached.mimeType } : {}),
    });
    rows.push({
      request_id: input.requestId,
      workspace_id: input.workspaceId,
      asset_type: assetRecord.type === "video" ? "video" : "image",
      storage_bucket: cached?.storageBucket ?? null,
      storage_path: cached?.storagePath ?? null,
      source_url: typeof assetRecord.sourceUrl === "string" ? assetRecord.sourceUrl : assetRecord.url,
      mime_type: cached?.mimeType ?? (typeof assetRecord.mimeType === "string" ? assetRecord.mimeType : null),
      size_bytes: cached?.sizeBytes ?? null,
      duration_ms:
        assetRecord.type === "video" ? resolveAssetDurationMs(assetRecord, input.output) : null,
      metadata: {
        output: input.output,
        assetIntegrity: {
          ...integrity,
          checkedAt,
          assetIndex: index,
        },
      },
    });
  }

  const output = {
    ...input.output,
    assets: nextAssets,
  };

  if (rows.length === 0) {
    return output;
  }

  const { error } = await supabaseAdmin.from("generated_assets").insert(rows);
  if (error) {
    throw new Error(error.message);
  }

  return output;
}
