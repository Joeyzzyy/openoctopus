import { ProductTopTabs } from "@/components/marketing/product-top-tabs";
import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { ModelsBrowser } from "../pricing/models-browser";

type SupportedModelRow = {
  id: string;
  provider: string;
  model_slug: string;
  display_name: string;
  capability: "image_generation" | "image_edit" | "video_generation" | null;
  billing_config: unknown;
  active: boolean;
  created_at: string;
};

export const metadata = {
  title: "Models — OpenOctopus",
  description: "Model catalog, API docs, and live pricing sourced from internal model configuration.",
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

function readMetaField(value: unknown, key: "modelDescription" | "modelType") {
  try {
    const raw = typeof value === "string" ? (JSON.parse(value) as Record<string, unknown>) : ((value as Record<string, unknown>) ?? {});
    const metadata =
      raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
        ? (raw.metadata as Record<string, unknown>)
        : null;
    if (typeof metadata?.[key] === "string" && String(metadata[key]).trim()) return String(metadata[key]);
    if (typeof raw[key] === "string" && String(raw[key]).trim()) return String(raw[key]);
    return "";
  } catch {
    return "";
  }
}

async function loadModelsPageData() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("supported_models")
    .select("id, provider, model_slug, display_name, capability, billing_config, active, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const { data: vendorRows, error: vendorError } = await supabase
    .from("model_vendors")
    .select("name, active, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (vendorError) throw new Error(vendorError.message);

  const { data: providerModelRows, error: providerModelError } = await supabase
    .from("provider_models")
    .select("id, supported_model_id, upstream_model_slug, capability, input_schema, output_schema, execution_config, active")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (providerModelError) throw new Error(providerModelError.message);

  const providerModelsBySupportedId = new Map<string, Array<Record<string, unknown>>>();
  for (const row of providerModelRows ?? []) {
    const supportedId = typeof row.supported_model_id === "string" ? row.supported_model_id : null;
    if (!supportedId) continue;
    const list = providerModelsBySupportedId.get(supportedId) ?? [];
    list.push((row as unknown) as Record<string, unknown>);
    providerModelsBySupportedId.set(supportedId, list);
  }

  const models = (data ?? []) as SupportedModelRow[];
  const modelDocRows = models.map((model) => {
    const mapping = providerModelsBySupportedId.get(model.id)?.[0];
    const inputSchema = mapping && typeof mapping.input_schema === "object" ? (mapping.input_schema as Record<string, unknown>) : {};
    const outputSchema = mapping && typeof mapping.output_schema === "object" ? (mapping.output_schema as Record<string, unknown>) : {};
    const executionConfig = mapping && typeof mapping.execution_config === "object" ? (mapping.execution_config as Record<string, unknown>) : {};
    return {
      id: model.id,
      publicModel: model.model_slug,
      displayName: model.display_name,
      providerName: model.provider,
      upstreamModelSlug: mapping && typeof mapping.upstream_model_slug === "string" ? mapping.upstream_model_slug : "",
      capability: mapping && typeof mapping.capability === "string" ? mapping.capability : (model.capability ?? "image_generation"),
      inputSchemaText: JSON.stringify(inputSchema ?? {}, null, 2),
      outputSchemaText: JSON.stringify(outputSchema ?? {}, null, 2),
      officialDocUrl: null,
      executionConfigText: JSON.stringify(executionConfig ?? {}, null, 2),
      requestExampleJson: null,
      submitResponseExampleJson: null,
      normalizedOutputExampleJson: null,
      modelTypeLabel: readMetaField(model.billing_config, "modelType"),
      priceLabel: billingSummary(model.billing_config),
      modelDescription: readMetaField(model.billing_config, "modelDescription"),
    };
  });

  const vendorOptions = ((vendorRows ?? []) as Array<{ name: string | null }>)
    .map((row) => row.name?.trim() ?? "")
    .filter((name) => name.length > 0);

  return { modelDocRows, vendorOptions };
}

type ModelsPageShellProps = {
  initialProvider?: string;
  initialModelSlug?: string;
};

async function ModelsPageShell({ initialProvider, initialModelSlug }: ModelsPageShellProps) {
  const { modelDocRows, vendorOptions } = await loadModelsPageData();

  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-5 xl:px-0">
      <ProductTopTabs />
      <div className="mb-2">
        <ModelsBrowser
          rows={modelDocRows}
          vendorOptions={vendorOptions}
          initialProvider={initialProvider}
          initialModelSlug={initialModelSlug}
        />
      </div>
    </main>
  );
}

export default async function ModelsPage() {
  return <ModelsPageShell />;
}

export async function ModelsProviderModelPage({
  params,
}: {
  params: Promise<{ provider: string; modelSlug: string[] }>;
}) {
  const resolved = await params;
  const modelSlug = Array.isArray(resolved.modelSlug)
    ? resolved.modelSlug.join("/")
    : "";

  return (
    <ModelsPageShell
      initialProvider={decodeURIComponent(resolved.provider)}
      initialModelSlug={decodeURIComponent(modelSlug)}
    />
  );
}
