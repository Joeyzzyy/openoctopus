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

test("charges image requests with resolution and quality combination prices", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {},
    parameterPrices: {
      combinations: {
        "1k__low": 0.01,
        "1k__medium": 0.06,
        "2k__medium": 0.12,
      },
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    requestInput: {
      resolution: "2k",
      quality: "medium",
      num_images: 3,
    },
  });

  assert.equal(resolution.metrics.imageCount, 3);
  assert.equal(resolution.components.perImage, 0.36);
  assert.equal(resolution.total, 0.36);
});

test("falls back to the lowest combination price when parameters are missing", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {},
    parameterPrices: {
      combinations: {
        "1k__low": 0.01,
        "4k__high": 0.66,
      },
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    requestInput: {},
  });

  assert.equal(resolution.metrics.imageCount, 1);
  assert.equal(resolution.components.perImage, 0.01);
  assert.equal(resolution.total, 0.01);
});
