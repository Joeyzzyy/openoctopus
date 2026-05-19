function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPath(source: unknown, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }
    if (!isRecord(current) || !(key in current)) {
      return null;
    }
    current = current[key];
  }
  return current ?? null;
}

function inferImageMimeType(
  raw: Record<string, unknown> | null,
  assetUrl: string,
  preferredMimeType?: string
) {
  if (preferredMimeType?.trim()) {
    const value = preferredMimeType.trim();
    return value.includes("/") ? value : `image/${value}`;
  }

  const fromRaw =
    readPath(raw, ["data", "0", "mime_type"]) ??
    readPath(raw, ["data", "0", "mimeType"]) ??
    readPath(raw, ["data", "output_format"]) ??
    readPath(raw, ["input", "output_format"]) ??
    readPath(raw, ["output_format"]);
  if (typeof fromRaw === "string" && fromRaw.trim().length > 0) {
    const value = fromRaw.trim();
    if (value.includes("/")) {
      return value;
    }
    return `image/${value}`;
  }

  if (assetUrl.startsWith("data:")) {
    const match = assetUrl.match(/^data:([^;,]+)[;,]/i);
    if (match?.[1]) {
      return match[1];
    }
  }

  try {
    const pathname = assetUrl.startsWith("http://") || assetUrl.startsWith("https://")
      ? new URL(assetUrl).pathname
      : assetUrl;
    const extension = pathname.split("?")[0]?.split(".").pop()?.toLowerCase();
    if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
    if (extension === "png") return "image/png";
    if (extension === "webp") return "image/webp";
    if (extension === "gif") return "image/gif";
  } catch {
    // Fall back to the default below.
  }

  return "image/png";
}

function looksLikeBase64Image(value: string) {
  const text = value.trim();
  if (text.startsWith("iVBORw0KGgo")) return true;
  if (text.startsWith("/9j/")) return true;
  if (text.startsWith("R0lGOD")) return true;
  if (text.startsWith("UklGR")) return true;
  return text.length > 256 && /^[A-Za-z0-9+/]+={0,2}$/.test(text);
}

function normalizeImageAssetUrl(url: string, mimeType: string) {
  const text = url.trim();
  if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:image/") || text.startsWith("/v1/files/")) {
    return text;
  }
  if (looksLikeBase64Image(text)) {
    return `data:${mimeType};base64,${text}`;
  }
  return text;
}

function readUpstreamSourceUrl(raw: Record<string, unknown> | null) {
  if (!raw) return undefined;
  const candidates = [
    readPath(raw, ["data", "urls", "get"]),
    readPath(raw, ["urls", "get"]),
    readPath(raw, ["result", "url"]),
    readPath(raw, ["response", "outputUrl"]),
    readPath(raw, ["outputs", "0"]),
    readPath(raw, ["data", "outputs", "0"]),
  ];
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text) continue;
    if (text.startsWith("http://") || text.startsWith("https://") || text.startsWith("data:")) {
      return text;
    }
  }
  return undefined;
}

function resolvePreferredSourceUrl(input: {
  existingSourceUrl?: string;
  raw: Record<string, unknown> | null;
}) {
  const existing = input.existingSourceUrl?.trim();
  const upstream = readUpstreamSourceUrl(input.raw);
  if (!existing) {
    return upstream;
  }
  if (existing.startsWith("data:") && upstream && (upstream.startsWith("http://") || upstream.startsWith("https://"))) {
    return upstream;
  }
  return existing;
}

export function normalizeImageOutputPayload(outputPayload: unknown) {
  const output = isRecord(outputPayload) ? outputPayload : {};
  const raw = isRecord(output.raw) ? output.raw : null;
  const existingAssets = Array.isArray(output.assets) ? output.assets : [];

  const normalizedAssets = (existingAssets.length > 0 ? existingAssets : [null])
    .map((asset, index) => {
      const assetRecord = isRecord(asset) ? asset : null;
      const fallbackUrl =
        typeof readPath(raw, ["data", "0", "url"]) === "string"
          ? (readPath(raw, ["data", "0", "url"]) as string)
          : typeof readPath(raw, ["data", "0", "b64_json"]) === "string"
            ? `data:image/png;base64,${String(readPath(raw, ["data", "0", "b64_json"]))}`
            : typeof readPath(raw, ["candidates", "0", "content", "parts", "0", "inlineData", "data"]) === "string"
              ? `data:${String(readPath(raw, ["candidates", "0", "content", "parts", "0", "inlineData", "mimeType"]) ?? "image/png")};base64,${String(
                  readPath(raw, ["candidates", "0", "content", "parts", "0", "inlineData", "data"])
                )}`
              : null;
      const url =
        typeof assetRecord?.url === "string" && assetRecord.url.length > 0
          ? assetRecord.url
          : fallbackUrl;
      if (!url) {
        return null;
      }

      const sourceUrl = resolvePreferredSourceUrl({
        existingSourceUrl:
          typeof assetRecord?.sourceUrl === "string" && assetRecord.sourceUrl.length > 0
            ? assetRecord.sourceUrl
            : undefined,
        raw,
      });
      const width = Number(readPath(raw, ["data", "0", "width"]) ?? readPath(raw, ["width"]));
      const height = Number(readPath(raw, ["data", "0", "height"]) ?? readPath(raw, ["height"]));
      const mimeType = inferImageMimeType(
        raw,
        url,
        typeof assetRecord?.mimeType === "string" ? assetRecord.mimeType : undefined
      );
      const normalizedUrl = normalizeImageAssetUrl(url, mimeType);

      return {
        id: `${index}`,
        index,
        type: "image",
        url: normalizedUrl,
        ...(sourceUrl ? { sourceUrl } : {}),
        mimeType,
        ...(Number.isFinite(width) && width > 0 ? { width } : {}),
        ...(Number.isFinite(height) && height > 0 ? { height } : {}),
      };
    })
    .filter((item) => item !== null);

  return {
    format: "openoctopus.image.output.v1",
    raw: output.raw ?? null,
    assets: normalizedAssets,
  };
}

