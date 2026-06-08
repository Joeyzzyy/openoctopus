import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";
import { normalizeGatewayFileAssetUrl } from "@/lib/asset-urls";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

type PlaygroundDocumentSentenceScore = {
  text: string;
  score?: number;
  length?: number;
};

export type PlaygroundDocumentAnalysisResult = {
  status?: string;
  humanScore?: number;
  readabilityScore?: number;
  creditsUsed?: number;
  creditsRemaining?: number;
  language?: string;
  version?: string;
  inputType?: string;
  attackDetected?: {
    homoglyphAttack?: boolean;
    zeroWidthSpace?: boolean;
  };
  sentences: PlaygroundDocumentSentenceScore[];
};


function pickImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (
    text.startsWith("/v1/files/") ||
    text.startsWith("https://") ||
    text.startsWith("http://") ||
    text.startsWith("data:image/")
  ) {
    return text;
  }
  if (
    text.startsWith("iVBORw0KGgo") ||
    text.startsWith("/9j/") ||
    text.startsWith("R0lGOD")
  ) {
    return `data:image/png;base64,${text}`;
  }
  if (text.startsWith("UklGR")) {
    return `data:image/webp;base64,${text}`;
  }
  return null;
}

export function imageExtensionFromMimeType(mimeType: string | null | undefined) {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/png") return "png";
  return "png";
}

export function replaceFileExtension(filename: string, extension: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "") + `.${extension}`;
}

export function buildDisplayImageUrl(src: string) {
  if (src.startsWith("data:image/")) return src;
  const normalizedGatewayFileUrl = normalizeGatewayFileAssetUrl(src);
  if (normalizedGatewayFileUrl !== src) {
    return normalizedGatewayFileUrl;
  }
  try {
    const url = src.startsWith("/v1/files/")
      ? new URL(src, PUBLIC_API_BASE_URL)
      : src.startsWith("/")
        ? new URL(src, typeof window !== "undefined" ? window.location.origin : "http://localhost")
      : new URL(src);
    if (url.pathname.startsWith("/v1/files/")) {
      url.searchParams.set("display", "1");
      return url.toString();
    }
  } catch {
    return src;
  }
  return src;
}

export type PlaygroundImageAsset = {
  url: string;
  mimeType?: string;
};

export type PlaygroundVideoAsset = {
  url: string;
  mimeType?: string;
};


export function extractImageAssets(output: unknown): PlaygroundImageAsset[] {
  if (!isRecord(output)) return [];
  const assets: PlaygroundImageAsset[] = [];
  const seen = new Set<string>();
  const pushAsset = (candidate: unknown, mimeType?: unknown) => {
    const resolved = pickImageUrl(candidate);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    assets.push({
      url: resolved,
      ...(typeof mimeType === "string" && mimeType.length > 0 ? { mimeType } : {}),
    });
  };

  const outputAssets = Array.isArray(output.assets) ? output.assets : [];
  for (const item of outputAssets) {
    if (!isRecord(item)) continue;
    if (item.type && item.type !== "image") continue;
    const primaryUrl = pickImageUrl(item.url);
    if (primaryUrl) {
      pushAsset(primaryUrl, item.mimeType);
      continue;
    }
    pushAsset(item.sourceUrl, item.mimeType);
  }

  if (assets.length === 0) {
    const primaryUrl = pickImageUrl(output.url);
    if (primaryUrl) {
      pushAsset(primaryUrl, output.mimeType);
    } else {
      pushAsset(output.sourceUrl, output.mimeType);
    }
  }

  return assets;
}

export function extractVideoAssets(output: unknown): PlaygroundVideoAsset[] {
  if (!isRecord(output)) return [];
  const assets: PlaygroundVideoAsset[] = [];
  const seen = new Set<string>();
  const pushAsset = (candidate: unknown, mimeType?: unknown) => {
    if (typeof candidate !== "string") return;
    const resolved = candidate.trim();
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    assets.push({
      url: resolved,
      ...(typeof mimeType === "string" && mimeType.length > 0 ? { mimeType } : {}),
    });
  };

  const outputAssets = Array.isArray(output.assets) ? output.assets : [];
  for (const item of outputAssets) {
    if (!isRecord(item)) continue;
    if (item.type && item.type !== "video") continue;
    pushAsset(item.url, item.mimeType);
  }

  if (assets.length === 0) {
    pushAsset(output.url, output.mimeType);
  }

  return assets;
}

export function extractTextOutput(output: unknown): string | null {
  if (!isRecord(output)) return null;
  const candidates = [output.text, output.caption, output.description, output.output];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

export function extractDocumentAnalysis(output: unknown): PlaygroundDocumentAnalysisResult | null {
  if (!isRecord(output)) return null;
  const score = isRecord(output.score) ? output.score : null;
  if (!score) return null;

  const sentences = Array.isArray(score.sentences)
    ? score.sentences.flatMap((item) => {
        if (!isRecord(item) || typeof item.text !== "string" || item.text.trim().length === 0) {
          return [];
        }
        return [
          {
            text: item.text.trim(),
            ...(typeof item.score === "number" ? { score: item.score } : {}),
            ...(typeof item.length === "number" ? { length: item.length } : {}),
          },
        ];
      })
    : [];

  const attackDetected = isRecord(score.attack_detected)
    ? {
        ...(typeof score.attack_detected.homoglyph_attack === "boolean"
          ? { homoglyphAttack: score.attack_detected.homoglyph_attack }
          : {}),
        ...(typeof score.attack_detected.zero_width_space === "boolean"
          ? { zeroWidthSpace: score.attack_detected.zero_width_space }
          : {}),
      }
    : undefined;

  return {
    ...(typeof output.status === "string" ? { status: output.status } : {}),
    ...(typeof score.human_score === "number" ? { humanScore: score.human_score } : {}),
    ...(typeof score.readability_score === "number" ? { readabilityScore: score.readability_score } : {}),
    ...(typeof score.credits_used === "number" ? { creditsUsed: score.credits_used } : {}),
    ...(typeof score.credits_remaining === "number" ? { creditsRemaining: score.credits_remaining } : {}),
    ...(typeof score.language === "string" ? { language: score.language } : {}),
    ...(typeof score.version === "string" ? { version: score.version } : {}),
    ...(typeof score.input === "string" ? { inputType: score.input } : {}),
    ...(attackDetected ? { attackDetected } : {}),
    sentences,
  };
}

