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
  .superRefine((value, ctx) => {
    if (!Object.values(value).some((item) => item !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one hybrid billing charge is required",
      });
    }
  });

const hybridBillingSchema = z.object({
  billingMode: z.literal("hybrid"),
  currency: currencySchema,
  charges: hybridChargesSchema,
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

  if (charges.perRequest) {
    parts.push(`${charges.perRequest} per request`);
  }
  if (charges.perImage) {
    parts.push(`${charges.perImage} per image`);
  }
  if (charges.perVideo) {
    parts.push(`${charges.perVideo} per video`);
  }
  if (charges.perSecond) {
    parts.push(`${charges.perSecond} per second`);
  }
  if (charges.inputTextTokensPerMillion) {
    parts.push(`${charges.inputTextTokensPerMillion} per 1M input tokens`);
  }
  if (charges.outputTextTokensPerMillion) {
    parts.push(`${charges.outputTextTokensPerMillion} per 1M output tokens`);
  }

  return `${normalized.currency} ${parts.join(" + ")}`;
}
