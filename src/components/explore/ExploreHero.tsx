import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { Flame } from "lucide-react";

export function ExploreHero() {
  return (
    <section className="relative overflow-hidden bg-white pb-16 pt-32 md:pt-40">
      <div className="mx-auto max-w-7xl px-4 text-center xl:px-0">
        <FadeIn>
          <h1 className="mx-auto max-w-4xl font-display text-3xl font-bold leading-tight tracking-tight text-[#111111] md:text-5xl lg:text-6xl">
            Ultimate AI Media Generation Platform
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-6 text-black/55 md:text-base">
            With 1,000+ top-tier models, OpenOctopus is the most powerful
            platform for AI image and video generation — built to help you
            create faster and scale without limits.
          </p>
        </FadeIn>

        <FadeIn delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/models"
              className="inline-flex items-center rounded-[4px] bg-[#24be58] px-6 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-white transition-colors hover:bg-[#24be58]/90"
            >
              Explore Models
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center rounded-[4px] border border-black/10 bg-white px-6 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-[#111111] transition-colors hover:bg-black/[0.03]"
            >
              Documentation
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-black/10 bg-white px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-[#111111] transition-colors hover:bg-black/[0.03]"
            >
              Image Generator
              <Flame className="h-3.5 w-3.5 text-sky-400" />
            </Link>
            <Link
              href="/models"
              className="inline-flex items-center gap-1.5 rounded-[4px] border border-black/10 bg-white px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-[#111111] transition-colors hover:bg-black/[0.03]"
            >
              Video Generator
              <Flame className="h-3.5 w-3.5 text-sky-400" />
            </Link>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
