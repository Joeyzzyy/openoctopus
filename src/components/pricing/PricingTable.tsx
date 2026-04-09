import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

interface ImageVideoRow {
  name: string;
  unit: string;
  price: string;
}

interface LLMRow {
  name: string;
  context: string;
  input: string;
  output: string;
}

interface GpuRow {
  tier: string;
  gpu: string;
  vram: string;
  hourly: string;
  perSecond: string;
}

function parsePriceValue(value: string) {
  const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function formatOutputPerDollar(price: string, unit: string) {
  const numeric = parsePriceValue(price);

  if (!numeric || numeric <= 0) {
    return "N/A";
  }

  const amount = 1 / numeric;
  const rounded =
    amount >= 100 ? Math.round(amount) : amount >= 10 ? Math.round(amount * 10) / 10 : Math.round(amount * 100) / 100;
  const normalizedUnit = unit.toLowerCase();
  const label = rounded === 1 ? normalizedUnit : `${normalizedUnit}s`;

  return `${rounded} ${label}`;
}

function PricingSection({
  title,
  description,
  children,
  className = "px-6 pt-12 md:px-12 md:pt-16 lg:px-20",
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-8 flex flex-col gap-2">
          <h2 className="font-display text-xl font-bold leading-none tracking-tight text-[#111111] md:text-2xl">
            {title}
          </h2>
          <p className="text-sm text-black/60 md:text-base">{description}</p>
        </FadeIn>
        {children}
      </div>
    </section>
  );
}

function TableHeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="py-3 pr-4 text-left font-mono text-xs font-medium uppercase tracking-[1.1px] text-black/60 last:pr-0">
      {children}
    </th>
  );
}

function TableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`py-4 pr-4 last:pr-0 ${className}`}>{children}</td>;
}

export function ImageVideoTable({ rows }: { rows: ImageVideoRow[] }) {
  return (
    <PricingSection
      title="Image & Video Models"
      description="State-of-the-art generation with models from OpenOctopus, ByteDance, Google, and more."
      className="px-6 pt-12 md:px-12 md:pt-16 lg:px-20"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <TableHeaderCell>Model</TableHeaderCell>
              <TableHeaderCell>Unit</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
              <TableHeaderCell>Output per $1</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-black/6 transition-colors hover:bg-black/[0.02]"
              >
                <TableCell>
                  <span className="flex items-center gap-2 font-medium text-[#111111]">
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-black/60">
                  {row.unit}
                </TableCell>
                <TableCell className="font-mono text-[#111111]">
                  {row.price}
                </TableCell>
                <TableCell className="font-mono text-xs text-black/60">
                  {formatOutputPerDollar(row.price, row.unit)}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-black/40">
        Prices may vary based on resolution and generation parameters.{" "}
        <Link href="/docs" className="text-brand hover:underline">
          See full pricing documentation
        </Link>
      </p>
    </PricingSection>
  );
}

export function LanguageModelTable({ rows }: { rows: LLMRow[] }) {
  return (
    <PricingSection
      title="Language Models"
      description="Access leading LLMs for chat, reasoning, coding, and multimodal workflows."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <TableHeaderCell>Model</TableHeaderCell>
              <TableHeaderCell>Context</TableHeaderCell>
              <TableHeaderCell>Input</TableHeaderCell>
              <TableHeaderCell>Output</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.name}
                className="border-b border-black/6 transition-colors hover:bg-black/[0.02]"
              >
                <TableCell>
                  <span className="flex items-center gap-2 font-medium text-[#111111]">
                    {row.name}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-black/60">
                  {row.context}
                </TableCell>
                <TableCell className="font-mono text-[#111111]">
                  {row.input}
                </TableCell>
                <TableCell className="font-mono text-xs text-black/60">
                  {row.output}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PricingSection>
  );
}

export function ServerlessGpuTable({ rows }: { rows: GpuRow[] }) {
  return (
    <PricingSection
      title="Serverless GPU"
      description="Deploy and scale GPU workloads with pay-per-second billing and enterprise-grade infrastructure."
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <TableHeaderCell>Tier</TableHeaderCell>
              <TableHeaderCell>GPU</TableHeaderCell>
              <TableHeaderCell>VRAM</TableHeaderCell>
              <TableHeaderCell>Hourly</TableHeaderCell>
              <TableHeaderCell>Per Second</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={`${row.gpu}-${i}`}
                className="border-b border-black/6 transition-colors hover:bg-black/[0.02]"
              >
                <TableCell className="font-mono text-xs text-black/60">
                  {row.tier}
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2 font-medium text-[#111111]">
                    {row.gpu}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs text-black/60">
                  {row.vram}
                </TableCell>
                <TableCell className="font-mono text-[#111111]">
                  {row.hourly}
                </TableCell>
                <TableCell className="font-mono text-xs text-black/60">
                  {row.perSecond}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PricingSection>
  );
}
