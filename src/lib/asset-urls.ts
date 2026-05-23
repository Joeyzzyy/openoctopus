import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";

export function normalizeGatewayFileAssetUrl(
  value: string,
  options?: {
    apiBaseUrl?: string | null;
    ensureDisplay?: boolean;
  }
) {
  const text = value.trim();
  if (!text) return text;

  const apiBaseUrl = options?.apiBaseUrl?.trim() || PUBLIC_API_BASE_URL;
  const ensureDisplay = options?.ensureDisplay ?? true;

  try {
    const url =
      text.startsWith("/v1/files/")
        ? new URL(text, apiBaseUrl)
        : text.startsWith("http://") || text.startsWith("https://")
          ? new URL(text)
          : null;

    if (!url || !url.pathname.startsWith("/v1/files/")) {
      return text;
    }

    const normalized = new URL(`${url.pathname}${url.search}`, apiBaseUrl);
    if (ensureDisplay) {
      normalized.searchParams.set("display", "1");
    }
    return normalized.toString();
  } catch {
    return text;
  }
}
