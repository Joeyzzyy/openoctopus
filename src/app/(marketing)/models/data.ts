import { cache } from "react";
import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createAdminClient } from "@/lib/supabase/admin";

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

type ProviderModelShowcaseAssetRow = {
  provider_model_id: string;
  asset_kind: "cover" | "gallery";
  public_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type ModelDocRow = {
  id: string;
  publicModel: string;
  displayName: string;
  providerName: string;
  upstreamModelSlug: string;
  capability: string;
  inputSchemaText: string;
  outputSchemaText: string;
  executionConfigText: string;
  requestExampleJson: string | null;
  submitResponseExampleJson: string | null;
  normalizedOutputExampleJson: string | null;
  readmeMarkdown: string | null;
  coverImageUrl: string | null;
  coverImagePrompt: string | null;
  showcaseImageUrls: string[];
  showcaseImagePrompts: Array<string | null>;
  modelTypeLabel: string;
  priceLabel: string;
  modelDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  billingCurrency: string;
  primaryPriceValue: number | null;
  primaryPriceLabel: string | null;
};

function parseMetadataRecord(value: unknown) {
  try {
    const raw =
      typeof value === "string"
        ? (JSON.parse(value) as Record<string, unknown>)
        : ((value as Record<string, unknown>) ?? {});
    return raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata)
      ? (raw.metadata as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readMetaField(value: unknown, key: string) {
  try {
    const raw =
      typeof value === "string"
        ? (JSON.parse(value) as Record<string, unknown>)
        : ((value as Record<string, unknown>) ?? {});
    const metadata = parseMetadataRecord(value);
    if (typeof metadata?.[key] === "string" && String(metadata[key]).trim()) return String(metadata[key]).trim();
    if (typeof raw[key] === "string" && String(raw[key]).trim()) return String(raw[key]).trim();
    return "";
  } catch {
    return "";
  }
}

function readKeywordList(value: unknown) {
  const raw = readMetaField(value, "seoKeywords");
  if (!raw) return [];
  const seen = new Set<string>();
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => {
      if (!item) return false;
      const normalized = item.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

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

function readPrimaryPrice(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    const { charges, currency } = normalized;
    if (charges.perImage) return { billingCurrency: currency, primaryPriceValue: charges.perImage, primaryPriceLabel: "per image" };
    if (charges.perVideo) return { billingCurrency: currency, primaryPriceValue: charges.perVideo, primaryPriceLabel: "per video" };
    if (charges.perRequest) return { billingCurrency: currency, primaryPriceValue: charges.perRequest, primaryPriceLabel: "per request" };
    if (charges.perSecond) return { billingCurrency: currency, primaryPriceValue: charges.perSecond, primaryPriceLabel: "per second" };
    if (charges.inputTextTokensPerMillion) {
      return { billingCurrency: currency, primaryPriceValue: charges.inputTextTokensPerMillion, primaryPriceLabel: "per 1M input tokens" };
    }
    if (charges.outputTextTokensPerMillion) {
      return { billingCurrency: currency, primaryPriceValue: charges.outputTextTokensPerMillion, primaryPriceLabel: "per 1M output tokens" };
    }
    return { billingCurrency: currency, primaryPriceValue: null, primaryPriceLabel: null };
  } catch {
    return { billingCurrency: "USD", primaryPriceValue: null, primaryPriceLabel: null };
  }
}

function stripRichText(input: string) {
  return input
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function summarizeReadme(readme: string | null) {
  if (!readme?.trim()) return "";
  const text = stripRichText(readme);
  if (!text) return "";
  return text.length > 180 ? `${text.slice(0, 177).trimEnd()}...` : text;
}

export function slugifyModelPathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildModelCanonicalPath(model: Pick<ModelDocRow, "providerName" | "publicModel">) {
  const providerSlug = slugifyModelPathPart(model.providerName) || encodeURIComponent(model.providerName);
  const modelSlug = slugifyModelPathPart(model.publicModel) || encodeURIComponent(model.publicModel);
  return `/models/${providerSlug}/${modelSlug}`;
}

export function resolveSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return value ? value.replace(/\/$/, "") : "http://localhost:3000";
}

export function buildAbsoluteUrl(path: string) {
  const base = resolveSiteUrl();
  return new URL(path, `${base}/`).toString();
}

export function buildModelSeoTitle(model: ModelDocRow) {
  return model.seoTitle || `${model.displayName} by ${model.providerName} | Pricing, Prompt Guide & API`;
}

export function buildModelSeoDescription(model: ModelDocRow) {
  const fallback =
    model.modelDescription ||
    summarizeReadme(model.readmeMarkdown) ||
    `${model.displayName} on OpenOctopus with live pricing, prompt examples, and API usage guidance.`;
  const description = model.seoDescription || fallback;
  return description.length > 180 ? `${description.slice(0, 177).trimEnd()}...` : description;
}

export function buildModelSeoKeywords(model: ModelDocRow) {
  const seen = new Set<string>();
  const keywords = [
    ...model.seoKeywords,
    model.displayName,
    model.publicModel,
    `${model.providerName} ${model.displayName}`,
    model.modelTypeLabel,
    model.capability,
  ];
  return keywords.filter((item) => {
    const value = item?.trim();
    if (!value) return false;
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function buildModelStructuredData(model: ModelDocRow) {
  const canonicalUrl = buildAbsoluteUrl(buildModelCanonicalPath(model));
  const description = buildModelSeoDescription(model);
  const graph: Array<Record<string, unknown>> = [
    {
      "@type": "SoftwareApplication",
      name: model.displayName,
      description,
      applicationCategory: model.modelTypeLabel || "AI Model",
      operatingSystem: "Web",
      url: canonicalUrl,
      image: model.coverImageUrl || model.showcaseImageUrls[0] || undefined,
      keywords: buildModelSeoKeywords(model).join(", "),
      publisher: {
        "@type": "Organization",
        name: "OpenOctopus",
      },
      author: {
        "@type": "Organization",
        name: model.providerName,
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Models",
          item: buildAbsoluteUrl("/models"),
        },
        {
          "@type": "ListItem",
          position: 2,
          name: model.displayName,
          item: canonicalUrl,
        },
      ],
    },
  ];

  if (model.primaryPriceValue !== null && model.primaryPriceLabel) {
    graph[0].offers = {
      "@type": "Offer",
      price: model.primaryPriceValue,
      priceCurrency: model.billingCurrency,
      description: model.primaryPriceLabel,
      url: canonicalUrl,
    };
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function matchModelDocRow(
  rows: ModelDocRow[],
  provider: string,
  modelSlug: string
) {
  const normalizedProvider = slugifyModelPathPart(provider);
  const normalizedModelSlug = slugifyModelPathPart(modelSlug);
  return (
    rows.find(
      (row) =>
        slugifyModelPathPart(row.providerName) === normalizedProvider &&
        slugifyModelPathPart(row.publicModel) === normalizedModelSlug
    ) ?? null
  );
}

export const loadModelsPageData = cache(async () => {
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

  const { data: showcaseAssetRows, error: showcaseAssetError } = await supabase
    .from("provider_model_showcase_assets")
    .select("provider_model_id, asset_kind, public_url, alt_text, sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (showcaseAssetError) throw new Error(showcaseAssetError.message);

  const providerModelsBySupportedId = new Map<string, Array<Record<string, unknown>>>();
  for (const row of providerModelRows ?? []) {
    const supportedId = typeof row.supported_model_id === "string" ? row.supported_model_id : null;
    if (!supportedId) continue;
    const list = providerModelsBySupportedId.get(supportedId) ?? [];
    list.push((row as unknown) as Record<string, unknown>);
    providerModelsBySupportedId.set(supportedId, list);
  }
  const showcaseAssetsByProviderModelId = ((showcaseAssetRows ?? []) as ProviderModelShowcaseAssetRow[]).reduce(
    (map, asset) => {
      const list = map.get(asset.provider_model_id) ?? [];
      list.push(asset);
      map.set(asset.provider_model_id, list);
      return map;
    },
    new Map<string, ProviderModelShowcaseAssetRow[]>()
  );

  const models = (data ?? []) as SupportedModelRow[];
  const modelDocRows: ModelDocRow[] = models.map((model) => {
    const mapping = providerModelsBySupportedId.get(model.id)?.[0];
    const inputSchema = mapping && typeof mapping.input_schema === "object" ? (mapping.input_schema as Record<string, unknown>) : {};
    const outputSchema = mapping && typeof mapping.output_schema === "object" ? (mapping.output_schema as Record<string, unknown>) : {};
    const executionConfig = mapping && typeof mapping.execution_config === "object" ? (mapping.execution_config as Record<string, unknown>) : {};
    const executionDoc =
      executionConfig.doc && typeof executionConfig.doc === "object" && !Array.isArray(executionConfig.doc)
        ? (executionConfig.doc as Record<string, unknown>)
        : {};
    const showcaseAssets =
      mapping && typeof mapping.id === "string"
        ? showcaseAssetsByProviderModelId.get(mapping.id) ?? []
        : [];
    const primaryPrice = readPrimaryPrice(model.billing_config);

    return {
      id: model.id,
      publicModel: model.model_slug,
      displayName: model.display_name,
      providerName: model.provider,
      upstreamModelSlug: mapping && typeof mapping.upstream_model_slug === "string" ? mapping.upstream_model_slug : "",
      capability: mapping && typeof mapping.capability === "string" ? mapping.capability : (model.capability ?? "image_generation"),
      inputSchemaText: JSON.stringify(inputSchema ?? {}, null, 2),
      outputSchemaText: JSON.stringify(outputSchema ?? {}, null, 2),
      executionConfigText: JSON.stringify(executionConfig ?? {}, null, 2),
      requestExampleJson:
        typeof executionDoc.requestExampleJson === "string"
          ? executionDoc.requestExampleJson
          : null,
      submitResponseExampleJson:
        typeof executionDoc.submitResponseExampleJson === "string"
          ? executionDoc.submitResponseExampleJson
          : null,
      normalizedOutputExampleJson:
        typeof executionDoc.normalizedOutputExampleJson === "string"
          ? executionDoc.normalizedOutputExampleJson
          : null,
      readmeMarkdown:
        typeof executionDoc.readmeMarkdown === "string" ? executionDoc.readmeMarkdown : null,
      coverImageUrl:
        showcaseAssets.find((asset) => asset.asset_kind === "cover")?.public_url ?? null,
      coverImagePrompt:
        showcaseAssets.find((asset) => asset.asset_kind === "cover")?.alt_text ?? null,
      showcaseImageUrls: showcaseAssets
        .filter((asset) => asset.asset_kind === "gallery")
        .map((asset) => asset.public_url),
      showcaseImagePrompts: showcaseAssets
        .filter((asset) => asset.asset_kind === "gallery")
        .map((asset) => asset.alt_text ?? null),
      modelTypeLabel: readMetaField(model.billing_config, "modelType"),
      priceLabel: billingSummary(model.billing_config),
      modelDescription: readMetaField(model.billing_config, "modelDescription"),
      seoTitle: readMetaField(model.billing_config, "seoTitle"),
      seoDescription: readMetaField(model.billing_config, "seoDescription"),
      seoKeywords: readKeywordList(model.billing_config),
      billingCurrency: primaryPrice.billingCurrency,
      primaryPriceValue: primaryPrice.primaryPriceValue,
      primaryPriceLabel: primaryPrice.primaryPriceLabel,
    };
  });

  const vendorOptions = ((vendorRows ?? []) as Array<{ name: string | null }>)
    .map((row) => row.name?.trim() ?? "")
    .filter((name) => name.length > 0);

  return { modelDocRows, vendorOptions };
});

export const findModelDocRowByRoute = cache(async (provider: string, modelSlug: string) => {
  const { modelDocRows } = await loadModelsPageData();
  return matchModelDocRow(modelDocRows, provider, modelSlug);
});
