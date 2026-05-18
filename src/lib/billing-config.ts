import { z } from "zod/v4";

const currencySchema = z.string().trim().min(3).max(8).default("USD");
const positivePriceSchema = z.coerce.number().positive().max(1000000);

const perRequestBillingSchema = z.object({
  billingMode: z.literal("per_request"),
  currency: currencySchema,
  costPerRequest: positivePriceSchema,
});

const perImageBillingSchema = z.object({
  billingMode: z.literal("per_image"),
  currency: currencySchema,
  costPerImage: positivePriceSchema,
});

const perVideoBillingSchema = z.object({
  billingMode: z.literal("per_video"),
  currency: currencySchema,
  costPerVideo: positivePriceSchema,
});

const perSecondBillingSchema = z.object({
  billingMode: z.literal("per_second"),
  currency: currencySchema,
  costPerSecond: positivePriceSchema,
});

const perMillionTokensBillingSchema = z.object({
  billingMode: z.literal("per_million_tokens"),
  currency: currencySchema,
  inputCostPerMillion: positivePriceSchema,
  outputCostPerMillion: positivePriceSchema,
});

const hybridChargesSchema = z
  .object({
    perRequest: positivePriceSchema.optional(),
    perImage: positivePriceSchema.optional(),
    perVideo: positivePriceSchema.optional(),
    perSecond: positivePriceSchema.optional(),
    inputTextTokensPerMillion: positivePriceSchema.optional(),
    outputTextTokensPerMillion: positivePriceSchema.optional(),
  })
  .default({});

const parameterMultipliersSchema = z
  .object({
    resolution: z.record(z.string(), z.coerce.number().positive().max(100)).optional(),
    quality: z.record(z.string(), z.coerce.number().positive().max(100)).optional(),
  })
  .optional();

const parameterPricesSchema = z
  .object({
    combinations: z.record(z.string(), z.coerce.number().positive().max(1000000)).optional(),
    booleanSurcharges: z.record(z.string(), z.coerce.number().positive().max(1000000)).optional(),
  })
  .optional();

const hybridBillingSchema = z
  .object({
    billingMode: z.literal("hybrid"),
    currency: currencySchema,
    charges: hybridChargesSchema,
    parameterMultipliers: parameterMultipliersSchema,
    parameterPrices: parameterPricesSchema,
  })
  .superRefine((value, ctx) => {
    const hasCharge = Object.values(value.charges).some((item) => item !== undefined);
    const hasCombinationPrices =
      value.parameterPrices?.combinations &&
      Object.keys(value.parameterPrices.combinations).length > 0;
    if (!hasCharge && !hasCombinationPrices) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one billing charge or parameter price is required",
      });
    }
  });

export const billingConfigSchema = z.union([
  hybridBillingSchema,
  perRequestBillingSchema,
  perImageBillingSchema,
  perVideoBillingSchema,
  perSecondBillingSchema,
  perMillionTokensBillingSchema,
]);

export type BillingConfig = z.infer<typeof billingConfigSchema>;
export type HybridBillingConfig = z.infer<typeof hybridBillingSchema>;

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
    booleanSurcharges: number;
  };
  metrics: BillingUsageMetrics;
};

const COMBINATION_KEY_DIMENSION_ORDER = [
  "resolution",
  "duration",
  "quality",
  "hasReferenceVideos",
  "hasAudio",
] as const;

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

function normalizeParameterValue(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return "";
}

function sortCombinationDimensionEntries(entries: Array<[string, string]>) {
  return entries.sort(([leftKey], [rightKey]) => {
    const leftIndex = COMBINATION_KEY_DIMENSION_ORDER.indexOf(
      leftKey as (typeof COMBINATION_KEY_DIMENSION_ORDER)[number]
    );
    const rightIndex = COMBINATION_KEY_DIMENSION_ORDER.indexOf(
      rightKey as (typeof COMBINATION_KEY_DIMENSION_ORDER)[number]
    );

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }

    return leftKey.localeCompare(rightKey, "en-US");
  });
}

function buildNamedCombinationKey(values: Record<string, string>) {
  const entries = sortCombinationDimensionEntries(
    Object.entries(values).filter(([, value]) => value.length > 0)
  );

  return entries.map(([key, value]) => `${key}=${value}`).join("__");
}

