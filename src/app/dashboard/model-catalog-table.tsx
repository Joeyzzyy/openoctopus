"use client";

type ModelCatalogRow = {
  id: string;
  publicModel: string;
  upstreamModelSlug: string;
};

export function ModelCatalogTable({
  rows,
}: {
  rows: ModelCatalogRow[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#F8FCFF] px-4 py-8 text-sm text-black/50">
        No available models.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[760px] w-full text-sm">
        <thead>
          <tr className="border-b border-black/10 text-left">
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">MODEL</th>
            <th className="h-11 px-3 align-middle text-[10px] tracking-[1px] text-black/45">UPSTREAM SLUG</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-black/10 align-middle">
              <td className="px-3 py-3 align-middle text-black">{row.publicModel}</td>
              <td className="px-3 py-3 align-middle font-mono text-[12px] text-black/75">
                {row.upstreamModelSlug}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
