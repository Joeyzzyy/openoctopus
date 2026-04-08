"use client";

import Image from "next/image";
import { ArrowRight, Download, Sparkles, Check, ImageIcon, Video } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";

const CREATOR_FEATURES = [
  "Desktop workspace optimized for high-frequency image and video generation",
  "One engine powering Studio, Desktop, and API workflows",
  "No environment setup needed, access flagship models and popular workflows instantly",
];

const DESKTOP_PREVIEW_IMAGE =
  "https://static.wavespeed.ai/media/images/1773981707127183246_bTpJTjtK.webp";

export function ForCreators() {
  return (
    <section className="relative overflow-hidden border-b border-black/8 bg-white px-6 pb-16 md:px-12 md:pb-20 lg:px-20">
      <div className="relative mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-center lg:gap-12">
          <FadeIn direction="left" className="flex flex-col gap-5 lg:pt-4">
            <div className="flex items-center gap-2 text-sm text-black/55">
              <Sparkles className="h-4 w-4 text-[#24be58]" />
              <span>Creator workflow</span>
            </div>

            <h2 className="font-display text-3xl font-bold leading-[0.96] tracking-[-0.04em] text-[#111111] md:text-5xl">
              And For Creators
            </h2>

            <p className="max-w-sm font-mono text-[12px] leading-5 text-black/58 md:text-[13px] md:leading-6">
              Open Octopus Desktop puts the full power of our inference engine into a
              desktop app. No code, no setup, just create.
            </p>

            <div className="space-y-3">
              {CREATOR_FEATURES.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#24be58]/15">
                    <Check className="h-3 w-3 text-[#24be58]" />
                  </div>
                  <span className="text-sm leading-6 text-black/72">{feature}</span>
                </div>
              ))}
            </div>

            <div className="mt-1 flex flex-col gap-2.5 sm:flex-row">
              <Link
                href="/landing/desktop"
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-black/8 bg-[#111111] px-4 text-white transition-colors duration-150 hover:bg-black/90 sm:h-11 sm:px-5"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                  Download App
                </span>
                <Download className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
              </Link>
              <Link
                href="/studio"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-black/10 bg-white px-4 text-[#111111] transition-colors duration-150 hover:bg-black/[0.03] sm:h-11 sm:px-5"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                  Try Studio
                </span>
              </Link>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Link
                href="/image-generator"
                className="relative inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-black/10 bg-white px-3 text-black/70 transition-colors duration-150 hover:bg-black/[0.03] hover:text-black"
              >
                <ImageIcon className="h-3 w-3" />
                <span className="font-mono text-[10px] uppercase tracking-[1.1px]">
                  Image Generator
                </span>
                <span className="absolute -right-2 -top-2 text-[10px]">🔥</span>
              </Link>
              <Link
                href="/video-generator"
                className="relative inline-flex h-8 items-center gap-1.5 rounded-[2px] border border-black/10 bg-white px-3 text-black/70 transition-colors duration-150 hover:bg-black/[0.03] hover:text-black"
              >
                <Video className="h-3 w-3" />
                <span className="font-mono text-[10px] uppercase tracking-[1.1px]">
                  Video Generator
                </span>
                <span className="absolute -right-2 -top-2 text-[10px]">🔥</span>
              </Link>
            </div>
          </FadeIn>

          <FadeIn direction="right" delay={0.2} className="relative">
            <div className="relative overflow-hidden rounded-[4px] border border-black/12 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.18)] transition-all duration-500 hover:border-black/20">
              <Image
                src={DESKTOP_PREVIEW_IMAGE}
                alt="Open Octopus Desktop"
                width={1280}
                height={800}
                className="w-full"
                unoptimized
              />
              <div className="absolute bottom-4 left-4 flex min-w-[220px] items-center justify-between rounded-[2px] border border-white/10 bg-black/88 px-4 py-3 backdrop-blur-md">
                <div className="flex flex-col">
                  <p className="font-mono text-[10px] uppercase tracking-[1.1px] text-white">
                    Generated output
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-white/45">
                    2048x1152 · PNG · 4.8MB
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-white/45" />
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
