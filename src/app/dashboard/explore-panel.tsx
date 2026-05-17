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

function capabilityToCategory(capability: string) {
  const normalized = capability.toLowerCase();
  if (normalized.includes("video")) {
    return "Text to Video";
  }
  if (normalized.includes("image_edit")) {
    return "Image to Image";
  }
  if (normalized.includes("image")) {
    return "Text to Image";
  }
  if (normalized.includes("text") || normalized.includes("code")) {
    return "Text";
  }
  return "Other";
}

function modelToCategory(model: ExploreModel) {
  return model.modelTypeLabel.trim() || capabilityToCategory(model.capability);
}

function buildCategoryList(models: ExploreModel[]) {
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const model of models) {
    const category = modelToCategory(model);
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
}: {
  models: ExploreModel[];
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const providers = useMemo(() => Array.from(new Set(models.map((item) => item.providerName))), [models]);
  const categories = useMemo(() => buildCategoryList(models), [models]);
  const [activeProvider, setActiveProvider] = useState<string>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const effectiveSelectedCategories = selectedCategories.length > 0 ? selectedCategories : categories;
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const model of models) {
      if (activeProvider !== "all" && model.providerName !== activeProvider) continue;
      const category = modelToCategory(model);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [activeProvider, models]);

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const category = modelToCategory(model);
      const providerMatched = activeProvider === "all" || model.providerName === activeProvider;
      const categoryMatched = effectiveSelectedCategories.includes(category);
      return providerMatched && categoryMatched;
    });
  }, [activeProvider, effectiveSelectedCategories, models]);

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
      <div className="rounded-2xl border border-[#E7E0D3] bg-white p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-[1px] text-black/45">Model Providers</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveProvider("all")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
              activeProvider === "all"
                ? "border-[#E58A35] bg-[#FFF1DD] text-[#9A4F18]"
                : "border-[#E7E0D3] bg-white text-black/65 hover:bg-[#FFF7EA]"
            )}
          >
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-black/5 text-[10px]">ALL</span>
            <span>All providers</span>
          </button>
          {providers.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => setActiveProvider(provider)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                activeProvider === provider
                  ? "border-[#E58A35] bg-[#FFF1DD] text-[#9A4F18]"
                  : "border-[#E7E0D3] bg-white text-black/65 hover:bg-[#FFF7EA]"
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
        <aside className="rounded-2xl border border-[#E7E0D3] bg-white p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-[1px] text-black/45">Category</p>
          <div className="space-y-2">
            {categories.map((category) => (
              <label key={category} className="flex cursor-pointer items-center gap-2 text-sm text-black/80">
                <input
                  type="checkbox"
                  checked={effectiveSelectedCategories.includes(category)}
                  onChange={() => toggleCategory(category)}
                  className="size-4 rounded border-[#CFC6B6] text-[#B7661F] focus:ring-[#E58A35]"
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
              const category = modelToCategory(model);
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
                  className="block overflow-hidden rounded-2xl border border-[#E7E0D3] bg-white shadow-sm transition-colors hover:border-[#D7C6AE]"
                >
                  <div className="flex h-full min-h-[120px] items-center">
                    <div className="ml-3 size-20 shrink-0 overflow-hidden rounded-lg bg-[#F6F3EE] sm:size-24">
                      {model.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={model.coverImageUrl} alt={model.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center px-2 text-center text-xs text-black/40">
                          No cover image
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-between space-y-1.5 p-3">
                      <div className="space-y-1.5">
                        <p className="text-[10px] uppercase tracking-[0.8px] text-black/45">{category}</p>
                        <h3 className="line-clamp-1 text-sm font-semibold text-black">{model.displayName}</h3>
                        <p className="line-clamp-2 text-xs leading-5 text-black/60">
                          {model.modelDescription || "No introduction available yet."}
                        </p>
                      </div>
                      <p className="text-xs font-medium text-[#9A4F18]">{model.priceLabel || "Pricing unavailable"}</p>
                    </div>
                  </div>
                </a>
              );
            })
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] p-6 text-sm text-black/55">
              No models match the selected provider/category filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
