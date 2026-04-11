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
  return filtered.length > 0 ? filtered.length : 0;
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

function resolveTokenUsage(input: Record<string, unknown> | null, raw: Record<string, unknown> | null) {
  const usageMetadata = asRecord(raw?.usageMetadata) ?? asRecord(raw?.usage_metadata);

  const inputTokens =
    getNestedNumber(usageMetadata, ["promptTokenCount"]) ??
    getNestedNumber(usageMetadata, ["prompt_token_count"]) ??
    readNumericCandidate(input?.inputTokens) ??
    readNumericCandidate(input?.promptTokens) ??
    0;

  const outputTokens =
    getNestedNumber(usageMetadata, ["candidatesTokenCount"]) ??
    getNestedNumber(usageMetadata, ["candidates_token_count"]) ??
    readNumericCandidate(input?.outputTokens) ??
    readNumericCandidate(input?.completionTokens) ??
    0;

  return { inputTokens, outputTokens };
}

export function parseBillingConfig(value: unknown) {
  return billingConfigSchema.parse(value);
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

export function resolveChargeFromBilling(input: ResolveChargeContext) {
  const requestInput = input.requestInput ?? null;
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;
  const config = normalizeBillingConfig(input.config);
  const usage = resolveTokenUsage(requestInput, providerRaw);
  const durationSeconds = resolveDurationSeconds(requestInput, output, providerRaw);
  const imageCount = countGeneratedAssets(output, "image");
  const videoCount = countGeneratedAssets(output, "video");

  let total = 0;
  total += config.charges.perRequest ?? 0;
  total += imageCount * (config.charges.perImage ?? 0);
  total += videoCount * (config.charges.perVideo ?? 0);
  total += durationSeconds * (config.charges.perSecond ?? 0);
  total += (usage.inputTokens / 1_000_000) * (config.charges.inputTextTokensPerMillion ?? 0);
  total += (usage.outputTokens / 1_000_000) * (config.charges.outputTextTokensPerMillion ?? 0);

  return total;
}
