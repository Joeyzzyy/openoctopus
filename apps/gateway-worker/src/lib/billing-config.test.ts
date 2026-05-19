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

test("adds boolean parameter surcharges when request input enables them", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {
      perRequest: 0.03,
    },
    parameterPrices: {
      booleanSurcharges: {
        enable_web_search: 0.02,
        enable_image_search: 0.04,
      },
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    requestInput: {
      enable_web_search: true,
      enable_image_search: false,
    },
  });

  assert.equal(resolution.components.perRequest, 0.03);
  assert.equal(resolution.components.booleanSurcharges, 0.02);
  assert.equal(resolution.total, 0.05);
});

test("treats generate_audio as alias for hasAudio boolean surcharge", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {
      perVideo: 1.2,
    },
    parameterPrices: {
      booleanSurcharges: {
        hasAudio: 0.4,
      },
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    requestInput: {
      generate_audio: true,
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });

  assert.equal(resolution.components.perVideo, 1.2);
  assert.equal(resolution.components.booleanSurcharges, 0.4);
  assert.equal(resolution.total, 1.6);
});

test("treats reference_videos as optional and does not add surcharge when omitted", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {
      perVideo: 1.2,
    },
    parameterPrices: {
      booleanSurcharges: {
        hasReferenceVideos: 0.5,
      },
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    requestInput: {},
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });

  assert.equal(resolution.components.perVideo, 1.2);
  assert.equal(resolution.components.booleanSurcharges, 0);
  assert.equal(resolution.total, 1.2);
});

test("treats reference_videos array as alias for hasReferenceVideos surcharge", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {
      perVideo: 1.2,
    },
    parameterPrices: {
      booleanSurcharges: {
        hasReferenceVideos: 0.5,
      },
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    requestInput: {
      reference_videos: ["https://example.com/reference.mp4"],
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });

  assert.equal(resolution.components.perVideo, 1.2);
  assert.equal(resolution.components.booleanSurcharges, 0.5);
  assert.equal(resolution.total, 1.7);
});

test("supports named combination pricing with reference videos and audio dimensions", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {},
    parameterPrices: {
      combinations: {
        "resolution=720p__duration=5__hasReferenceVideos=false__hasAudio=false": 0.6,
        "resolution=720p__duration=5__hasReferenceVideos=true__hasAudio=false": 0.9,
        "resolution=720p__duration=5__hasReferenceVideos=true__hasAudio=true": 1.1,
      },
    },
  });

  const withoutReferences = resolveBillingBreakdown({
    config,
    requestInput: {
      resolution: "720p",
      duration: 5,
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });
  assert.equal(withoutReferences.components.perVideo, 0.6);

  const withReferenceVideos = resolveBillingBreakdown({
    config,
    requestInput: {
      resolution: "720p",
      duration: 5,
      reference_videos: ["https://example.com/reference.mp4"],
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });
  assert.equal(withReferenceVideos.components.perVideo, 0.9);

  const withReferenceVideosAndAudio = resolveBillingBreakdown({
    config,
    requestInput: {
      resolution: "720p",
      duration: 5,
      reference_videos: ["https://example.com/reference.mp4"],
      generate_audio: true,
    },
    output: {
      assets: [{ type: "video", url: "https://example.com/video.mp4" }],
    },
  });
  assert.equal(withReferenceVideosAndAudio.components.perVideo, 1.1);
});

test("charges cache hit, cache miss, and output tokens separately when configured", () => {
  const config = parseBillingConfig({
    billingMode: "hybrid",
    currency: "USD",
    charges: {
      inputTextCacheHitTokensPerMillion: 0.003625,
      inputTextCacheMissTokensPerMillion: 0.435,
      outputTextTokensPerMillion: 0.87,
    },
  });

  const resolution = resolveBillingBreakdown({
    config,
    providerRaw: {
      usage: {
        prompt_tokens: 1_000_000,
        completion_tokens: 200_000,
      },
      usageMetadata: {
        promptTokensDetails: {
          cachedTokens: 400_000,
        },
      },
    },
  });

  assert.equal(resolution.metrics.inputTokens, 1_000_000);
  assert.equal(resolution.metrics.inputCacheHitTokens, 400_000);
  assert.equal(resolution.metrics.inputCacheMissTokens, 600_000);
  assert.equal(resolution.metrics.outputTokens, 200_000);
  assert.ok(Math.abs(resolution.components.inputTextCacheHitTokens - 0.00145) < 1e-12);
  assert.ok(Math.abs(resolution.components.inputTextCacheMissTokens - 0.261) < 1e-12);
  assert.ok(Math.abs(resolution.components.outputTextTokens - 0.174) < 1e-12);
  assert.ok(Math.abs(resolution.total - 0.43645) < 1e-12);
});

test("rejects billing configs that combine standard input token pricing with cache-aware input token pricing", () => {
  assert.throws(
    () =>
      parseBillingConfig({
        billingMode: "hybrid",
        currency: "USD",
        charges: {
          inputTextTokensPerMillion: 0.14,
          inputTextCacheHitTokensPerMillion: 0.003625,
          inputTextCacheMissTokensPerMillion: 0.435,
        },
      }),
    /cannot be combined/i
  );
});
