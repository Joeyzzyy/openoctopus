import { cache } from "react";
import { normalizeBillingConfig, parseBillingConfig } from "@/lib/billing-config";
import { createAdminClient } from "@/lib/supabase/admin";

type SupportedModelRow = {
  id: string;
  provider: string;
  model_slug: string;
  display_name: string;
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation" | null;
  billing_config: unknown;
  active: boolean;
  created_at: string;
};

type ProviderModelShowcaseAssetRow = {
  provider_model_id: string;
  asset_kind: "cover" | "gallery" | "playground_input";
  public_url: string;
  alt_text: string | null;
  sort_order: number;
};

export type ModelDocRow = {
  id: string;
  publicModel: string;
  displayName: string;
  providerName: string;
  allowContinuousOperations: boolean;
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
  playgroundInputImageUrl: string | null;
  playgroundInputPrompt: string | null;
  playgroundInputExamples: Array<{
    fieldKey: string | null;
    imageUrl: string;
    prompt: string | null;
  }>;
  modelTypeLabel: string;
  priceLabel: string;
  modelDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  billingCurrency: string;
  primaryPriceValue: number | null;
  primaryPriceLabel: string | null;
  priceTiers: Array<{
    resolution: string;
    quality: string;
    duration?: string;
    hasReferenceVideos?: string;
    hasAudio?: string;
    price: number;
    label: string;
  }>;
  booleanSurcharges: Array<{
    name: string;
    price: number;
    label: string;
  }>;
};

export type GatewayErrorDocRow = {
  code: string;
  httpStatus: number;
  retryable: boolean;
  publicMessage: string;
  category: string;
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

function readMetaBoolean(value: unknown, key: string) {
  const metadata = parseMetadataRecord(value);
  return metadata?.[key] === true || metadata?.[key] === "true";
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

const QUALITY_ORDER = ["low", "medium", "high"];
const FACE_PLAYGROUND_INPUT_MARKER = "[[playground_input:face_image]]";

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 0.1 ? 2 : 3,
    maximumFractionDigits: value >= 0.1 ? 2 : 3,
  }).format(value);
}

function splitCombinationKey(key: string) {
  if (key.includes("=")) {
    const result: Record<string, string> = {};
    for (const part of key.split("__")) {
      const separatorIndex = part.indexOf("=");
      if (separatorIndex <= 0 || separatorIndex === part.length - 1) continue;
      const name = part.slice(0, separatorIndex).trim();
      const value = part.slice(separatorIndex + 1).trim();
      if (!name || !value) continue;
      result[name] = value;
    }
    return {
      resolution: result.resolution || "default",
      quality: result.quality || "default",
      duration: result.duration || "default",
      hasReferenceVideos: result.hasReferenceVideos || "default",
      hasAudio: result.hasAudio || "default",
    };
  }

  const [resolution, quality] = key.split("__");
  return {
    resolution: resolution || "default",
    quality: quality || "default",
    duration: "default",
    hasReferenceVideos: "default",
    hasAudio: "default",
  };
}

function tierDimensionLabel(name: string, value: string) {
  return value === "default" ? "" : `${name}: ${value}`;
}

function isFacePlaygroundInputAsset(asset: ProviderModelShowcaseAssetRow) {
  return asset.asset_kind === "gallery" && asset.alt_text?.startsWith(FACE_PLAYGROUND_INPUT_MARKER);
}

function stripFacePlaygroundPrompt(value: string | null) {
  if (!value?.startsWith(FACE_PLAYGROUND_INPUT_MARKER)) return value;
  return value.slice(FACE_PLAYGROUND_INPUT_MARKER.length).trim() || null;
}

