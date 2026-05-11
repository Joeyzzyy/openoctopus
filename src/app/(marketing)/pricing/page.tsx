import { parseBillingConfig, summarizeBillingConfig } from "@/lib/billing-config";
import { createClient } from "@/lib/supabase/server";

type SupportedModelRow = {
  id: string;
  provider: string;
  model_slug: string;
  display_name: string;
  modality: "image" | "video" | "audio";
  capability: "image_generation" | "image_edit" | "video_generation" | null;
  billing_config: unknown;
  active: boolean;
  created_at: string;
};

export const metadata = {
  title: "Pricing — OpenOctopus",
  description: "Live pricing table sourced from internal model configuration.",
};

function capabilityLabel(value: SupportedModelRow["capability"]) {
  if (value === "image_generation") return "Image Generation";
  if (value === "image_edit") return "Image Editing";
  if (value === "video_generation") return "Video Generation";
  return "Not Set";
}

function modalityLabel(value: SupportedModelRow["modality"]) {
  if (value === "image") return "Image";
  if (value === "video") return "Video";
  return "Audio";
}

function billingSummary(value: unknown) {
  try {
    return summarizeBillingConfig(parseBillingConfig(value));
  } catch {
    return "Invalid pricing configuration";
  }
}

export default async function PricingPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("supported_models")
    .select("id, provider, model_slug, display_name, modality, capability, billing_config, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const models = (data ?? []) as SupportedModelRow[];

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 md:px-10 md:py-16">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-black/45">Pricing</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#111827]">Model Pricing</h1>
        <p className="mt-3 text-sm text-black/60">Live pricing sourced from internal configuration (active public models only).</p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs text-black/50">
              <th className="min-w-[180px] border-b border-black/[0.08] px-3 py-2.5">Model</th>
              <th className="min-w-[140px] border-b border-black/[0.08] px-3 py-2.5">Provider</th>
              <th className="min-w-[100px] border-b border-black/[0.08] px-3 py-2.5">Modality</th>
              <th className="min-w-[150px] border-b border-black/[0.08] px-3 py-2.5">Capability</th>
              <th className="min-w-[320px] border-b border-black/[0.08] px-3 py-2.5">Pricing Rule</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
              <tr key={model.id}>
                <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-sm font-medium text-black">{model.display_name}</td>
                <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{model.provider}</td>
                <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{modalityLabel(model.modality)}</td>
                <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{capabilityLabel(model.capability)}</td>
                <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{billingSummary(model.billing_config)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
