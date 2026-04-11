import crypto from "node:crypto";
import { env } from "../config.js";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const key = Buffer.from(env.INTERNAL_SECRET_ENCRYPTION_KEY.trim(), "base64");
  if (key.length !== 32) {
    throw new Error("INTERNAL_SECRET_ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  }

  return key;
}

export function decryptProviderSecret(input: {
  ciphertext: string;
  iv: string;
  authTag: string;
}) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getEncryptionKey(),
    Buffer.from(input.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");

  if (!plaintext) {
    throw new Error("Provider credential secret is empty after decryption");
  }

  return plaintext;
}
