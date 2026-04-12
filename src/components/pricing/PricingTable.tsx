"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

type PricingResponse = {
  name: string;
  billingUnit: string;
  costUsd: number | null;
  sellUsd: number;
  costLabel: string;
  sellLabel: string;
};

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

export function ImageVideoTable() {
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPricing() {
      try {
        const response = await fetch("/api/pricing/image-model", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Pricing request failed with ${response.status}`);
        }

        const nextPricing = (await response.json()) as PricingResponse;

        if (!cancelled) {
          setPricing(nextPricing);
        }
      } catch (fetchError) {
        console.error(fetchError);

        if (!cancelled) {
          setError(true);
        }
      }
    }

    void loadPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PricingSection
      title="Image & Video Models"
      description="Temporary pricing preview for the current featured image model."
      className="px-6 pt-12 md:px-12 md:pt-16 lg:px-20"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <TableHeaderCell>Model</TableHeaderCell>
              <TableHeaderCell>Cost</TableHeaderCell>
              <TableHeaderCell>Sell</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {pricing ? (
              <tr className="border-b border-black/6 transition-colors hover:bg-black/[0.02]">
                <TableCell>
                  <span className="flex items-center gap-2 font-medium text-[#111111]">
                    {pricing.name}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-[#111111]">
                  {pricing.costLabel}
                </TableCell>
                <TableCell className="font-mono text-[#111111]">
                  {pricing.sellLabel}
                </TableCell>
              </tr>
            ) : (
              <tr className="border-b border-black/6">
                <TableCell className="font-medium text-[#111111]">
                  Nano Banana Pro
                </TableCell>
                <TableCell className="font-mono text-black/50">
                  {error ? "Unavailable" : "Loading..."}
                </TableCell>
                <TableCell className="font-mono text-[#111111]">
                  $0.10 / image
                </TableCell>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-black/40">
        Cost and sell price are loaded from the active marketing route and the
        current public model pricing configured in internal.{" "}
        <Link href="/docs" className="text-brand hover:underline">
          See full pricing documentation
        </Link>
      </p>
    </PricingSection>
  );
}
