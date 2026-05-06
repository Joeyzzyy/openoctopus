"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type ModelCatalogRow = {
  id: string;
  publicModel: string;
  providerName: string;
  providerKind: string;
  upstreamModelSlug: string;
  capability: string;
  strategy: string;
  primary: string;
  fallback: string;
};

function providerToneClass(providerKind: string) {
  if (providerKind === "wavespeed") {
    return "bg-[#edf8f0] text-[#1f6b3b]";
  }

  if (providerKind === "partner") {
    return "bg-[#eef2ff] text-[#355fb4]";
  }

  return "bg-[#f4f5f0] text-black/60";
}

export function ModelCatalogTable({
  rows,
}: {
  rows: ModelCatalogRow[];
}) {
  const [openRowId, setOpenRowId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-8 text-sm text-black/50">
        No routed provider models are enabled yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left">
            {["Model", "Provider", "Capability", "Strategy", ""].map((heading) => (
              <th
                key={heading}
                className="px-3 py-2 text-[10px] uppercase tracking-[1px] text-black/40"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openRowId === row.id;

            return (
              <Fragment key={row.id}>
                <tr className="bg-[#FCFCFA]">
                  <td className="rounded-l-[16px] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-medium text-black">{row.publicModel}</p>
                      <p className="mt-0.5 break-all font-mono text-[11px] text-black/40">
                        {row.upstreamModelSlug}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-black/70">
                    <span
                      className={cn(
                        "inline-flex rounded-md px-2 py-1 text-[11px]",
                        providerToneClass(row.providerKind)
                      )}
                    >
                      {row.providerName}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-sm text-black/60">{row.capability}</td>
                  <td className="px-3 py-2.5 text-sm text-black/60">{row.strategy}</td>
                  <td className="rounded-r-[14px] px-3 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => setOpenRowId(open ? null : row.id)}
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/70 transition-colors hover:bg-black/[0.03]"
                    >
                      {open ? "Collapse" : "Expand"}
                      <ChevronDown
                        className={cn("size-3.5 transition-transform", open && "rotate-180")}
                      />
                    </button>
                  </td>
                </tr>
                {open ? (
                  <tr>
                    <td colSpan={5} className="px-0 pb-2 pt-0">
                      <div className="rounded-2xl border border-black/[0.08] bg-white px-4 py-4 shadow-sm">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[1px] text-black/40">
                              Primary Route
                            </p>
                            <p className="mt-2 break-all text-sm text-black">{row.primary}</p>
                          </div>
                          <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[1px] text-black/40">
                              Fallback Route
                            </p>
                            <p className="mt-2 break-all text-sm text-black">{row.fallback}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