export function normalizeVideoOutputPayload(outputPayload: unknown) {
  const output = isRecord(outputPayload) ? outputPayload : {};
  const raw = isRecord(output.raw) ? output.raw : null;
  const existingAssets = Array.isArray(output.assets) ? output.assets : [];

  const normalizedAssets = (existingAssets.length > 0 ? existingAssets : [null])
    .map((asset, index) => {
      const assetRecord = isRecord(asset) ? asset : null;
      const fallbackUrl =
        typeof readPath(raw, ["response", "outputUrl"]) === "string"
          ? (readPath(raw, ["response", "outputUrl"]) as string)
          : typeof readPath(raw, ["result", "url"]) === "string"
            ? (readPath(raw, ["result", "url"]) as string)
            : typeof readPath(raw, ["data", "0", "url"]) === "string"
              ? (readPath(raw, ["data", "0", "url"]) as string)
              : null;
      const url =
        typeof assetRecord?.url === "string" && assetRecord.url.length > 0
          ? assetRecord.url
          : fallbackUrl;
      if (!url) {
        return null;
      }

      const sourceUrl =
        typeof assetRecord?.sourceUrl === "string" && assetRecord.sourceUrl.length > 0
          ? assetRecord.sourceUrl
          : undefined;
      const durationSeconds =
        Number(assetRecord?.durationSeconds ?? assetRecord?.duration_seconds ?? output.durationSeconds ?? output.duration_seconds);
      const mimeType =
        typeof assetRecord?.mimeType === "string" && assetRecord.mimeType.length > 0
          ? assetRecord.mimeType
          : "video/mp4";

      return {
        id: `${index}`,
        index,
        type: "video",
        url,
        ...(sourceUrl ? { sourceUrl } : {}),
        mimeType,
        ...(Number.isFinite(durationSeconds) && durationSeconds > 0 ? { durationSeconds } : {}),
      };
    })
    .filter((item) => item !== null);

  return {
    format: "openoctopus.video.output.v1",
    raw: output.raw ?? null,
    assets: normalizedAssets,
    ...(output.durationSeconds !== undefined ? { durationSeconds: output.durationSeconds } : {}),
    ...(output.duration_seconds !== undefined ? { duration_seconds: output.duration_seconds } : {}),
  };
}

export function normalizeTextOutputPayload(outputPayload: unknown) {
  const output = isRecord(outputPayload) ? outputPayload : {};
  const raw = isRecord(output.raw) ? output.raw : null;
  const text =
    typeof output.text === "string" && output.text.trim().length > 0
      ? output.text
      : typeof readPath(raw, ["text"]) === "string"
        ? (readPath(raw, ["text"]) as string)
        : typeof readPath(raw, ["message", "content"]) === "string"
          ? (readPath(raw, ["message", "content"]) as string)
          : typeof readPath(raw, ["choices", "0", "message", "content"]) === "string"
            ? (readPath(raw, ["choices", "0", "message", "content"]) as string)
            : null;

  return {
    format: "openoctopus.text.output.v1",
    raw: output.raw ?? null,
    ...(text ? { text, message: { role: "assistant", content: text } } : {}),
  };
}

export function normalizeOutputPayloadByCapability(input: {
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
  outputPayload: unknown;
}) {
  if (input.capability === "image_generation" || input.capability === "image_edit") {
    return normalizeImageOutputPayload(input.outputPayload);
  }
  if (input.capability === "video_generation") {
    return normalizeVideoOutputPayload(input.outputPayload);
  }
  if (input.capability === "text_generation") {
    return normalizeTextOutputPayload(input.outputPayload);
  }
  return input.outputPayload;
}
