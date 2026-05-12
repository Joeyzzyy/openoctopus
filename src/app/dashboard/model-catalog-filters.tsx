"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";

type ModelType = "all" | "image" | "video" | "text-coding";

type ModelOption = {
  slug: string;
  label: string;
  capability: string;
};

function capabilityGroup(capability: string): Exclude<ModelType, "all"> {
  if (capability.includes("video")) {
    return "video";
  }
  if (capability.includes("text") || capability.includes("code")) {
    return "text-coding";
  }
  return "image";
}

export function ModelCatalogFilters({
  selectedType,
  selectedModelSlug,
  modelOptions,
  baseParams,
}: {
  selectedType: ModelType;
  selectedModelSlug: string | null;
  modelOptions: ModelOption[];
  baseParams: Record<string, string | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const grouped = useMemo(() => {
    const byType = {
      image: [] as ModelOption[],
      video: [] as ModelOption[],
      "text-coding": [] as ModelOption[],
    };
    for (const item of modelOptions) {
      byType[capabilityGroup(item.capability)].push(item);
    }
    return byType;
  }, [modelOptions]);

  const visibleModels = useMemo(() => {
    if (selectedType === "all") {
      return modelOptions;
    }
    return grouped[selectedType];
  }, [grouped, modelOptions, selectedType]);

  const navigate = (nextType: ModelType, nextModelSlug: string | null) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(baseParams)) {
      if (value) {
        params.set(key, value);
      }
    }

    if (nextType !== "all") {
      params.set("modelType", nextType);
    }
    if (nextModelSlug) {
      params.set("modelSlug", nextModelSlug);
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="grid gap-3 rounded-2xl border border-black/[0.08] bg-white p-3 md:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">Model Type</span>
        <select
          value={selectedType}
          onChange={(event) => {
            const nextType = event.target.value as ModelType;
            const nextVisibleModels =
              nextType === "all" ? modelOptions : grouped[nextType];
            const currentStillVisible = nextVisibleModels.some(
              (item) => item.slug === selectedModelSlug
            );
            navigate(nextType, currentStillVisible ? selectedModelSlug : null);
          }}
          className="h-9 w-full rounded-md border border-black/[0.1] bg-[#FCFCFA] px-3 text-xs text-black/80"
        >
          <option value="all">All types</option>
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="text-coding">Text / Coding</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">Model</span>
        <select
          value={selectedModelSlug ?? ""}
          onChange={(event) => navigate(selectedType, event.target.value || null)}
          className="h-9 w-full rounded-md border border-black/[0.1] bg-[#FCFCFA] px-3 text-xs text-black/80"
        >
          <option value="">All models</option>
          {(selectedType === "all" || selectedType === "image") && grouped.image.length > 0 ? (
            <optgroup label="Image">
              {grouped.image.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {(selectedType === "all" || selectedType === "video") && grouped.video.length > 0 ? (
            <optgroup label="Video">
              {grouped.video.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {(selectedType === "all" || selectedType === "text-coding") &&
          grouped["text-coding"].length > 0 ? (
            <optgroup label="Text / Coding">
              {grouped["text-coding"].map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </label>
    </div>
  );
}
