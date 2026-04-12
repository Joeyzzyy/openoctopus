import { z } from "zod";

const currencySchema = z.string().trim().min(3).max(8).default("USD");
const positivePriceSchema = z.coerce.number().positive().max(1000000);

const hybridChargesSchema = z
  .object({
    perRequest: positivePriceSchema.optional(),
    perImage: positivePriceSchema.optional(),
    perVideo: positivePriceSchema.optional(),
    perSecond: positivePriceSchema.optional(),
    inputTextTokensPerMillion: positivePriceSchema.optional(),
    outputTextTokensPerMillion: positivePriceSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!Object.values(value).some((item) => item !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one hybrid billing charge is required",
      });
    }
  });

const billingConfigSchema = z.union([
  z.object({
    billingMode: z.literal("hybrid"),
    currency: currencySchema,
    charges: hybridChargesSchema,
  }),
  z.object({
    billingMode: z.literal("per_request"),
    currency: currencySchema,
    costPerRequest: positivePriceSchema,
  }),
  z.object({
    billingMode: z.literal("per_image"),
    currency: currencySchema,
    costPerImage: positivePriceSchema,
  }),
  z.object({
    billingMode: z.literal("per_video"),
    currency: currencySchema,
    costPerVideo: positivePriceSchema,
  }),
  z.object({
    billingMode: z.literal("per_second"),
    currency: currencySchema,
    costPerSecond: positivePriceSchema,
  }),
  z.object({
    billingMode: z.literal("per_million_tokens"),
    currency: currencySchema,
    inputCostPerMillion: positivePriceSchema,
    outputCostPerMillion: positivePriceSchema,
  }),
]);

export type BillingConfig = z.infer<typeof billingConfigSchema>;
export type HybridBillingConfig = Extract<BillingConfig, { billingMode: "hybrid" }>;
export type BillingUsageMetrics = {
  requestCount: number;
  imageCount: number;
  videoCount: number;
  durationSeconds: number;
  inputTokens: number;
  outputTokens: number;
};

export type BillingResolution = {
  currency: string;
  total: number;
  components: {
    perRequest: number;
    perImage: number;
    perVideo: number;
    perSecond: number;
    inputTextTokens: number;
    outputTextTokens: number;
  };
  metrics: BillingUsageMetrics;
};

type ResolveChargeContext = {
  config: BillingConfig;
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumericCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getNestedNumber(source: Record<string, unknown> | null, path: string[]) {
  let current: unknown = source;
  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return null;
    }
    current = record[key];
  }

  return readNumericCandidate(current);
}

function countGeneratedAssets(output: Record<string, unknown> | null, type?: "image" | "video") {
  const assets = Array.isArray(output?.assets) ? output.assets : [];
  const filtered = type
    ? assets.filter((asset) => asRecord(asset)?.type === type)
    : assets;
  return filtered.length;
}

function resolveRequestedAssetCount(
  input: Record<string, unknown> | null,
  type: "image" | "video"
) {
  if (!input) {
    return 0;
  }

  if (type === "image") {
    return (
      readNumericCandidate(input.n) ??
      readNumericCandidate(input.imageCount) ??
      readNumericCandidate(input.images) ??
      0
    );
  }

  return (
    readNumericCandidate(input.videoCount) ??
    readNumericCandidate(input.videos) ??
    1
  );
}

function resolveDurationSeconds(
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null,
  raw: Record<string, unknown> | null
) {
  return (
    readNumericCandidate(input?.duration) ??
    readNumericCandidate(input?.durationSeconds) ??
    getNestedNumber(output, ["durationSeconds"]) ??
    getNestedNumber(raw, ["durationSeconds"]) ??
    getNestedNumber(raw, ["duration_seconds"]) ??
    0
  );
}

