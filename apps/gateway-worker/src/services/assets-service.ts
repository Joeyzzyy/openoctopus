import { supabaseAdmin } from "../lib/supabase.js";

type PersistAssetInput = {
  requestId: string;
  workspaceId: string;
  output: Record<string, unknown>;
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

export async function persistGeneratedAssets(input: PersistAssetInput) {
  const assets = Array.isArray(input.output.assets) ? input.output.assets : [];

  if (assets.length === 0) {
    return;
  }

  const rows = assets
    .filter(
      (asset): asset is Record<string, unknown> & { url: string; type?: string } =>
        typeof asset === "object" &&
        asset !== null &&
        "url" in asset &&
        typeof (asset as { url?: unknown }).url === "string"
    )
    .map((asset) => ({
      request_id: input.requestId,
      workspace_id: input.workspaceId,
      asset_type: asset.type === "video" ? "video" : "image",
      source_url: asset.url,
      duration_ms:
        asset.type === "video" ? resolveAssetDurationMs(asset, input.output) : null,
      metadata: input.output,
    }));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabaseAdmin.from("generated_assets").insert(rows);
  if (error) {
    throw new Error(error.message);
  }
}
