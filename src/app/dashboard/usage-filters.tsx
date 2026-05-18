"use client";

import { useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type UsageRow = {
  time: string;
  apiKey: string;
  model: string;
  endpoint: string;
  units: string;
  cost: string;
  status: string;
};

const ALL = "__all__";

export function UsageTable({ usageRows }: { usageRows: UsageRow[] }) {
  const [keyFilter, setKeyFilter] = useState(ALL);
  const [modelFilter, setModelFilter] = useState(ALL);

  const uniqueKeys = useMemo(
    () => [...new Set(usageRows.map((r) => r.apiKey))],
    [usageRows]
  );
  const uniqueModels = useMemo(
    () => [...new Set(usageRows.map((r) => r.model))],
    [usageRows]
  );

  const filtered = useMemo(() => {
    return usageRows.filter((row) => {
      if (keyFilter !== ALL && row.apiKey !== keyFilter) return false;
      if (modelFilter !== ALL && row.model !== modelFilter) return false;
      return true;
    });
  }, [usageRows, keyFilter, modelFilter]);

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={keyFilter} onValueChange={(v) => v && setKeyFilter(v)}>
          <SelectTrigger className="h-8 rounded-md border-black/[0.08] bg-[#F8FCFF] px-2.5 font-mono text-[10px] uppercase tracking-[1px] shadow-sm">
            <SelectValue placeholder="All Keys" />
          </SelectTrigger>
          <SelectContent className="border border-black/[0.08] bg-white text-[#111827]">
            <SelectItem value={ALL}>All Keys</SelectItem>
            {uniqueKeys.map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modelFilter} onValueChange={(v) => v && setModelFilter(v)}>
          <SelectTrigger className="h-8 rounded-md border-black/[0.08] bg-[#F8FCFF] px-2.5 font-mono text-[10px] uppercase tracking-[1px] shadow-sm">
            <SelectValue placeholder="All Models" />
          </SelectTrigger>
          <SelectContent className="border border-black/[0.08] bg-white text-[#111827]">
            <SelectItem value={ALL}>All Models</SelectItem>
            {uniqueModels.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(keyFilter !== ALL || modelFilter !== ALL) && (
          <button
            onClick={() => {
              setKeyFilter(ALL);
              setModelFilter(ALL);
            }}
            className="font-mono text-[10px] uppercase tracking-[1px] text-black/40 underline hover:text-black/60"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Results */}
      <div className="mt-4 sm:mt-5">
        {filtered.length > 0 ? (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filtered.map((row, i) => (
                <div
                  key={`${row.time}-${row.apiKey}-${i}`}
                  className="rounded-2xl border border-black/[0.06] bg-[#F8FCFF] p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-[13px] font-semibold text-[#111111]">
                        {row.model}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                        {row.apiKey} · {row.status}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-[13px] font-semibold text-[#111111]">
                      {row.cost}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-black/40">
                    <span>{row.endpoint}</span>
                    <span>{row.units}</span>
                  </div>
                  <p className="mt-1 font-mono text-[10px] text-black/35">
                    {row.time}
                  </p>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left">
                    {[
                      "Timestamp",
                      "API Key",
                      "Model",
                      "Endpoint",
                      "Units",
                      "Cost",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-2 font-mono text-[10px] uppercase tracking-[1px] text-black/40"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr
                      key={`${row.time}-${row.apiKey}-${i}`}
                      className="bg-white"
                    >
                      <td className="rounded-l-[16px] px-3 py-3 text-sm text-black/60">
                        {row.time}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm font-semibold text-[#111111]">
                        {row.apiKey}
                      </td>
                      <td className="px-3 py-3 text-sm text-black/60">
                        {row.model}
                      </td>
                      <td className="px-3 py-3 font-mono text-[11px] text-black/55">
                        {row.endpoint}
                      </td>
                      <td className="px-3 py-3 text-sm text-black/60">
                        {row.units}
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-[#111111]">
                        {row.cost}
                      </td>
                      <td className="rounded-r-[16px] px-3 py-3">
                        <span className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-black/[0.06] bg-[#F8FCFF] px-3 py-6 text-center text-sm text-black/50">
            No usage events match the current filters.
          </div>
        )}
      </div>
    </>
  );
}
