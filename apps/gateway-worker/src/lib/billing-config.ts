import { z } from "zod";

const currencySchema = z.string().trim().min(3).max(8).default("USD");

const billingConfigSchema = z.discriminatedUnion("billingMode", [
  z.object({
    billingMode: z.literal("per_request"),
    currency: currencySchema,
    costPerRequest: z.coerce.number().positive().max(1000000),
  }),
  z.object({
    billingMode: z.literal("per_image"),
    currency: currencySchema,
    costPerImage: z.coerce.number().positive().max(1000000),
  }),
  z.object({
    billingMode: z.literal("per_video"),
    currency: currencySchema,
    costPerVideo: z.coerce.number().positive().max(1000000),
  }),
  z.object({
    billingMode: z.literal("per_second"),
    currency: currencySchema,
    costPerSecond: z.coerce.number().positive().max(1000000),
  }),
  z.object({
    billingMode: z.literal("per_million_tokens"),
    currency: currencySchema,
    inputCostPerMillion: z.coerce.number().positive().max(1000000),
    outputCostPerMillion: z.coerce.number().positive().max(1000000),
  }),
]);

export type BillingConfig = z.infer<typeof billingConfigSchema>;

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

function countGeneratedAssets(output: Record<string, unknown> | null) {
  const assets = Array.isArray(output?.assets) ? output.assets : [];
  return assets.length > 0 ? assets.length : 1;
}

function resolveDurationSeconds(input: Record<string, unknown> | null, output: Record<string, unknown> | null, raw: Record<string, unknown> | null) {
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

export function resolveChargeFromBilling(input: ResolveChargeContext) {
  const requestInput = input.requestInput ?? null;
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;

  switch (input.config.billingMode) {
    case "per_request":
      return input.config.costPerRequest;
    case "per_image":
      return countGeneratedAssets(output) * input.config.costPerImage;
    case "per_video":
      return countGeneratedAssets(output) * input.config.costPerVideo;
    case "per_second":
      return resolveDurationSeconds(requestInput, output, providerRaw) * input.config.costPerSecond;
    case "per_million_tokens": {
      const usage = resolveTokenUsage(requestInput, providerRaw);
      return (
        (usage.inputTokens / 1_000_000) * input.config.inputCostPerMillion +
        (usage.outputTokens / 1_000_000) * input.config.outputCostPerMillion
      );
    }
  }
}
