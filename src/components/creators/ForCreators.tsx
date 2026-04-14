"use client";

import Image from "next/image";
import { Download, ImageIcon } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

const DESKTOP_PREVIEW_IMAGE =
  "https://static.wavespeed.ai/media/images/1773981707127183246_bTpJTjtK.webp";

export function ForCreators() {
  return (
    <section className="bg-[#0C0A09] relative overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 md:px-12 md:py-20 lg:flex-row lg:items-center lg:gap-12 lg:px-20">
        {/* Left — text + CTAs */}
        <FadeIn className="flex flex-col gap-4 lg:w-80 lg:shrink-0 lg:pt-6">
          <h2 className="font-display text-3xl font-semibold leading-[1] tracking-[-0.03em] text-white md:text-5xl">
            For creators, not just coders
          </h2>
          <p className="max-w-sm text-[14px] leading-6 text-white/50">
            OpenOctopus Studio puts the full power of our inference engine into
            a desktop app — no code, no setup, just create.
          </p>

          <div className="mt-2 flex flex-col gap-2">
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-[#1C1917] transition-colors duration-150 hover:bg-white/90"
              >
                <span>Download app</span>
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-white/10"
              >
                <span>Try Studio</span>
              </Link>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <Link
                href="/login"
                className="relative inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3.5 py-2 text-white/70 backdrop-blur-sm transition-colors duration-150 hover:bg-white/15 hover:text-white"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="text-[11px] font-medium uppercase tracking-[0.8px]">
                  Image Generator
                </span>
                <span className="absolute -right-2 -top-2 text-[10px]">🔥</span>
              </Link>
            </div>
          </div>
        </FadeIn>

        {/* Right — desktop preview (order-first on lg) */}
        <FadeIn
          direction="right"
          delay={0.2}
          className="min-w-0 overflow-hidden rounded-2xl border border-white/10 lg:order-first lg:flex-1"
        >
          <Image
            src={DESKTOP_PREVIEW_IMAGE}
            alt="OpenOctopus Studio"
            width={1280}
            height={800}
            className="w-full"
            unoptimized
          />
        </FadeIn>
      </div>
    </section>
  );
}