function parseNamedCombinationKey(key: string) {
  if (!key.includes("=")) {
    return null;
  }

  const parts = key.split("__");
  const result: Record<string, string> = {};

  for (const part of parts) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex <= 0 || separatorIndex === part.length - 1) {
      return null;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      return null;
    }
    result[name] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function resolveHasReferenceVideos(input: Record<string, unknown> | null) {
  if (!input) {
    return "";
  }

  const directBooleanKeys = [
    "hasReferenceVideos",
    "has_reference_videos",
    "useReferenceVideos",
    "use_reference_videos",
  ] as const;
  for (const key of directBooleanKeys) {
    if (typeof input[key] === "boolean") {
      return input[key] ? "true" : "false";
    }
  }

  const collectionKeys = [
    "referenceVideos",
    "reference_videos",
    "referenceVideoUrls",
    "reference_video_urls",
  ] as const;
  for (const key of collectionKeys) {
    const value = input[key];
    if (Array.isArray(value)) {
      return value.length > 0 ? "true" : "false";
    }
  }

  return "";
}

function resolveHasAudio(input: Record<string, unknown> | null) {
  if (!input) {
    return "";
  }

  const directBooleanKeys = [
    "hasAudio",
    "has_audio",
    "withAudio",
    "with_audio",
    "generateAudio",
    "generate_audio",
    "includeAudio",
    "include_audio",
  ] as const;
  for (const key of directBooleanKeys) {
    if (typeof input[key] === "boolean") {
      return input[key] ? "true" : "false";
    }
  }

  return "";
}

function isRequestBooleanEnabled(
  requestInput: Record<string, unknown> | null,
  key: string
) {
  if (!requestInput) {
    return false;
  }

  if (requestInput[key] === true) {
    return true;
  }

  if (key === "hasAudio") {
    return resolveHasAudio(requestInput) === "true";
  }

  if (key === "hasReferenceVideos") {
    return resolveHasReferenceVideos(requestInput) === "true";
  }

  return false;
}

function normalizeDurationValue(value: unknown) {
  const normalized = normalizeParameterValue(value).toLowerCase();
  if (!normalized) {
    return "";
  }

  const matched = normalized.match(/^(\d+(?:\.\d+)?)\s*s?$/);
  return matched?.[1] ?? normalized;
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
      readNumericCandidate(input.num_images) ??
      readNumericCandidate(input.imageCount) ??
      readNumericCandidate(input.images) ??
      1
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
    getNestedNumber(output, ["durationSeconds"]) ??
    getNestedNumber(output, ["duration_seconds"]) ??
    getNestedNumber(raw, ["durationSeconds"]) ??
    getNestedNumber(raw, ["duration_seconds"]) ??
    readNumericCandidate(input?.durationSeconds) ??
    readNumericCandidate(input?.duration_seconds) ??
    readNumericCandidate(input?.duration) ??
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
        charges: {
          perRequest: config.costPerRequest,
        },
      };
    case "per_image":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: {
          perImage: config.costPerImage,
        },
      };
    case "per_video":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: {
          perVideo: config.costPerVideo,
        },
      };
    case "per_second":
      return {
        billingMode: "hybrid",
        currency: config.currency,
        charges: {
          perSecond: config.costPerSecond,
        },
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

export function deriveLegacyBillingFields(config: BillingConfig) {
  const normalized = normalizeBillingConfig(config);
  const charges = normalized.charges;
  const combinationPrices = Object.values(normalized.parameterPrices?.combinations ?? {});
  const resolutionPrices = Object.values(normalized.parameterMultipliers?.resolution ?? {});
  const qualityPrices = Object.values(normalized.parameterMultipliers?.quality ?? {});
  const singleDimensionPrices =
    resolutionPrices.length > 0 && qualityPrices.length === 0
      ? resolutionPrices
      : qualityPrices.length > 0 && resolutionPrices.length === 0
        ? qualityPrices
        : [];

  if (combinationPrices.length > 0) {
    return {
      unitLabel: "combination",
      defaultUnitCost: Math.min(...combinationPrices),
    };
  }

  if (singleDimensionPrices.length > 0) {
    return {
      unitLabel: "tier",
      defaultUnitCost: Math.min(...singleDimensionPrices),
    };
  }

  if (charges.perImage) {
    return {
      unitLabel: "image",
      defaultUnitCost: charges.perImage,
    };
  }

  if (charges.perVideo) {
    return {
      unitLabel: "video",
      defaultUnitCost: charges.perVideo,
    };
  }

  if (charges.perSecond) {
    return {
      unitLabel: "second",
      defaultUnitCost: charges.perSecond,
    };
  }

  if (charges.inputTextTokensPerMillion || charges.outputTextTokensPerMillion) {
    return {
      unitLabel: "1M tokens",
      defaultUnitCost:
        (charges.inputTextTokensPerMillion ?? 0) +
        (charges.outputTextTokensPerMillion ?? 0),
    };
  }

  return {
    unitLabel: "request",
    defaultUnitCost: charges.perRequest ?? 0,
  };
}

export function summarizeBillingConfig(config: BillingConfig) {
  const normalized = normalizeBillingConfig(config);
  const parts: string[] = [];
  const { charges } = normalized;
  const combinationPrices = Object.values(normalized.parameterPrices?.combinations ?? {});
  const booleanSurcharges = Object.entries(normalized.parameterPrices?.booleanSurcharges ?? {});
  const resolutionPrices = Object.values(normalized.parameterMultipliers?.resolution ?? {});
  const qualityPrices = Object.values(normalized.parameterMultipliers?.quality ?? {});
  const singleDimensionPrices =
    resolutionPrices.length > 0 && qualityPrices.length === 0
      ? resolutionPrices
      : qualityPrices.length > 0 && resolutionPrices.length === 0
        ? qualityPrices
        : [];

  if (charges.perRequest) {
    parts.push(`每次请求 ${charges.perRequest}`);
  }
  if (combinationPrices.length > 0) {
    const min = Math.min(...combinationPrices);
    const max = Math.max(...combinationPrices);
    parts.push(
      min === max
        ? `组合阶梯 ${combinationPrices.length} 档 · ${min}`
        : `组合阶梯 ${combinationPrices.length} 档 · ${min}-${max}`
    );
  } else if (singleDimensionPrices.length > 0) {
    const min = Math.min(...singleDimensionPrices);
    const max = Math.max(...singleDimensionPrices);
    parts.push(
      min === max
        ? `阶梯单价 ${singleDimensionPrices.length} 档 · ${min}`
        : `阶梯单价 ${singleDimensionPrices.length} 档 · ${min}-${max}`
    );
  } else if (charges.perImage) {
    parts.push(`每张图片 ${charges.perImage}`);
  }
  if (booleanSurcharges.length > 0) {
    parts.push(`布尔参数附加费 ${booleanSurcharges.length} 项`);
  }
  if (combinationPrices.length === 0 && charges.perVideo) {
    parts.push(`每个视频 ${charges.perVideo}`);
  }
  if (charges.perSecond) {
    parts.push(`每秒 ${charges.perSecond}`);
  }
  if (charges.inputTextTokensPerMillion) {
    parts.push(`每百万输入 Token ${charges.inputTextTokensPerMillion}`);
  }
  if (charges.outputTextTokensPerMillion) {
    parts.push(`每百万输出 Token ${charges.outputTextTokensPerMillion}`);
  }

  return `${normalized.currency} ${parts.join(" + ")}`;
}

export function resolveBillingMetrics(input: {
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}): BillingUsageMetrics {
  const requestInput = input.requestInput ?? null;
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;
  const tokens = resolveTokenUsage(requestInput, output, providerRaw);
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
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
  };
}

