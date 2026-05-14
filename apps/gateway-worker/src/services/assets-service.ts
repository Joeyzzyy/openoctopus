import { supabaseAdmin } from "../lib/supabase.js";
import { env } from "../config.js";

type PersistAssetInput = {
  requestId: string;
  workspaceId: string;
  output: Record<string, unknown>;
};

type CachedAsset = {
  url: string;
  storageBucket: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
};

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

async function cacheAsset(input: {
  requestId: string;
  assetIndex: number;
  url: string;
  mimeType?: string;
}): Promise<CachedAsset | null> {
  const dataUri = parseDataUri(input.url);
  let buffer: Buffer | null = dataUri?.buffer ?? null;
  let mimeType = dataUri?.mimeType ?? input.mimeType ?? null;

  if (!buffer && (input.url.startsWith("https://") || input.url.startsWith("http://"))) {
    const response = await fetch(input.url);
    if (!response.ok) {
      return null;
    }
    buffer = Buffer.from(await response.arrayBuffer());
    mimeType = response.headers.get("content-type")?.split(";")[0] ?? mimeType;
  }

  if (!buffer) {
    return null;
  }

  const storagePath = buildAssetCachePath(input.requestId, input.assetIndex, mimeType);
  const { error } = await supabaseAdmin.storage
    .from(env.GENERATED_ASSETS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType ?? "application/octet-stream",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return {
    url: buildPublicAssetUrl(input.requestId, input.assetIndex),
    storageBucket: env.GENERATED_ASSETS_BUCKET,
    storagePath,
    mimeType,
    sizeBytes: buffer.byteLength,
  };
}

export async function persistGeneratedAssets(input: PersistAssetInput) {
  const assets = Array.isArray(input.output.assets) ? input.output.assets : [];

  if (assets.length === 0) {
    return input.output;
  }

  const nextAssets: unknown[] = [];
  const rows = [];

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
    const cached = await cacheAsset({
      requestId: input.requestId,
      assetIndex: index,
      url: assetRecord.url,
      mimeType: typeof assetRecord.mimeType === "string" ? assetRecord.mimeType : undefined,
    });
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
      metadata: input.output,
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