function readPriceTiers(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    const combinationTiers = Object.entries(normalized.parameterPrices?.combinations ?? {})
      .map(([key, price]) => {
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) return null;
        const labels = splitCombinationKey(key);
        const labelParts = [
          tierDimensionLabel("Resolution", labels.resolution),
          tierDimensionLabel("Duration", labels.duration),
          tierDimensionLabel("Quality", labels.quality),
          tierDimensionLabel("Reference Videos", labels.hasReferenceVideos),
          tierDimensionLabel("Audio", labels.hasAudio),
          `${formatUsd(numericPrice)} / image`,
        ].filter(Boolean);
        return {
          ...labels,
          price: numericPrice,
          label: labelParts.join(" · "),
        };
      })
      .filter((item): item is {
        resolution: string;
        quality: string;
        duration: string;
        hasReferenceVideos: string;
        hasAudio: string;
        price: number;
        label: string;
      } => Boolean(item))
      .sort((a, b) =>
        a.resolution.localeCompare(b.resolution, "en-US", { numeric: true }) ||
        a.duration.localeCompare(b.duration ?? "default", "en-US", { numeric: true }) ||
        (QUALITY_ORDER.indexOf(a.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(a.quality)) -
          (QUALITY_ORDER.indexOf(b.quality) === -1 ? 99 : QUALITY_ORDER.indexOf(b.quality)) ||
        a.hasReferenceVideos.localeCompare(b.hasReferenceVideos ?? "default", "en-US", { numeric: true }) ||
        a.hasAudio.localeCompare(b.hasAudio ?? "default", "en-US", { numeric: true }) ||
        a.quality.localeCompare(b.quality, "en-US", { numeric: true })
      );
    if (combinationTiers.length > 0) {
      return combinationTiers;
    }

    const perImage = Number(normalized.charges.perImage ?? 0);
    if (!Number.isFinite(perImage) || perImage <= 0) {
      return [];
    }
    const resolutionEntries = Object.entries(normalized.parameterMultipliers?.resolution ?? {});
    const qualityEntries = Object.entries(normalized.parameterMultipliers?.quality ?? {});
    if (resolutionEntries.length > 0 && qualityEntries.length === 0) {
      return resolutionEntries
        .map(([resolution, price]) => ({
          resolution,
          quality: "default",
          price: Number(price),
          label: [
            tierDimensionLabel("Resolution", resolution),
            `${formatUsd(Number(price))} / image`,
          ].filter(Boolean).join(" · "),
        }))
        .filter((item) => Number.isFinite(item.price) && item.price > 0)
        .sort((a, b) => a.resolution.localeCompare(b.resolution, "en-US", { numeric: true }));
    }
    if (qualityEntries.length > 0 && resolutionEntries.length === 0) {
      return qualityEntries
        .map(([quality, price]) => ({
          resolution: "default",
          quality,
          price: Number(price),
          label: [
            tierDimensionLabel("Quality", quality),
            `${formatUsd(Number(price))} / image`,
          ].filter(Boolean).join(" · "),
        }))
        .filter((item) => Number.isFinite(item.price) && item.price > 0)
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
        qualities.map(([quality, qualityMultiplier]) => {
          const price = Number((perImage * Number(resolutionMultiplier) * Number(qualityMultiplier)).toFixed(8));
          return {
            resolution,
            quality,
            price,
            label: [
              tierDimensionLabel("Resolution", resolution),
              tierDimensionLabel("Quality", quality),
              `${formatUsd(price)} / image`,
            ].filter(Boolean).join(" · "),
          };
        })
      )
      .filter((item) => Number.isFinite(item.price) && item.price > 0)
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

function readBooleanSurcharges(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    return Object.entries(normalized.parameterPrices?.booleanSurcharges ?? {})
      .map(([name, price]) => {
        const numericPrice = Number(price);
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) return null;
        return {
          name,
          price: numericPrice,
          label: `${name} + ${formatUsd(numericPrice)}`,
        };
      })
      .filter((item): item is { name: string; price: number; label: string } => Boolean(item));
  } catch {
    return [];
  }
}

function billingSummary(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    const parts: string[] = [];
    const { charges, currency } = normalized;
    const tiers = readPriceTiers(value);
    const booleanSurcharges = readBooleanSurcharges(value);
    if (charges.perRequest) parts.push(`per request ${charges.perRequest}`);
    if (tiers.length > 0) {
      const prices = tiers.map((tier) => tier.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      parts.push(min === max ? `${formatUsd(min)} per image` : `${formatUsd(min)}-${formatUsd(max)} per image`);
    } else if (charges.perImage) {
      parts.push(`per image ${charges.perImage}`);
    }
    if (tiers.length === 0 && charges.perVideo) parts.push(`per video ${charges.perVideo}`);
    if (charges.perSecond) parts.push(`per second ${charges.perSecond}`);
    if (charges.inputTextTokensPerMillion) parts.push(`per 1M input tokens ${charges.inputTextTokensPerMillion}`);
    if (charges.inputTextCacheHitTokensPerMillion) parts.push(`per 1M input tokens (cache hit) ${charges.inputTextCacheHitTokensPerMillion}`);
    if (charges.inputTextCacheMissTokensPerMillion) parts.push(`per 1M input tokens (cache miss) ${charges.inputTextCacheMissTokensPerMillion}`);
    if (charges.outputTextTokensPerMillion) parts.push(`per 1M output tokens ${charges.outputTextTokensPerMillion}`);
    if (booleanSurcharges.length > 0) parts.push(`${booleanSurcharges.length} optional add-ons`);
    return parts.some((part) => part.includes("$")) ? parts.join(" + ") : `${currency} ${parts.join(" + ")}`;
  } catch {
    return "Invalid pricing configuration";
  }
}

