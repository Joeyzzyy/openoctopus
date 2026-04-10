import { supabaseAdmin } from "../lib/supabase.js";

type PersistAssetInput = {
  requestId: string;
  workspaceId: string;
  output: Record<string, unknown>;
};

export async function persistGeneratedAssets(input: PersistAssetInput) {
  const assets = Array.isArray(input.output.assets) ? input.output.assets : [];

  if (assets.length === 0) {
    return;
  }

  const rows = assets
    .filter(
      (asset): asset is { url: string; type?: string } =>
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
