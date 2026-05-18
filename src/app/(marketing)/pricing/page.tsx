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

function formatTierDimension(value: string) {
  return value === "default" ? "" : value;
}

function providerAnchor(provider: string) {
  return `provider-${provider
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unknown"}`;
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

function shouldShowPriceTiers(row: PricingRow) {
  if (row.price.tiers.length !== 1) {
    return row.price.tiers.length > 0;
  }

  const [tier] = row.price.tiers;
  const formattedTierPrice = formatMoney(tier.price, row.price.currency);
  const summary = row.price.summary.trim();
  const hasDimensionLabel =
    Boolean(formatTierDimension(tier.resolution)) ||
    Boolean(formatTierDimension(tier.quality));

  return hasDimensionLabel && !summary.includes(formattedTierPrice);
}

type PricingRow = {
  model: string;
  slug: string;
  provider: string;
  toolUrl: string;
  price: {
    summary: string;
    currency: string;
    tiers: Array<{ resolution: string; quality: string; price: number }>;
    booleanSurcharges: Array<{ name: string; price: number; label: string }>;
  };
};

function groupRowsByProvider(rows: PricingRow[]) {
  const grouped = new Map<string, PricingRow[]>();
  for (const row of rows) {
    const providerRows = grouped.get(row.provider) ?? [];
    providerRows.push(row);
    grouped.set(row.provider, providerRows);
  }

  return Array.from(grouped.entries())
    .map(([provider, providerRows]) => ({
      provider,
      rows: providerRows.sort((a, b) =>
        a.model.localeCompare(b.model, "en-US", { sensitivity: "base" })
      ),
    }))
    .sort((a, b) =>
      a.provider.localeCompare(b.provider, "en-US", { sensitivity: "base" })
    );
}

function PricingTable({ rows }: { rows: PricingRow[] }) {
  return (
    <div className="max-w-full overflow-x-auto">
      <div className="grid min-w-[980px] grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.1fr)_minmax(420px,1.6fr)] gap-x-8 border-b border-black/[0.08] bg-[#FAFAFA] px-4 py-2 text-xs font-medium tracking-[0.3px] text-black/60">
        <span>Model</span>
        <span>Price</span>
        <span>Tool page</span>
      </div>
      <div>
        {rows.map((row) => {
          const showPriceTiers = shouldShowPriceTiers(row);

          return (
            <div
              key={row.slug}
              className="grid min-w-[980px] grid-cols-[minmax(180px,0.9fr)_minmax(280px,1.1fr)_minmax(420px,1.6fr)] gap-x-8 border-b border-black/[0.05] px-4 py-3 text-sm text-black last:border-b-0"
            >
              <span className="truncate pr-3">{row.model}</span>
              <span className="text-black/70">
                <span className="font-medium text-black/75">{row.price.summary}</span>
                {showPriceTiers ? (
                  <span className="mt-2 grid gap-1.5">
                    {groupedPriceTiers(row.price.tiers).map((group) => (
                      <span
                        key={group.resolution}
                        className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-2 rounded-lg border border-black/[0.06] bg-[#FCFCFA] px-2 py-1.5 text-xs text-black/62"
                      >
                        <span className="font-mono font-medium text-black/70">{formatTierDimension(group.resolution)}</span>
                        <span className="flex flex-wrap gap-1.5">
                          {group.items.map((tier) => (
                            <span
                              key={`${group.resolution}-${tier.quality}`}
                              className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5"
                            >
                              {formatTierDimension(tier.quality) ? (
                                <span className="capitalize text-black/45">{formatTierDimension(tier.quality)}</span>
                              ) : null}
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
                {row.price.booleanSurcharges.length > 0 ? (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {row.price.booleanSurcharges.map((surcharge) => (
                      <span
                        key={surcharge.name}
                        className="inline-flex items-center rounded-md border border-black/[0.06] bg-[#E0F2FE] px-2 py-1 text-xs font-medium text-[#0369A1]"
                      >
                        {surcharge.label}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <ModelToolLinkActions url={row.toolUrl} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function PricingPage() {
  const { modelDocRows } = await loadModelsPageData();

  const rows = modelDocRows
    .map((row) => ({
      model: row.displayName || row.publicModel,
      slug: row.publicModel,
      provider: row.providerName || "Unknown Provider",
      toolUrl: buildProductionToolUrl(buildModelCanonicalPath(row)),
      price: {
        summary: row.priceLabel || "Pricing unavailable",
        currency: row.billingCurrency,
        tiers: row.priceTiers,
        booleanSurcharges: row.booleanSurcharges,
      },
    }))
    .sort(
      (a, b) =>
        a.provider.localeCompare(b.provider, "en-US", { sensitivity: "base" }) ||
        a.model.localeCompare(b.model, "en-US", { sensitivity: "base" })
    );
  const providerGroups = groupRowsByProvider(rows);

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
      <div className="grid min-w-0 gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-black/[0.08] bg-white p-3 lg:sticky lg:top-20 lg:self-start">
          <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-black/45">Providers</p>
          <nav className="grid gap-1">
            {providerGroups.map((group) => (
              <Link
                key={group.provider}
                href={`#${providerAnchor(group.provider)}`}
                className="flex items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-black/68 hover:bg-black/[0.04] hover:text-black"
              >
                <span className="truncate pr-3">{group.provider}</span>
                <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-xs text-black/48">{group.rows.length}</span>
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 space-y-5">
          {providerGroups.map((group) => (
            <section
              key={group.provider}
              id={providerAnchor(group.provider)}
              className="min-w-0 scroll-mt-24 overflow-hidden rounded-xl border border-black/[0.08] bg-white"
            >
              <div className="flex items-center justify-between gap-4 border-b border-black/[0.08] px-4 py-3">
                <h2 className="text-base font-semibold text-black">{group.provider}</h2>
                <span className="text-xs font-medium text-black/45">{group.rows.length} models</span>
              </div>
              <PricingTable rows={group.rows} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
