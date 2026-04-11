import "server-only";

import { createClient } from "@/lib/supabase/server";

const TARGET_MODEL_SLUG_PREFIX = "nano-banana-pro";
const TARGET_MODEL_DISPLAY_NAME = "Nano Banana Pro";
const DEFAULT_SELL_PRICE = 0.1;

export type MarketingImagePricing = {
  name: string;
  billingUnit: "image";
  costUsd: number | null;
  sellUsd: number;
};

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 0.1 ? 2 : 3,
    maximumFractionDigits: value >= 0.1 ? 2 : 3,
  }).format(value);
}

export function formatPricingLabel(value: number, unit: string) {
  return `${formatUsd(value)} / ${unit}`;
}

export async function getMarketingImagePricing(): Promise<MarketingImagePricing> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("supported_models")
    .select("display_name, model_slug, modality, default_unit_cost, unit_label, active")
    .eq("active", true)
    .eq("modality", "image")
    .ilike("model_slug", `${TARGET_MODEL_SLUG_PREFIX}%`)
    .order("default_unit_cost", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return {
    name: data?.display_name ?? TARGET_MODEL_DISPLAY_NAME,
    billingUnit: "image",
    costUsd:
      typeof data?.default_unit_cost === "number" ? data.default_unit_cost : null,
    sellUsd: DEFAULT_SELL_PRICE,
  };
}
