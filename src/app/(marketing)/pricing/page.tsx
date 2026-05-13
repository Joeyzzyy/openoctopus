import Link from "next/link";
import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = {
  title: "Pricing — OpenOctopus",
  description: "Simple pricing list for active supported models.",
};

function billingSummary(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    const parts: string[] = [];
    const { charges, currency } = normalized;
    if (charges.perRequest) parts.push(`per request ${charges.perRequest}`);
    if (charges.perImage) parts.push(`per image ${charges.perImage}`);
    if (charges.perVideo) parts.push(`per video ${charges.perVideo}`);
    if (charges.perSecond) parts.push(`per second ${charges.perSecond}`);
    if (charges.inputTextTokensPerMillion) parts.push(`per 1M input tokens ${charges.inputTextTokensPerMillion}`);
    if (charges.outputTextTokensPerMillion) parts.push(`per 1M output tokens ${charges.outputTextTokensPerMillion}`);
    return `${currency} ${parts.join(" + ")}`;
  } catch {
    return "Invalid pricing configuration";
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
    price: billingSummary(row.billing_config),
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
            <div key={row.model} className="grid grid-cols-2 border-b border-black/[0.05] px-4 py-3 text-sm text-black last:border-b-0">
              <span className="truncate pr-3">{row.model}</span>
              <span className="text-black/70">{row.price}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
