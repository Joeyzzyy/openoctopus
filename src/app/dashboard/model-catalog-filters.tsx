"use client";

import { useMemo } from "react";

type ModelType = "image" | "video" | "text-coding";

type ModelOption = {
  slug: string;
  label: string;
  capability: string;
};

function capabilityGroup(capability: string): ModelType {
  if (capability.includes("video")) {
    return "video";
  }
  if (
    capability.includes("text") ||
    capability.includes("code") ||
    capability.includes("document")
  ) {
    return "text-coding";
  }
  return "image";
}

export function ModelCatalogFilters({
  selectedType,
  selectedModelSlug,
  modelOptions,
  onNavigate,
}: {
  selectedType: ModelType;
  selectedModelSlug: string | null;
  modelOptions: ModelOption[];
  onNavigate: (nextType: ModelType, nextModelSlug: string | null) => void;
}) {
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
    return grouped[selectedType];
  }, [grouped, selectedType]);

  return (
    <div className="grid gap-3 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] p-3 md:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">Model Type</span>
        <select
          value={selectedType}
          onChange={(event) => {
            const nextType = event.target.value as ModelType;
            const nextVisibleModels = grouped[nextType];
            const currentStillVisible = nextVisibleModels.some(
              (item) => item.slug === selectedModelSlug
            );
            const nextSlug =
              currentStillVisible && selectedModelSlug
                ? selectedModelSlug
                : (nextVisibleModels[0]?.slug ?? null);
            onNavigate(nextType, nextSlug);
          }}
          className="h-9 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-xs text-black/80 focus:border-[#38BDF8]"
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
          <option value="text-coding">Text / Coding</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">Model</span>
        <select
          value={selectedModelSlug ?? visibleModels[0]?.slug ?? ""}
          onChange={(event) => onNavigate(selectedType, event.target.value || null)}
          className="h-9 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-xs text-black/80 focus:border-[#38BDF8]"
        >
          {visibleModels.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
