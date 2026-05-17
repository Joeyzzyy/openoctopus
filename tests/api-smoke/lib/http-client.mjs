const DEFAULT_BASE_URL = "https://api.openoctopus.com";

export function getApiBaseUrl() {
  return (process.env.OPENOCTOPUS_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

export function getApiKey() {
  const apiKey = process.env.OPENOCTOPUS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing OPENOCTOPUS_API_KEY. Pass a customer API key through the environment.");
  }
  return apiKey;
}

export function getKeyPrefix(apiKey) {
  if (!apiKey) return "unknown";
  return apiKey.length <= 10 ? `${apiKey.slice(0, 3)}...` : `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}`;
}

export async function requestJson({ method = "GET", path, body, apiKey, baseUrl }) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${apiKey}`,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }
  return { response, json };
}
