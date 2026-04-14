"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

type PricingResponse = {
  name: string;
  billingUnit: string;
  sellUsd: number;
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
          <h2 className="font-display text-xl font-bold leading-none tracking-tight text-[#1C1917] md:text-2xl">
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
    <th className="py-3 pr-4 text-left text-xs font-medium uppercase tracking-[1.1px] text-black/60 last:pr-0">
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
      description="Current public model prices synced from internal configuration."
      className="px-6 pt-12 md:px-12 md:pt-16 lg:px-20"
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="border-b border-black/10">
              <TableHeaderCell>Model</TableHeaderCell>
              <TableHeaderCell>Price</TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {pricing ? (
              <tr className="border-b border-black/6 transition-colors hover:bg-black/[0.02]">
                <TableCell>
                  <span className="flex items-center gap-2 font-medium text-[#1C1917]">
                    {pricing.name}
                  </span>
                </TableCell>
                <TableCell className="text-[#1C1917]">
                  {pricing.sellLabel}
                </TableCell>
              </tr>
            ) : (
              <tr className="border-b border-black/6">
                <TableCell className="font-medium text-[#1C1917]">
                  Nano Banana Pro
                </TableCell>
                <TableCell className="text-[#1C1917]">
                  {error ? "Unavailable" : "Loading..."}
                </TableCell>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-black/40">
        Prices are loaded from the current public model pricing configured in
        internal.{" "}
        <Link href="/docs" className="text-brand hover:underline">
          See full pricing documentation
        </Link>
      </p>
    </PricingSection>
  );
}
