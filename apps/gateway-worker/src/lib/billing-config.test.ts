import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBillingConfig,
  resolveBillingBreakdown,
} from "./billing-config.js";

const perSecondConfig = parseBillingConfig({
  billingMode: "hybrid",
  currency: "USD",
  charges: {
    perSecond: 0.5,
  },
});

test("charges video requests by request input duration when provider data is absent", () => {
  const resolution = resolveBillingBreakdown({
    config: perSecondConfig,
    requestInput: {
      duration: 8,
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });

  assert.equal(resolution.metrics.videoCount, 1);
  assert.equal(resolution.metrics.durationSeconds, 8);
  assert.equal(resolution.components.perSecond, 4);
  assert.equal(resolution.total, 4);
});

test("prefers normalized output duration for per-second billing", () => {
  const resolution = resolveBillingBreakdown({
    config: perSecondConfig,
    requestInput: {
      duration: 6,
    },
    output: {
      durationSeconds: 10,
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });

  assert.equal(resolution.metrics.durationSeconds, 10);
  assert.equal(resolution.components.perSecond, 5);
  assert.equal(resolution.total, 5);
});

test("falls back to provider raw duration_seconds when output does not include duration", () => {
  const resolution = resolveBillingBreakdown({
    config: perSecondConfig,
    requestInput: {
      duration: 5,
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
    providerRaw: {
      duration_seconds: 12,
    },
  });

  assert.equal(resolution.metrics.durationSeconds, 12);
  assert.equal(resolution.components.perSecond, 6);
  assert.equal(resolution.total, 6);
});
