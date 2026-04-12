"use client";

import Image from "next/image";
import { Download, ImageIcon } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

const DESKTOP_PREVIEW_IMAGE =
  "https://static.wavespeed.ai/media/images/1773981707127183246_bTpJTjtK.webp";

export function ForCreators() {
  return (
    <section className="bg-[#111111] relative overflow-hidden">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-16 md:px-12 md:py-20 lg:flex-row lg:items-center lg:gap-12 lg:px-20">
        {/* Left — text + CTAs */}
        <FadeIn className="flex flex-col gap-4 lg:w-80 lg:shrink-0 lg:pt-6">
          <h2 className="font-display text-3xl font-bold leading-[0.96] tracking-[-0.04em] text-white md:text-5xl">
            And For Creators
          </h2>
          <p className="max-w-sm font-mono text-[12px] leading-5 text-white/55 md:text-[13px] md:leading-6">
            OpenOctopus Desktop puts the full power of our inference engine into
            a desktop app — no code, no setup, just create.
          </p>

          <div className="mt-2 flex flex-col gap-2">
            <div className="flex shrink-0 items-center gap-3">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xs bg-white px-5 py-2.5 font-mono text-sm uppercase text-black transition-colors duration-150 hover:bg-white/90"
              >
                <span className="font-medium tracking-[1.2px]">Download App</span>
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xs border border-white/20 px-5 py-2.5 font-mono text-sm uppercase text-white transition-colors duration-150 hover:bg-white/10"
              >
                <span className="font-medium tracking-[1.2px]">Try Studio</span>
              </Link>
            </div>

            <div className="mt-1 flex items-center gap-1.5">
              <Link
                href="/login"
                className="relative inline-flex items-center gap-1.5 rounded-xs border border-white/20 px-3 py-1.5 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
              >
                <ImageIcon className="h-3 w-3" />
                <span className="font-mono text-xs font-medium uppercase leading-4 tracking-[1.2px]">
                  Image Generator
                </span>
                <span className="absolute -right-1.5 -top-1.5 text-[10px]">🔥</span>
              </Link>
            </div>
          </div>
        </FadeIn>

        {/* Right — desktop preview (order-first on lg) */}
        <FadeIn
          direction="right"
          delay={0.2}
          className="min-w-0 overflow-hidden rounded-md border border-white/20 lg:order-first lg:flex-1"
        >
          <Image
            src={DESKTOP_PREVIEW_IMAGE}
            alt="OpenOctopus Desktop"
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
