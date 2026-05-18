"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type ExploreModel = {
  id: string;
  displayName: string;
  providerName: string;
  capability: string;
  modelTypeLabel: string;
  modelDescription: string;
  priceLabel: string;
  coverImageUrl: string | null;
  modelHref: string;
};

type ExploreLabels = {
  providers: string;
  all: string;
  allProviders: string;
  category: string;
  noCover: string;
  noDescription: string;
  pricingUnavailable: string;
  noMatches: string;
  textToVideo: string;
  imageToImage: string;
  textToImage: string;
  text: string;
  other: string;
};

const defaultLabels: ExploreLabels = {
  providers: "Model Providers",
  all: "ALL",
  allProviders: "All providers",
  category: "Category",
  noCover: "No cover image",
  noDescription: "No introduction available yet.",
  pricingUnavailable: "Pricing unavailable",
  noMatches: "No models match the selected provider/category filters.",
  textToVideo: "Text to Video",
  imageToImage: "Image to Image",
  textToImage: "Text to Image",
  text: "Text",
  other: "Other",
};

function capabilityToCategory(capability: string, labels: ExploreLabels) {
  const normalized = capability.toLowerCase();
  if (normalized.includes("video")) {
    return labels.textToVideo;
  }
  if (normalized.includes("image_edit")) {
    return labels.imageToImage;
  }
  if (normalized.includes("image")) {
    return labels.textToImage;
  }
  if (normalized.includes("text") || normalized.includes("code")) {
    return labels.text;
  }
  return labels.other;
}

function modelToCategory(model: ExploreModel, labels: ExploreLabels) {
  return model.modelTypeLabel.trim() || capabilityToCategory(model.capability, labels);
}

function buildCategoryList(models: ExploreModel[], labels: ExploreLabels) {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const model of models) {
    const category = modelToCategory(model, labels);
    if (!seen.has(category)) {
      seen.add(category);
      categories.push(category);
    }
  }
  return categories;
}

export function ExplorePanel({
  models,
  isLoggedIn = true,
  labels = defaultLabels,
}: {
  models: ExploreModel[];
  isLoggedIn?: boolean;
  labels?: ExploreLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const providers = useMemo(() => Array.from(new Set(models.map((item) => item.providerName))), [models]);
  const categories = useMemo(() => buildCategoryList(models, labels), [labels, models]);
  const [activeProvider, setActiveProvider] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const effectiveSelectedCategories = selectedCategories.length > 0 ? selectedCategories : categories;
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) {
      if (activeProvider !== "all" && model.providerName !== activeProvider) continue;
      const category = modelToCategory(model, labels);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [activeProvider, labels, models]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const category = modelToCategory(model, labels);
      const providerMatched = activeProvider === "all" || model.providerName === activeProvider;
      const categoryMatched = effectiveSelectedCategories.includes(category);
      return providerMatched && categoryMatched;
    });
  }, [activeProvider, effectiveSelectedCategories, labels, models]);

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => {
      const current = prev.length > 0 ? prev : categories;
      const next = current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category];
      return next.length === categories.length ? [] : next;
    });
  };

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[#BAE6FD] bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[1px] text-black/45">{labels.providers}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveProvider("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
              activeProvider === "all"
                ? "border-[#38BDF8] bg-[#E0F2FE] text-[#0369A1]"
                : "border-[#BAE6FD] bg-white text-black/65 hover:bg-[#E0F2FE]"
            )}
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/5 text-[10px]">{labels.all}</span>
            <span>{labels.allProviders}</span>
          </button>
          {providers.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => setActiveProvider(provider)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                activeProvider === provider
                  ? "border-[#38BDF8] bg-[#E0F2FE] text-[#0369A1]"
                  : "border-[#BAE6FD] bg-white text-black/65 hover:bg-[#E0F2FE]"
              )}
            >
              <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/5 text-[11px] font-semibold">
                {provider.charAt(0).toUpperCase()}
              </span>
              <span>{provider}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[#BAE6FD] bg-white p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-[1px] text-black/45">{labels.category}</p>
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex cursor-pointer items-center gap-2 text-sm text-black/80">
                <input
                  type="checkbox"
                  checked={effectiveSelectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="size-4 rounded border-[#7DD3FC] text-[#0284C7] focus:ring-[#38BDF8]"
                />
                <span className="flex items-center gap-2">
                  <span>{category}</span>
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-black/[0.05] px-1.5 text-[11px] text-black/60">
                    {categoryCounts.get(category) ?? 0}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </aside>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredModels.length > 0 ? (
            filteredModels.map((model) => {
              const category = modelToCategory(model, labels);
              return (
                <a
                  key={model.id}
                  href={model.modelHref}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => {
                    if (!isLoggedIn) {
                      event.preventDefault();
                      const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
                      router.push(`/login?next=${encodeURIComponent(nextPath)}`);
                    }
                  }}
                  className="block overflow-hidden rounded-2xl border border-[#BAE6FD] bg-white shadow-sm transition-colors hover:border-[#7DD3FC]"
                >
                  <div className="flex h-full min-h-[120px] items-center">
                    <div className="ml-3 size-20 shrink-0 overflow-hidden rounded-lg bg-[#F0F9FF] sm:size-24">
                      {model.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={model.coverImageUrl} alt={model.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-black/40">
                          {labels.noCover}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between space-y-1.5 p-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.8px] text-black/45">{category}</p>
                        <h3 className="line-clamp-1 text-sm font-semibold text-black">{model.displayName}</h3>
                        <p className="line-clamp-2 text-xs leading-5 text-black/60">
                          {model.modelDescription || labels.noDescription}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-[#0369A1]">{model.priceLabel || labels.pricingUnavailable}</p>
                    </div>
                  </div>
                </a>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-black/[0.12] bg-[#F8FCFF] p-6 text-sm text-black/55">
              {labels.noMatches}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
