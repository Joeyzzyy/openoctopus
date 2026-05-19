import { NextResponse } from "next/server";
import { z } from "zod";
import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";
import { getAuthedWorkspaceForPlayground } from "@/lib/playground-key-server";
import { createAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  model: z.string().trim().min(1),
});

const deleteSchema = z.object({
  requestId: z.string().uuid(),
});

type HistoryImageAsset = {
  url: string;
  mimeType: string;
  prompt: string | null;
  createdAt: string;
  requestId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractPromptText(requestRow: Record<string, unknown>) {
  const normalizedParams = isRecord(requestRow.normalized_params) ? requestRow.normalized_params : null;
  const inputPayload = isRecord(requestRow.input_payload) ? requestRow.input_payload : null;
  const normalizedPrompt = normalizedParams?.prompt;
  if (typeof normalizedPrompt === "string" && normalizedPrompt.trim().length > 0) {
    return normalizedPrompt.trim();
  }
  const inputPrompt = inputPayload?.prompt;
  if (typeof inputPrompt === "string" && inputPrompt.trim().length > 0) {
    return inputPrompt.trim();
  }
  return null;
}

function normalizeAssetUrl(value: string, mimeType: string) {
  const text = value.trim();
  if (text.startsWith("http://") || text.startsWith("https://")) {
    try {
      const url = new URL(text);
      if (url.pathname.startsWith("/v1/files/")) {
        url.searchParams.set("display", "1");
        return url.toString();
      }
    } catch {
      return text;
    }
    return text;
  }
  if (text.startsWith("/v1/files/")) {
    try {
      const url = new URL(text, PUBLIC_API_BASE_URL);
      url.searchParams.set("display", "1");
      return url.toString();
    } catch {
      return text;
    }
  }
  if (text.startsWith("data:image/")) {
    return text;
  }
  if (
    text.startsWith("iVBORw0KGgo") ||
    text.startsWith("/9j/") ||
    text.startsWith("R0lGOD") ||
    text.startsWith("UklGR")
  ) {
    return `data:${mimeType};base64,${text}`;
  }
  return text;
}

function extractImageAssetsFromRequest(requestRow: Record<string, unknown>) {
  const outputPayload = isRecord(requestRow.output_payload) ? requestRow.output_payload : null;
  const assets = Array.isArray(outputPayload?.assets) ? outputPayload.assets : [];
  const prompt = extractPromptText(requestRow);
  const createdAt =
    typeof requestRow.created_at === "string" && requestRow.created_at.trim().length > 0
      ? requestRow.created_at
      : new Date(0).toISOString();
  const requestId = typeof requestRow.id === "string" ? requestRow.id : "";

  return assets.flatMap((asset) => {
    if (!isRecord(asset)) return [];
    const type = typeof asset.type === "string" ? asset.type.toLowerCase() : "";
    const mimeType =
      typeof asset.mimeType === "string" && asset.mimeType.startsWith("image/")
        ? asset.mimeType
        : type === "image"
          ? "image/png"
          : "";
    const rawUrl =
      typeof asset.url === "string"
        ? asset.url
        : typeof asset.sourceUrl === "string"
          ? asset.sourceUrl
          : "";

    if (!mimeType || rawUrl.trim().length === 0) {
      return [];
    }

    return [
      {
        url: normalizeAssetUrl(rawUrl, mimeType),
        mimeType,
        prompt,
        createdAt,
        requestId,
      } satisfies HistoryImageAsset,
    ];
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.parse({
      model: url.searchParams.get("model"),
    });
    const { workspaceId, userId } = await getAuthedWorkspaceForPlayground();
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("inference_requests")
      .select("id, created_at, output_payload, normalized_params, input_payload")
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("public_model_slug", parsed.model)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw new Error(error.message);
    }

    const deduped = new Map<string, HistoryImageAsset>();
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      for (const asset of extractImageAssetsFromRequest(row)) {
        if (!deduped.has(asset.url)) {
          deduped.set(asset.url, asset);
        }
      }
    }

    return NextResponse.json({
      images: Array.from(deduped.values()),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: { message: "Authentication is required." } }, { status: 401 });
    }
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to load history images" } },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const parsed = deleteSchema.parse(body);
    const { workspaceId, userId } = await getAuthedWorkspaceForPlayground();
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("inference_requests")
      .delete()
      .eq("id", parsed.requestId)
      .eq("workspace_id", workspaceId)
      .eq("user_id", userId)
      .eq("request_source", "playground");

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: { message: "Authentication is required." } }, { status: 401 });
    }
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to delete history image" } },
      { status: 400 }
    );
  }
}
