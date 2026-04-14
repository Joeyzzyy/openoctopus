"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";

const LANGUAGE_MODEL_BADGES = [
  { label: "GPT-5.4", tone: "text-[#1C1917]" },
  { label: "Claude Opus 4.6", tone: "text-[#1C1917]" },
  { label: "Gemini 3.1 Pro", tone: "text-[#1C1917]" },
  { label: "Qwen3 Max", tone: "text-[#1C1917]" },
];

const GPU_FEATURES = [
  "SOC 2 Type II",
  "End-to-end encryption",
  "Auto-scaling",
  "Pay-per-second",
  "Zero cold starts",
];

function TryForFreeButton() {
  return (
    <Link
      href="/login"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#1C1917] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1C1917]/80"
    >
      Try for free
      <ArrowRight className="size-3.5" />
    </Link>
  );
}

export function CapabilityCards() {
  return (
    <section className="bg-[#FAFAF8] px-6 pt-16 md:px-12 md:pt-20 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-12 flex flex-col items-center gap-4 text-center">
          <h2 className="text-balance text-2xl font-bold leading-none tracking-tight text-[#1C1917] md:text-4xl lg:text-5xl">
            Access State-of-the-Art AI Models
          </h2>
          <p className="max-w-2xl text-sm text-black/60 md:text-base">
            Ready-to-use REST inference API with the latest image, video, and
            language models. Best performance, no cold starts, affordable
            pricing.
          </p>
        </FadeIn>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row">
            <FadeIn className="relative h-[420px] w-full overflow-hidden rounded-lg bg-[#f5f5f3] lg:h-[480px] lg:w-[55%] lg:shrink-0">
              <div className="absolute right-0 bottom-2.5 h-[220px] w-[600px] sm:h-[260px] md:h-[280px] lg:h-[288px]">
                <Image
                  alt=""
                  src="https://static.wavespeed.ai/media/images/1772514825344409544_lTpJZlJ7.webp"
                  fill
                  sizes="600px"
                  className="object-contain object-right-top"
                />
              </div>
              <div className="absolute top-6 right-6 left-6 z-10">
                <h3 className="mb-2 text-2xl font-medium leading-7 text-[#1C1917]">
                  Image & Video Models
                </h3>
                <p className="text-base text-black/60">
                  State-of-the-art image and video generation with models like
                  Kling O3, Seedream v4.5, Veo 3.1, and Wan 2.6.
                </p>
              </div>
              <div className="absolute right-6 bottom-6 left-6 z-10">
                <TryForFreeButton />
              </div>
            </FadeIn>

            <FadeIn
              delay={0.1}
              className="relative h-[380px] w-full overflow-hidden rounded-lg bg-[#f5f5f3] lg:h-[420px] lg:flex-1"
            >
              <div className="absolute top-6 right-6 left-6 z-10">
                <h3 className="mb-2 text-2xl font-medium leading-7 text-[#1C1917]">
                  Language Models
                </h3>
                <p className="mb-4 text-base text-black/60">
                  Access leading LLMs including GPT-5.4, Claude Opus 4.6,
                  Gemini 3.1 Pro, and Qwen3 Max with up to 200K context
                  windows.
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_MODEL_BADGES.map((badge) => (
                    <span
                      key={badge.label}
                      className={`flex items-center gap-2 rounded-lg bg-white px-2.5 py-1 text-sm font-medium ${badge.tone}`}
                    >
                      <span className="size-3.5 rounded-full bg-black/10" />
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="absolute right-6 bottom-6 left-6 z-10 flex flex-col gap-4">
                <TryForFreeButton />
              </div>
            </FadeIn>
          </div>

          <FadeIn
            delay={0.15}
            className="relative h-[420px] w-full overflow-hidden rounded-lg bg-[#f5f5f3] lg:h-[480px]"
          >
            <div className="absolute top-0 right-8 h-full w-72 lg:w-96">
              <Image
                alt=""
                src="https://static.wavespeed.ai/media/images/1772514849424510601_vmLyIR1a.webp"
                fill
                sizes="(min-width: 1024px) 384px, 288px"
                className="object-contain object-bottom"
              />
            </div>
            <div className="absolute top-6 right-6 left-6 z-10 lg:w-[600px]">
              <h3 className="mb-2 text-2xl font-medium leading-7 text-[#1C1917]">
                Serverless GPU Infrastructure
              </h3>
              <p className="max-w-md text-base text-black/60">
                Run your own models on enterprise-grade GPUs with auto-scaling,
                pay-per-second billing, and zero cold starts. No infrastructure
                management required.
              </p>
            </div>
            <div className="absolute right-6 bottom-6 left-6 z-10 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {GPU_FEATURES.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-lg bg-black/[0.05] px-3 py-1.5 text-xs text-black/60"
                  >
                    {feature}
                  </span>
                ))}
              </div>
              <TryForFreeButton />
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
