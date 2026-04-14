"use client";

import Link from "next/link";
import { useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { pricingFAQ } from "@/lib/data";
import { cn } from "@/lib/utils";

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="bg-[#FAFAF8] px-6 py-20 md:px-12 md:py-28 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-24">
          <FadeIn className="lg:w-80 lg:shrink-0">
            <h2 className="font-display text-2xl font-bold leading-none tracking-tight text-[#1C1917] md:text-4xl">
              Frequently asked
              <br />
              questions
            </h2>
            <p className="mt-4 text-sm text-black/60">
              Can&apos;t find what you&apos;re looking for?{" "}
              <Link
                href="/enterprise#contact-us"
                className="text-brand transition-colors hover:underline"
              >
                Contact support
              </Link>
            </p>
          </FadeIn>

          <div className="min-w-0 border-t border-black/10 lg:flex-1">
            {pricingFAQ.map((item, i) => {
              const isOpen = openIndex === i;

              return (
                <FadeIn
                  key={item.question}
                  delay={i * 0.05}
                  className="border-b border-black/10"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-4 py-5 text-left"
                  >
                    <span className="font-display text-base font-medium text-[#1C1917]">
                      {item.question}
                    </span>
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      className="size-5 shrink-0 text-black/40"
                      aria-hidden="true"
                    >
                      <line x1="4" y1="10" x2="16" y2="10" />
                      <line
                        x1="10"
                        y1="4"
                        x2="10"
                        y2="16"
                        className={cn(
                          "origin-center transition-opacity duration-200",
                          isOpen && "opacity-0"
                        )}
                      />
                    </svg>
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200",
                      isOpen ? "grid-rows-[1fr] pb-5" : "grid-rows-[0fr]"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="text-sm leading-relaxed text-black/60">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
