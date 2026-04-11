import "server-only";

import crypto from "node:crypto";

const ENCRYPTION_KEY_BYTES = 32;
const IV_BYTES = 12;
const ALGORITHM = "aes-256-gcm";

type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
  version: number;
  mask: string;
};

function getEncryptionKey() {
  const raw = process.env.INTERNAL_SECRET_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Missing INTERNAL_SECRET_ENCRYPTION_KEY");
  }

  const normalized = raw.trim();
  const key = Buffer.from(normalized, "base64");

  if (key.length !== ENCRYPTION_KEY_BYTES) {
    throw new Error("INTERNAL_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (trimmed.length <= 8) {
    return `${trimmed.slice(0, 2)}••••${trimmed.slice(-2)}`;
  }

  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function encryptProviderSecret(value: string): EncryptedSecret {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Secret cannot be empty");
  }

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    version: 1,
    mask: maskSecret(normalized),
  };
}
