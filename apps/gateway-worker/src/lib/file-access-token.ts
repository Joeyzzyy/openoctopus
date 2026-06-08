import crypto from "node:crypto";
import { env } from "../config.js";

const TOKEN_TTL_SECONDS = 24 * 60 * 60;

function signPayload(payload: string) {
  return crypto
    .createHmac("sha256", env.OPENOCTOPUS_API_KEY_SALT)
    .update(payload)
    .digest("base64url");
}

export function createFileAccessToken(input: {
  requestId: string;
  assetIndex: number;
  ttlSeconds?: number;
}) {
  const expiresAt = Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? TOKEN_TTL_SECONDS);
  const payload = `${input.requestId}.${input.assetIndex}.${expiresAt}`;
  return `${payload}.${signPayload(payload)}`;
}

export function verifyFileAccessToken(input: {
  token: string | undefined;
  requestId: string;
  assetIndex: number;
}) {
  if (!input.token) {
    return false;
  }

  const parts = input.token.split(".");
  if (parts.length !== 4) {
    return false;
  }

  const [requestId, assetIndexText, expiresAtText, signature] = parts;
  const assetIndex = Number(assetIndexText);
  const expiresAt = Number(expiresAtText);
  if (
    requestId !== input.requestId ||
    assetIndex !== input.assetIndex ||
    !Number.isInteger(assetIndex) ||
    !Number.isFinite(expiresAt) ||
    expiresAt < Math.floor(Date.now() / 1000)
  ) {
    return false;
  }

  const payload = `${requestId}.${assetIndex}.${expiresAt}`;
  const expected = signPayload(payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

export function appendFileAccessToken(url: string, input: { requestId: string; assetIndex: number }) {
  const token = createFileAccessToken(input);
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("token", token);
    return parsed.toString();
  } catch {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}token=${encodeURIComponent(token)}`;
  }
}