function resolveTokenUsage(
  input: Record<string, unknown> | null,
  output: Record<string, unknown> | null,
  raw: Record<string, unknown> | null
) {
  const usageMetadata =
    asRecord(raw?.usageMetadata) ??
    asRecord(raw?.usage_metadata) ??
    asRecord(output?.usageMetadata) ??
    asRecord(output?.usage_metadata);

  const inputTokens =
    getNestedNumber(usageMetadata, ["promptTokenCount"]) ??
    getNestedNumber(usageMetadata, ["prompt_token_count"]) ??
    getNestedNumber(usageMetadata, ["inputTokens"]) ??
    getNestedNumber(usageMetadata, ["input_tokens"]) ??
    readNumericCandidate(input?.inputTokens) ??
    readNumericCandidate(input?.promptTokens) ??
    0;

  const outputTokens =
    getNestedNumber(usageMetadata, ["candidatesTokenCount"]) ??
    getNestedNumber(usageMetadata, ["candidates_token_count"]) ??
    getNestedNumber(usageMetadata, ["outputTokens"]) ??
    getNestedNumber(usageMetadata, ["output_tokens"]) ??
    readNumericCandidate(output?.outputTokens) ??
    readNumericCandidate(input?.outputTokens) ??
    readNumericCandidate(input?.completionTokens) ??
    0;

  return { inputTokens, outputTokens };
}

function applyLegacyBillingAliases(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return value;
  }

  const billingMode = record.billingMode;
  const costPerUnit = record.costPerUnit;
  if (typeof billingMode !== "string" || costPerUnit === undefined) {
    return value;
  }

  if (billingMode === "per_request" && record.costPerRequest === undefined) {
    return { ...record, costPerRequest: costPerUnit };
  }

  if (billingMode === "per_image" && record.costPerImage === undefined) {
    return { ...record, costPerImage: costPerUnit };
  }

  if (billingMode === "per_video" && record.costPerVideo === undefined) {
    return { ...record, costPerVideo: costPerUnit };
  }

  if (billingMode === "per_second" && record.costPerSecond === undefined) {
    return { ...record, costPerSecond: costPerUnit };
  }

  return value;
}

export function parseBillingConfig(value: unknown) {
  return billingConfigSchema.parse(applyLegacyBillingAliases(value));
}

export function normalizeBillingConfig(config: BillingConfig): HybridBillingConfig {
  switch (config.billingMode) {
    case "hybrid":
      return config;
    case "per_request":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: { perRequest: config.costPerRequest },
      };
    case "per_image":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: { perImage: config.costPerImage },
      };
    case "per_video":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: { perVideo: config.costPerVideo },
      };
    case "per_second":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: { perSecond: config.costPerSecond },
      };
    case "per_million_tokens":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: {
          inputTextTokensPerMillion: config.inputCostPerMillion,
          outputTextTokensPerMillion: config.outputCostPerMillion,
        },
      };
  }
}

export function resolveBillingMetrics(input: {
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}): BillingUsageMetrics {
  const requestInput = input.requestInput ?? null;
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;
  const usage = resolveTokenUsage(requestInput, output, providerRaw);
  const generatedImageCount = countGeneratedAssets(output, "image");
  const generatedVideoCount = countGeneratedAssets(output, "video");

  return {
    requestCount: 1,
    imageCount:
      generatedImageCount ||
      (generatedVideoCount > 0 ? 0 : resolveRequestedAssetCount(requestInput, "image")),
    videoCount:
      generatedVideoCount ||
      (generatedImageCount > 0 ? 0 : resolveRequestedAssetCount(requestInput, "video")),
    durationSeconds: resolveDurationSeconds(requestInput, output, providerRaw),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
  };
}

export function resolveBillingBreakdown(input: ResolveChargeContext): BillingResolution {
  const config = normalizeBillingConfig(input.config);
  const metrics = resolveBillingMetrics(input);
  const components = {
    perRequest: config.charges.perRequest ?? 0,
    perImage: metrics.imageCount * (config.charges.perImage ?? 0),
    perVideo: metrics.videoCount * (config.charges.perVideo ?? 0),
    perSecond: metrics.durationSeconds * (config.charges.perSecond ?? 0),
    inputTextTokens:
      (metrics.inputTokens / 1_000_000) * (config.charges.inputTextTokensPerMillion ?? 0),
    outputTextTokens:
      (metrics.outputTokens / 1_000_000) * (config.charges.outputTextTokensPerMillion ?? 0),
  };

  return {
    currency: config.currency,
    total: Object.values(components).reduce((sum, value) => sum + value, 0),
    components,
    metrics,
  };
}

export function resolveChargeFromBilling(input: ResolveChargeContext) {
  return resolveBillingBreakdown(input).total;
}
