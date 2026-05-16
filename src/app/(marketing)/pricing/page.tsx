import Link from "next/link";
import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Pricing — OpenOctopus",
  description: "Simple pricing list for active supported models.",
};

type PriceTier = {
  resolution: string;
  quality: string;
  price: number;
};

const QUALITY_ORDER = ["low", "medium", "high"];

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: value >= 0.1 ? 2 : 3,
    maximumFractionDigits: value >= 0.1 ? 2 : 3,
  }).format(value);
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

function billingDisplay(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    const parts: string[] = [];
    const { charges, currency } = normalized;
    const combinations = normalized.parameterPrices?.combinations ?? {};
    const tiers = Object.entries(combinations)
      .map(([key, price]) => {
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
          return null;
        }
        const labels = splitCombinationKey(key);
        return {
          ...labels,
          price: numericPrice,
        };
      })
      .filter((item): item is PriceTier => Boolean(item))
      .sort((a, b) =>
        a.resolution.localeCompare(b.resolution, "en-US", { numeric: true }) ||
        (QUALITY_ORDER.indexOf(a.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(a.quality)) -
          (QUALITY_ORDER.indexOf(b.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(b.quality)) ||
        a.quality.localeCompare(b.quality, "en-US", { numeric: true })
      );

    if (charges.perRequest) parts.push(`per request ${charges.perRequest}`);
    if (tiers.length > 0) {
      const prices = tiers.map((tier) => tier.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      parts.push(
        min === max
          ? `${formatMoney(min, currency)} per image`
          : `${formatMoney(min, currency)}-${formatMoney(max, currency)} per image`
      );
    } else if (charges.perImage) {
      parts.push(`per image ${charges.perImage}`);
    }
    if (tiers.length === 0 && charges.perVideo) parts.push(`per video ${charges.perVideo}`);
    if (charges.perSecond) parts.push(`per second ${charges.perSecond}`);
    if (charges.inputTextTokensPerMillion) parts.push(`per 1M input tokens ${charges.inputTextTokensPerMillion}`);
    if (charges.outputTextTokensPerMillion) parts.push(`per 1M output tokens ${charges.outputTextTokensPerMillion}`);

    return {
      summary: parts.join(" + "),
      currency,
      tiers,
    };
  } catch {
    return {
      summary: "Invalid pricing configuration",
      currency: "USD",
      tiers: [],
    };
  }
}

export default async function PricingPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supported_models")
    .select("model_slug, display_name, billing_config, active")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []).map((row) => ({
    model: row.display_name || row.model_slug,
    slug: row.model_slug,
    price: billingDisplay(row.billing_config),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-8 md:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-black">Pricing</h1>
          <p className="mt-1 text-sm text-black/55">Active sellable models and their pricing rules.</p>
        </div>
        <Link href="/models" className="text-sm font-medium text-black/70 underline underline-offset-4 hover:text-black">
          Go to Models
        </Link>
      </div>
      <section className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
        <div className="grid grid-cols-2 border-b border-black/[0.08] bg-[#FAFAFA] px-4 py-2 text-xs font-medium tracking-[0.3px] text-black/60">
          <span>Model</span>
          <span>Price</span>
        </div>
        <div>
          {rows.map((row) => (
            <div key={row.slug} className="grid grid-cols-2 border-b border-black/[0.05] px-4 py-3 text-sm text-black last:border-b-0">
              <span className="truncate pr-3">{row.model}</span>
              <span className="text-black/70">
                <span className="font-medium text-black/75">{row.price.summary}</span>
                {row.price.tiers.length > 0 ? (
                  <span className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {row.price.tiers.map((tier) => (
                      <span
                        key={`${tier.resolution}-${tier.quality}`}
                        className="rounded-lg border border-black/[0.06] bg-[#FCFCFA] px-2 py-1 text-xs text-black/62"
                      >
                        Resolution: {formatResolutionLabel(tier.resolution)} · Quality: {formatQualityLabel(tier.quality)}{" "}
                        <span className="font-medium text-black/75">{formatMoney(tier.price, row.price.currency)}</span>
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
