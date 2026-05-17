function readPath(source: Record<string, unknown>, path: string) {
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current ?? null;
}

function stringifyErrorValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const nestedMessage: string | null =
      stringifyErrorValue(record.message) ??
      stringifyErrorValue(record.error) ??
      stringifyErrorValue(record.detail);
    if (nestedMessage) {
      return nestedMessage;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return null;
}

export function extractUpstreamErrorMessage(
  data: Record<string, unknown>,
  fallback = "Upstream request failed"
) {
  const candidates = [
    readPath(data, "data.error.message"),
    readPath(data, "data.error"),
    readPath(data, "error.message"),
    readPath(data, "error"),
    readPath(data, "message"),
  ];

  for (const candidate of candidates) {
    const message = stringifyErrorValue(candidate);
    if (message) {
      return message;
    }
  }

  return fallback;
}

export function classifyUpstreamError(input: {
  data: Record<string, unknown>;
  fallbackMessage?: string;
}) {
  const message = extractUpstreamErrorMessage(input.data, input.fallbackMessage);
  const normalized = message.toLowerCase();
  const upstreamCode = readPath(input.data, "data.code") ?? readPath(input.data, "code");

  if (
    upstreamCode === 1200 ||
    normalized.includes("content flagged") ||
    normalized.includes("potentially sensitive") ||
    normalized.includes("sensitive content") ||
    normalized.includes("safety") ||
    normalized.includes("policy")
  ) {
    return {
      errorCode: "content_policy_violation",
      errorMessage: message,
    };
  }

  return {
    errorCode: "upstream_failed",
    errorMessage: message,
  };
}
