import Link from "next/link";
import {
  buildModelCanonicalPath,
  loadModelsPageData,
} from "@/app/(marketing)/models/data";
import { ModelToolLinkActions } from "./model-tool-link-actions";

export const metadata = {
  title: "Pricing — OpenOctopus",
  description: "Simple pricing list for active supported models.",
};

function formatMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: value >= 0.1 ? 2 : 3,
    maximumFractionDigits: value >= 0.1 ? 2 : 3,
  }).format(value);
}

function buildProductionToolUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") || "https://openoctopus.com";
  return new URL(path, `${base}/`).toString();
}

function groupedPriceTiers(
  tiers: Array<{ resolution: string; quality: string; price: number }>
) {
  const grouped = new Map<string, Array<{ quality: string; price: number }>>();
  for (const tier of tiers) {
    const items = grouped.get(tier.resolution) ?? [];
    items.push({ quality: tier.quality, price: tier.price });
    grouped.set(tier.resolution, items);
  }

  return Array.from(grouped.entries()).map(([resolution, items]) => ({
    resolution,
    items,
  }));
}

export default async function PricingPage() {
  const { modelDocRows } = await loadModelsPageData();

  const rows = modelDocRows.map((row) => ({
    model: row.displayName || row.publicModel,
    slug: row.publicModel,
    toolUrl: buildProductionToolUrl(buildModelCanonicalPath(row)),
    price: {
      summary: row.priceLabel || "Pricing unavailable",
      currency: row.billingCurrency,
      tiers: row.priceTiers,
    },
  }));

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-8 md:px-8">
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
        <div className="overflow-x-auto">
          <div className="grid min-w-[980px] grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.1fr)_minmax(420px,1.6fr)] gap-x-8 border-b border-black/[0.08] bg-[#FAFAFA] px-4 py-2 text-xs font-medium tracking-[0.3px] text-black/60">
            <span>Model</span>
            <span>Price</span>
            <span>Tool page</span>
          </div>
          <div>
            {rows.map((row) => (
              <div
                key={row.slug}
                className="grid min-w-[980px] grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.1fr)_minmax(420px,1.6fr)] gap-x-8 border-b border-black/[0.05] px-4 py-3 text-sm text-black last:border-b-0"
              >
                <span className="truncate pr-3">{row.model}</span>
                <span className="text-black/70">
                  <span className="font-medium text-black/75">{row.price.summary}</span>
                  {row.price.tiers.length > 0 ? (
                    <span className="mt-2 grid gap-1.5">
                      {groupedPriceTiers(row.price.tiers).map((group) => (
                        <span
                          key={group.resolution}
                          className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-2 rounded-lg border border-black/[0.06] bg-[#FCFCFA] px-2 py-1.5 text-xs text-black/62"
                        >
                          <span className="font-mono font-medium text-black/70">{group.resolution}</span>
                          <span className="flex flex-wrap gap-1.5">
                            {group.items.map((tier) => (
                              <span
                                key={`${group.resolution}-${tier.quality}`}
                                className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5"
                              >
                                <span className="capitalize text-black/45">{tier.quality}</span>
                                <span className="font-medium text-black/75">
                                  {formatMoney(tier.price, row.price.currency)}
                                </span>
                              </span>
                            ))}
                          </span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                </span>
                <ModelToolLinkActions url={row.toolUrl} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
