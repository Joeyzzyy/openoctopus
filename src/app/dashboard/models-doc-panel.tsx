"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ApiQuickstartCard } from "./api-quickstart-card";
import { ModelCatalogFilters } from "./model-catalog-filters";

type ModelType = "image" | "video" | "text-coding";

type ModelRow = {
  id: string;
  publicModel: string;
  displayName: string;
  capability: string;
  upstreamModelSlug: string;
  inputSchemaText: string;
  outputSchemaText: string;
  officialDocUrl: string | null;
  executionConfigText: string;
  requestExampleJson: string | null;
  submitResponseExampleJson: string | null;
  normalizedOutputExampleJson: string | null;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-black/[0.08] bg-white p-4">
      <div className="h-4 w-40 animate-pulse rounded bg-black/10" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-black/5" />
      <div className="h-10 w-full animate-pulse rounded-xl bg-black/5" />
      <div className="h-10 w-3/4 animate-pulse rounded-xl bg-black/5" />
    </div>
  );
}

export function ModelsDocPanel({
  selectedType,
  selectedModelSlug,
  allRows,
  filteredRows,
  baseParams,
}: {
  selectedType: ModelType;
  selectedModelSlug: string | null;
  allRows: ModelRow[];
  filteredRows: ModelRow[];
  baseParams: Record<string, string | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleNavigate = (nextType: ModelType, nextModelSlug: string | null) => {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(baseParams)) {
      if (value) {
        params.set(key, value);
      }
    }

    params.set("modelType", nextType);
    if (nextModelSlug) {
      params.set("modelSlug", nextModelSlug);
    }

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <>
      {isPending ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900/80">
            Loading model documentation...
          </div>
          <LoadingSkeleton />
        </div>
      ) : (
        <>
          <div className="mb-4">
            <ApiQuickstartCard
              models={filteredRows}
              initialModel={selectedModelSlug}
              headerControls={
                <ModelCatalogFilters
                  selectedType={selectedType}
                  selectedModelSlug={selectedModelSlug}
                  modelOptions={allRows.map((row) => ({
                    slug: row.publicModel,
                    label: row.displayName,
                    capability: row.capability,
                  }))}
                  onNavigate={handleNavigate}
                />
              }
            />
          </div>
        </>
      )}
    </>
  );
}