function readPrimaryPrice(value: unknown) {
  try {
    const normalized = normalizeBillingConfig(parseBillingConfig(value));
    const { charges, currency } = normalized;
    const tiers = readPriceTiers(value);
    if (tiers.length > 0) {
      const prices = tiers.map((tier) => tier.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      return {
        billingCurrency: currency,
        primaryPriceValue: min,
        primaryPriceLabel: min === max ? "per image" : `${formatUsd(min)}-${formatUsd(max)} per image`,
      };
    }
    if (charges.perImage) return { billingCurrency: currency, primaryPriceValue: charges.perImage, primaryPriceLabel: "per image" };
    if (charges.perVideo) return { billingCurrency: currency, primaryPriceValue: charges.perVideo, primaryPriceLabel: "per video" };
    if (charges.perRequest) return { billingCurrency: currency, primaryPriceValue: charges.perRequest, primaryPriceLabel: "per request" };
    if (charges.perSecond) return { billingCurrency: currency, primaryPriceValue: charges.perSecond, primaryPriceLabel: "per second" };
    if (charges.inputTextCacheMissTokensPerMillion) {
      return { billingCurrency: currency, primaryPriceValue: charges.inputTextCacheMissTokensPerMillion, primaryPriceLabel: "per 1M input tokens (cache miss)" };
    }
    if (charges.inputTextCacheHitTokensPerMillion) {
      return { billingCurrency: currency, primaryPriceValue: charges.inputTextCacheHitTokensPerMillion, primaryPriceLabel: "per 1M input tokens (cache hit)" };
    }
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

  const { data: errorCodeRows, error: errorCodeError } = await supabase
    .from("gateway_error_definitions")
    .select("code, category, http_status, public_message, retryable, active, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });
  if (errorCodeError) throw new Error(errorCodeError.message);

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
    const priceTiers = readPriceTiers(model.billing_config);
    const booleanSurcharges = readBooleanSurcharges(model.billing_config);

    const playgroundInputAssets = [
      ...showcaseAssets.filter((asset) => asset.asset_kind === "playground_input"),
      ...showcaseAssets.filter(isFacePlaygroundInputAsset),
    ];
    const primaryPlaygroundInputAsset = playgroundInputAssets[0] ?? null;

    return {
      id: model.id,
      publicModel: model.model_slug,
      displayName: model.display_name,
      providerName: model.provider,
      allowContinuousOperations: readMetaBoolean(model.billing_config, "allowContinuousOperations"),
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
        .filter((asset) => asset.asset_kind === "gallery" && !isFacePlaygroundInputAsset(asset))
        .map((asset) => asset.public_url),
      showcaseImagePrompts: showcaseAssets
        .filter((asset) => asset.asset_kind === "gallery" && !isFacePlaygroundInputAsset(asset))
        .map((asset) => asset.alt_text ?? null),
      playgroundInputImageUrl:
        primaryPlaygroundInputAsset?.public_url ?? null,
      playgroundInputPrompt:
        primaryPlaygroundInputAsset?.alt_text ?? null,
      playgroundInputExamples: playgroundInputAssets.map((asset) => ({
        fieldKey: isFacePlaygroundInputAsset(asset) ? "face_image" : null,
        imageUrl: asset.public_url,
        prompt: stripFacePlaygroundPrompt(asset.alt_text ?? null),
      })),
      modelTypeLabel: readMetaField(model.billing_config, "modelType"),
      priceLabel: billingSummary(model.billing_config),
      modelDescription: readMetaField(model.billing_config, "modelDescription"),
      seoTitle: readMetaField(model.billing_config, "seoTitle"),
      seoDescription: readMetaField(model.billing_config, "seoDescription"),
      seoKeywords: readKeywordList(model.billing_config),
      billingCurrency: primaryPrice.billingCurrency,
      primaryPriceValue: primaryPrice.primaryPriceValue,
      primaryPriceLabel: primaryPrice.primaryPriceLabel,
      priceTiers,
      booleanSurcharges,
    };
  });

  const vendorOptions = ((vendorRows ?? []) as Array<{ name: string | null }>)
    .map((row) => row.name?.trim() ?? "")
    .filter((name) => name.length > 0);

  const gatewayErrorDocs: GatewayErrorDocRow[] = ((errorCodeRows ?? []) as Array<Record<string, unknown>>).map((row) => ({
    code: typeof row.code === "string" ? row.code : "",
    category: typeof row.category === "string" ? row.category : "general",
    httpStatus: Number(row.http_status ?? 500),
    publicMessage: typeof row.public_message === "string" ? row.public_message : "",
    retryable: row.retryable === true,
  })).filter((row) => row.code.length > 0);

  return { modelDocRows, vendorOptions, gatewayErrorDocs };
});

export const findModelDocRowByRoute = cache(async (provider: string, modelSlug: string) => {
  const { modelDocRows } = await loadModelsPageData();
  return matchModelDocRow(modelDocRows, provider, modelSlug);
});
