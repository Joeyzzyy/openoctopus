import "server-only";

import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createClient } from "@/lib/supabase/server";

const IMAGE_OUTPUT_TOKENS_PER_IMAGE = 1290;

type ProviderModelPricing = Record<string, unknown> | null;
type SupportedModelBillingConfig = Record<string, unknown> | null;

export type MarketingImagePricing = {
  name: string;
  billingUnit: "image";
  costUsd: number | null;
  sellUsd: number;
  publicModelSlug: string | null;
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 0.1 ? 2 : 3,
    maximumFractionDigits: value >= 0.1 ? 2 : 3,
  }).format(value);
}

function readNumeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractProviderModelCost(pricing: ProviderModelPricing) {
  if (!pricing) {
    return null;
  }

  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(pricing));
    const charges = normalized.charges;
    const perImage = readNumeric(charges.perImage);

    if (perImage !== null) {
      return perImage;
    }

    const inputTokenCost = readNumeric(charges.inputTextTokensPerMillion) ?? 0;
    const outputTokenCost = readNumeric(charges.outputTextTokensPerMillion);

    if (outputTokenCost !== null) {
      return (
        (IMAGE_OUTPUT_TOKENS_PER_IMAGE / 1_000_000) * outputTokenCost +
        (24 / 1_000_000) * inputTokenCost
      );
    }
  } catch {
    const directPerImage =
      readNumeric(pricing.costPerImage) ??
      readNumeric(pricing.costPerUnit);

    if (directPerImage !== null) {
      return directPerImage;
    }

    if (pricing.billingMode === "hybrid" && pricing.charges && typeof pricing.charges === "object") {
      return readNumeric((pricing.charges as Record<string, unknown>).perImage);
    }
  }

  return null;
}

function extractSupportedModelCost(
  billingConfig: SupportedModelBillingConfig,
  defaultUnitCost: unknown
) {
  if (billingConfig) {
    try {
      const normalized = normalizeBillingConfig(parseBillingConfig(billingConfig));
      const charges = normalized.charges;
      const perImage = readNumeric(charges.perImage);

      if (perImage !== null) {
        return perImage;
      }

      const outputTokenCost = readNumeric(charges.outputTextTokensPerMillion);
      const inputTokenCost = readNumeric(charges.inputTextTokensPerMillion) ?? 0;

      if (outputTokenCost !== null) {
        return (
          (IMAGE_OUTPUT_TOKENS_PER_IMAGE / 1_000_000) * outputTokenCost +
          (24 / 1_000_000) * inputTokenCost
        );
      }
    } catch {
      if (billingConfig.billingMode === "hybrid" && billingConfig.charges && typeof billingConfig.charges === "object") {
        const hybridPerImage = readNumeric(
          (billingConfig.charges as Record<string, unknown>).perImage
        );

        if (hybridPerImage !== null) {
          return hybridPerImage;
        }
      }

      if (billingConfig.billingMode === "per_image") {
        const perImage = readNumeric(billingConfig.costPerImage);

        if (perImage !== null) {
          return perImage;
        }
      }
    }
  }

  return readNumeric(defaultUnitCost);
}

export function formatPricingLabel(value: number, unit: string) {
  return `${formatUsd(value)} / ${unit}`;
}

export async function getMarketingImagePricing(): Promise<MarketingImagePricing> {
  const supabase = await createClient();

  const { data: route, error: routeError } = await supabase
    .from("routing_rules")
    .select(
      "id, public_model_slug, primary_provider_model_id, provider_models!routing_rules_primary_provider_model_id_fkey(id, upstream_model_slug, pricing, supported_model_id, active, supported_models(id, display_name, model_slug, billing_config, default_unit_cost, modality, active))"
    )
    .is("workspace_id", null)
    .eq("active", true)
    .eq("capability", "image_generation")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (routeError) {
    throw routeError;
  }

  const providerModel = Array.isArray(route?.provider_models)
    ? route.provider_models[0]
    : route?.provider_models ?? null;

  const supportedModel = providerModel?.supported_models
    ? Array.isArray(providerModel.supported_models)
      ? providerModel.supported_models[0]
      : providerModel.supported_models
    : null;

  const providerModelCost = extractProviderModelCost(
    (providerModel?.pricing as ProviderModelPricing) ?? null
  );
  const supportedModelCost = extractSupportedModelCost(
    (supportedModel?.billing_config as SupportedModelBillingConfig) ?? null,
    supportedModel?.default_unit_cost
  );

  return {
    name: supportedModel?.display_name ?? providerModel?.upstream_model_slug ?? "Unknown image model",
    billingUnit: "image",
    costUsd: providerModelCost ?? supportedModelCost,
    sellUsd: supportedModelCost ?? 0,
    publicModelSlug: route?.public_model_slug ?? supportedModel?.model_slug ?? null,
  };
}
