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

function inferImageMimeType(raw: Record<string, unknown> | null, assetUrl: string) {
  const fromRaw =
    readPath(raw, ["data", "0", "mime_type"]) ??
    readPath(raw, ["data", "0", "mimeType"]) ??
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

  return "image/png";
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

      const sourceUrl =
        typeof assetRecord?.sourceUrl === "string" && assetRecord.sourceUrl.length > 0
          ? assetRecord.sourceUrl
          : undefined;
      const width = Number(readPath(raw, ["data", "0", "width"]) ?? readPath(raw, ["width"]));
      const height = Number(readPath(raw, ["data", "0", "height"]) ?? readPath(raw, ["height"]));
      const mimeType = inferImageMimeType(raw, url);

      return {
        id: `${index}`,
        index,
        type: "image",
        url,
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

export function normalizeOutputPayloadByCapability(input: {
  capability: "image_generation" | "image_edit" | "video_generation";
  outputPayload: unknown;
}) {
  if (input.capability === "image_generation" || input.capability === "image_edit") {
    return normalizeImageOutputPayload(input.outputPayload);
  }
  return input.outputPayload;
}
