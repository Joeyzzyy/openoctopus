"use client";

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

export function ModelCatalogTable({
  rows,
}: {
  rows: ModelCatalogRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-8 text-sm text-black/50">
        No available models.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1280px] w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">MODEL</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">UPSTREAM</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">PROVIDER</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">CAPABILITY</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">STRATEGY</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">PRIMARY ROUTE</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">FALLBACK ROUTE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-black/10 align-middle">
              <td className="px-3 py-3 align-middle text-black">{row.publicModel}</td>
              <td className="px-3 py-3 align-middle font-mono text-[12px] text-black/65">
                {row.upstreamModelSlug}
              </td>
              <td className="px-3 py-3 align-middle text-black">{row.providerName}</td>
              <td className="px-3 py-3 align-middle text-black/75">{row.capability}</td>
              <td className="px-3 py-3 align-middle text-black/75">{row.strategy}</td>
              <td className="px-3 py-3 align-middle text-black/75">{row.primary}</td>
              <td className="px-3 py-3 align-middle text-black/75">{row.fallback}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
