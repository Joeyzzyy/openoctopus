import "server-only";

import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createClient } from "@/lib/supabase/server";

const IMAGE_OUTPUT_TOKENS_PER_IMAGE = 1290;
const QUALITY_ORDER = ["low", "medium", "high"];

type ProviderModelPricing = Record<string, unknown> | null;
type SupportedModelBillingConfig = Record<string, unknown> | null;

export type MarketingImagePricing = {
  name: string;
  billingUnit: "image";
  costUsd: number | null;
  sellUsd: number;
  sellLabel: string;
  priceTiers: Array<{
    resolution: string;
    quality: string;
    priceUsd: number;
    label: string;
  }>;
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

function splitCombinationKey(key: string) {
  const [resolution, quality] = key.split("__");
  return {
    resolution: resolution || "default",
    quality: quality || "default",
  };
}

function formatResolutionLabel(value: string) {
  return `${value} output resolution`;
}

function formatQualityLabel(value: string) {
  return `${value} generation quality`;
}

function tierDimensionLabel(name: string, value: string, formatter: (input: string) => string) {
  return value === "default" ? "" : `${name}: ${formatter(value)}`;
}

function extractCombinationPrices(config: ProviderModelPricing | SupportedModelBillingConfig) {
  if (!config) {
    return [];
  }

  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(config));
    const combinations = normalized.parameterPrices?.combinations ?? {};
    return Object.entries(combinations)
      .map(([key, value]) => {
        const price = readNumeric(value);
        if (price === null || price <= 0) {
          return null;
        }
        return {
          ...splitCombinationKey(key),
          price,
        };
      })
      .filter((item): item is { resolution: string; quality: string; price: number } => Boolean(item))
      .sort((a, b) =>
        a.resolution.localeCompare(b.resolution, "en-US", { numeric: true }) ||
        (QUALITY_ORDER.indexOf(a.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(a.quality)) -
          (QUALITY_ORDER.indexOf(b.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(b.quality)) ||
        a.quality.localeCompare(b.quality, "en-US", { numeric: true })
      );
  } catch {
    return [];
  }
}

function extractImagePriceTiers(config: ProviderModelPricing | SupportedModelBillingConfig) {
  if (!config) {
    return [];
  }

  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(config));
    const combinationTiers = extractCombinationPrices(config);
    if (combinationTiers.length > 0) {
      return combinationTiers;
    }
    const perImage = readNumeric(normalized.charges.perImage);
    if (perImage === null || perImage <= 0) {
      return [];
    }
    const resolutionEntries = Object.entries(normalized.parameterMultipliers?.resolution ?? {});
    const qualityEntries = Object.entries(normalized.parameterMultipliers?.quality ?? {});
    if (resolutionEntries.length > 0 && qualityEntries.length === 0) {
      return resolutionEntries
        .map(([resolution, value]) => ({
          resolution,
          quality: "default",
          price: Number(value),
        }))
        .filter((item): item is { resolution: string; quality: string; price: number } =>
          Number.isFinite(item.price) && item.price > 0
        )
        .sort((a, b) => a.resolution.localeCompare(b.resolution, "en-US", { numeric: true }));
    }
    if (qualityEntries.length > 0 && resolutionEntries.length === 0) {
      return qualityEntries
        .map(([quality, value]) => ({
          resolution: "default",
          quality,
          price: Number(value),
        }))
        .filter((item): item is { resolution: string; quality: string; price: number } =>
          Number.isFinite(item.price) && item.price > 0
        )
        .sort((a, b) =>
          (QUALITY_ORDER.indexOf(a.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(a.quality)) -
            (QUALITY_ORDER.indexOf(b.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(b.quality)) ||
          a.quality.localeCompare(b.quality, "en-US", { numeric: true })
        );
    }
    const resolutions = resolutionEntries.length > 0 ? resolutionEntries : [["default", 1] as const];
    const qualities = qualityEntries.length > 0 ? qualityEntries : [["default", 1] as const];
    return resolutions
      .flatMap(([resolution, resolutionMultiplier]) =>
        qualities.map(([quality, qualityMultiplier]) => ({
          resolution,
          quality,
          price: perImage * Number(resolutionMultiplier) * Number(qualityMultiplier),
        }))
      )
      .filter((item): item is { resolution: string; quality: string; price: number } =>
        Number.isFinite(item.price) && item.price > 0
      )
      .sort((a, b) =>
        a.resolution.localeCompare(b.resolution, "en-US", { numeric: true }) ||
        (QUALITY_ORDER.indexOf(a.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(a.quality)) -
          (QUALITY_ORDER.indexOf(b.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(b.quality)) ||
        a.quality.localeCompare(b.quality, "en-US", { numeric: true })
      );
  } catch {
    return [];
  }
}

function extractProviderModelCost(pricing: ProviderModelPricing) {
  if (!pricing) {
    return null;
  }

  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(pricing));
    const combinationPrices = Object.values(normalized.parameterPrices?.combinations ?? {});
    if (combinationPrices.length > 0) {
      return Math.min(...combinationPrices);
    }
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
      const combinationPrices = Object.values(normalized.parameterPrices?.combinations ?? {});
      if (combinationPrices.length > 0) {
        return Math.min(...combinationPrices);
      }
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

function formatPricingTiersLabel(tiers: Array<{ price: number }>, fallbackValue: number, unit: string) {
  if (tiers.length === 0) {
    return formatPricingLabel(fallbackValue, unit);
  }
  const prices = tiers.map((tier) => tier.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max
    ? formatPricingLabel(min, unit)
    : `${formatUsd(min)}-${formatUsd(max)} / ${unit}`;
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
  const sellTiers = extractImagePriceTiers(
    (supportedModel?.billing_config as SupportedModelBillingConfig) ?? null
  );
  const sellUsd = supportedModelCost ?? 0;

  return {
    name: supportedModel?.display_name ?? providerModel?.upstream_model_slug ?? "Unknown image model",
    billingUnit: "image",
    costUsd: providerModelCost ?? supportedModelCost,
    sellUsd,
    sellLabel: formatPricingTiersLabel(sellTiers, sellUsd, "image"),
    priceTiers: sellTiers.map((tier) => ({
      resolution: tier.resolution,
      quality: tier.quality,
      priceUsd: tier.price,
      label: [
        tierDimensionLabel("Resolution", tier.resolution, formatResolutionLabel),
        tierDimensionLabel("Quality", tier.quality, formatQualityLabel),
        `${formatUsd(tier.price)} / image`,
      ].filter(Boolean).join(" · "),
    })),
    publicModelSlug: route?.public_model_slug ?? supportedModel?.model_slug ?? null,
  };
}
