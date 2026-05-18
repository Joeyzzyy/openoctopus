import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { ArrowRight } from "lucide-react";

export function PricingHero() {
  return (
    <section className="bg-[#F8FCFF] px-6 pb-4 pt-32 md:px-12 md:pb-8 md:pt-40 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <FadeIn>
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="max-w-4xl font-display text-3xl font-bold leading-none tracking-[-0.05em] text-balance text-[#1C1917] md:text-5xl lg:text-6xl">
              Simple and transparent pricing
            </h1>
            <p className="max-w-xl text-base text-black/60 md:text-lg">
              Pay only for what you use. No hidden fees, no surprises. Scale
              from prototype to production with predictable costs.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-lg bg-[#1C1917] px-6 py-3 text-white transition-colors duration-150 hover:bg-[#1C1917]/80"
              >
                <span className="text-sm font-bold uppercase leading-4 tracking-[1.2px]">
                  Start building for free
                </span>
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/enterprise#contact-us"
                className="flex items-center gap-2.5 rounded-lg border border-black/20 px-6 py-3 text-[#1C1917] transition-colors duration-150 hover:bg-black/[0.03]"
              >
                <span className="text-sm font-bold uppercase leading-4 tracking-[1.2px]">
                  Contact Sales
                </span>
              </Link>
            </div>
            <p className="mt-2 text-sm text-black/40">
              No credit card required • Start with $1 free credits
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