function resolveParameterUnitPrice(
  combinations: Record<string, number> | undefined,
  dimensions: Record<string, string>
) {
  const prices = combinations ?? {};
  const entries = Object.entries(prices);
  if (entries.length === 0) return null;

  const exactNamedKey = buildNamedCombinationKey(dimensions);
  if (exactNamedKey) {
    const exactNamedPrice = prices[exactNamedKey];
    if (typeof exactNamedPrice === "number" && Number.isFinite(exactNamedPrice) && exactNamedPrice > 0) {
      return exactNamedPrice;
    }
  }

  const matchingNamedPrices = entries
    .map(([key, price]) => {
      const parsed = parseNamedCombinationKey(key);
      if (!parsed) {
        return null;
      }

      const matches = Object.entries(parsed).every(
        ([name, value]) => dimensions[name] && dimensions[name] === value
      );
      if (!matches || !Number.isFinite(price) || price <= 0) {
        return null;
      }

      return {
        specificity: Object.keys(parsed).length,
        price,
      };
    })
    .filter((item): item is { specificity: number; price: number } => Boolean(item))
    .sort((a, b) => b.specificity - a.specificity || a.price - b.price);

  if (matchingNamedPrices.length > 0) {
    return matchingNamedPrices[0].price;
  }

  const resolution = dimensions.resolution ?? "";
  const quality = dimensions.quality ?? "";

  const candidates = [
    resolution && quality ? `${resolution}__${quality}` : "",
    resolution ? `${resolution}__default` : "",
    quality ? `default__${quality}` : "",
    resolution,
    quality,
  ].filter(Boolean);

  for (const key of candidates) {
    const price = prices[key];
    if (typeof price === "number" && Number.isFinite(price) && price > 0) {
      return price;
    }
  }

  const matchingResolutionPrices = resolution
    ? entries
        .filter(([key]) => {
          const parsed = parseNamedCombinationKey(key);
          if (parsed) {
            return parsed.resolution === resolution;
          }
          return key === resolution || key.startsWith(`${resolution}__`);
        })
        .map(([, price]) => price)
        .filter((price) => Number.isFinite(price) && price > 0)
    : [];
  if (matchingResolutionPrices.length > 0) {
    return Math.min(...matchingResolutionPrices);
  }

  const matchingQualityPrices = quality
    ? entries
        .filter(([key]) => {
          const parsed = parseNamedCombinationKey(key);
          if (parsed) {
            return parsed.quality === quality;
          }
          return key === quality || key.endsWith(`__${quality}`);
        })
        .map(([, price]) => price)
        .filter((price) => Number.isFinite(price) && price > 0)
    : [];
  if (matchingQualityPrices.length > 0) {
    return Math.min(...matchingQualityPrices);
  }

  const validPrices = entries
    .map(([, price]) => price)
    .filter((price) => Number.isFinite(price) && price > 0);
  return validPrices.length > 0 ? Math.min(...validPrices) : null;
}

