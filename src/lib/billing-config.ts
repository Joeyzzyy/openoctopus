import { z } from "zod/v4";

const currencySchema = z.string().trim().min(3).max(8).default("USD");

const perRequestBillingSchema = z.object({
  billingMode: z.literal("per_request"),
  currency: currencySchema,
  costPerRequest: z.coerce.number().positive().max(1000000),
});

const perImageBillingSchema = z.object({
  billingMode: z.literal("per_image"),
  currency: currencySchema,
  costPerImage: z.coerce.number().positive().max(1000000),
});

const perVideoBillingSchema = z.object({
  billingMode: z.literal("per_video"),
  currency: currencySchema,
  costPerVideo: z.coerce.number().positive().max(1000000),
});

const perSecondBillingSchema = z.object({
  billingMode: z.literal("per_second"),
  currency: currencySchema,
  costPerSecond: z.coerce.number().positive().max(1000000),
});

const perMillionTokensBillingSchema = z.object({
  billingMode: z.literal("per_million_tokens"),
  currency: currencySchema,
  inputCostPerMillion: z.coerce.number().positive().max(1000000),
  outputCostPerMillion: z.coerce.number().positive().max(1000000),
});

export const billingConfigSchema = z.discriminatedUnion("billingMode", [
  perRequestBillingSchema,
  perImageBillingSchema,
  perVideoBillingSchema,
  perSecondBillingSchema,
  perMillionTokensBillingSchema,
]);

export type BillingConfig = z.infer<typeof billingConfigSchema>;

export function parseBillingConfig(value: unknown) {
  return billingConfigSchema.parse(value);
}

export function deriveLegacyBillingFields(config: BillingConfig) {
  switch (config.billingMode) {
    case "per_request":
      return {
        unitLabel: "request",
        defaultUnitCost: config.costPerRequest,
      };
    case "per_image":
      return {
        unitLabel: "image",
        defaultUnitCost: config.costPerImage,
      };
    case "per_video":
      return {
        unitLabel: "video",
        defaultUnitCost: config.costPerVideo,
      };
    case "per_second":
      return {
        unitLabel: "second",
        defaultUnitCost: config.costPerSecond,
      };
    case "per_million_tokens":
      return {
        unitLabel: "1M tokens",
        defaultUnitCost: config.inputCostPerMillion + config.outputCostPerMillion,
      };
  }
}

export function summarizeBillingConfig(config: BillingConfig) {
  switch (config.billingMode) {
    case "per_request":
      return `${config.currency} ${config.costPerRequest} per request`;
    case "per_image":
      return `${config.currency} ${config.costPerImage} per image`;
    case "per_video":
      return `${config.currency} ${config.costPerVideo} per video`;
    case "per_second":
      return `${config.currency} ${config.costPerSecond} per second`;
    case "per_million_tokens":
      return `${config.currency} ${config.inputCostPerMillion}/${config.outputCostPerMillion} per 1M input/output tokens`;
  }
}
