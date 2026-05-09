import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupportedProviderAdapterSlug,
  pickRuntimeCredential,
} from "./provider-runtime-guard.js";

test("recognizes worker provider adapter aliases", () => {
  assert.equal(isSupportedProviderAdapterSlug("gemini-direct"), true);
  assert.equal(isSupportedProviderAdapterSlug("gemini-veo"), true);
  assert.equal(isSupportedProviderAdapterSlug("unknown-provider"), false);
});

test("prefers runnable production managed credentials", () => {
  const selected = pickRuntimeCredential([
    {
      id: "staging",
      secret_source: "internal_encrypted",
      environment: "staging",
      is_active: true,
      has_encrypted_secret_material: true,
    },
    {
      id: "production",
      secret_source: "internal_encrypted",
      environment: "production",
      is_active: true,
      has_encrypted_secret_material: true,
    },
  ]);

  assert.equal(selected?.id, "production");
});

test("rejects legacy or incomplete credentials", () => {
  const selected = pickRuntimeCredential([
    {
      id: "legacy",
      secret_source: "env_ref",
      environment: "production",
      is_active: true,
      has_encrypted_secret_material: false,
    },
    {
      id: "incomplete",
      secret_source: "internal_encrypted",
      environment: "production",
      is_active: true,
      has_encrypted_secret_material: false,
    },
  ]);

  assert.equal(selected, null);
});