export function resolveBillingBreakdown(input: {
  config: BillingConfig;
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}): BillingResolution {
  const config = normalizeBillingConfig(input.config);
  const metrics = resolveBillingMetrics(input);
  const requestInput = input.requestInput ?? null;
  const normalizedResolution = normalizeParameterValue(requestInput?.resolution);
  const normalizedQuality = normalizeParameterValue(requestInput?.quality).toLowerCase();
  const normalizedDuration = normalizeDurationValue(
    requestInput?.durationSeconds ??
      requestInput?.duration_seconds ??
      requestInput?.duration
  );
  const normalizedHasReferenceVideos = resolveHasReferenceVideos(requestInput) || "false";
  const normalizedHasAudio = resolveHasAudio(requestInput) || "false";
  const resolutionMultiplier =
    normalizedResolution &&
    config.parameterMultipliers?.resolution &&
    typeof config.parameterMultipliers.resolution[normalizedResolution] === "number"
      ? config.parameterMultipliers.resolution[normalizedResolution]
      : 1;
  const qualityMultiplier =
    normalizedQuality &&
    config.parameterMultipliers?.quality &&
    typeof config.parameterMultipliers.quality[normalizedQuality] === "number"
      ? config.parameterMultipliers.quality[normalizedQuality]
      : 1;
  const hasOnlyResolutionLegacyPrices =
    Object.keys(config.parameterMultipliers?.resolution ?? {}).length > 0 &&
    Object.keys(config.parameterMultipliers?.quality ?? {}).length === 0;
  const hasOnlyQualityLegacyPrices =
    Object.keys(config.parameterMultipliers?.quality ?? {}).length > 0 &&
    Object.keys(config.parameterMultipliers?.resolution ?? {}).length === 0;
  const legacySingleDimensionUnitPrice =
    hasOnlyResolutionLegacyPrices && normalizedResolution
      ? config.parameterMultipliers?.resolution?.[normalizedResolution] ?? null
      : hasOnlyQualityLegacyPrices && normalizedQuality
        ? config.parameterMultipliers?.quality?.[normalizedQuality] ?? null
        : null;
  const outputPriceMultiplier = resolutionMultiplier * qualityMultiplier;
  const combinationUnitPrice = resolveParameterUnitPrice(
    config.parameterPrices?.combinations,
    {
      resolution: normalizedResolution,
      quality: normalizedQuality,
      duration: normalizedDuration,
      hasReferenceVideos: normalizedHasReferenceVideos,
      hasAudio: normalizedHasAudio,
    }
  );
  const perImageUnitPrice =
    combinationUnitPrice ??
    legacySingleDimensionUnitPrice ??
    (config.charges.perImage ?? 0) * outputPriceMultiplier;
  const perVideoUnitPrice =
    metrics.imageCount > 0
      ? (config.charges.perVideo ?? 0) * outputPriceMultiplier
      : combinationUnitPrice ??
        legacySingleDimensionUnitPrice ??
        (config.charges.perVideo ?? 0) * outputPriceMultiplier;
  const booleanSurcharges = Object.entries(config.parameterPrices?.booleanSurcharges ?? {}).reduce(
    (sum, [key, price]) => sum + (isRequestBooleanEnabled(requestInput, key) ? price : 0),
    0
  );

  const components = {
    perRequest: config.charges.perRequest ?? 0,
    perImage: metrics.imageCount * perImageUnitPrice,
    perVideo: metrics.videoCount * perVideoUnitPrice,
    perSecond: metrics.durationSeconds * (config.charges.perSecond ?? 0),
    inputTextTokens:
      (metrics.inputTokens / 1_000_000) * (config.charges.inputTextTokensPerMillion ?? 0),
    outputTextTokens:
      (metrics.outputTokens / 1_000_000) * (config.charges.outputTextTokensPerMillion ?? 0),
    booleanSurcharges,
  };

  return {
    currency: config.currency,
    total: Object.values(components).reduce((sum, value) => sum + value, 0),
    components,
    metrics,
  };
}
