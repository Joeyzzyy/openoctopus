"use client";

import { FadeIn } from "@/components/animations/FadeIn";
import Image from "next/image";

export function TechFeatures() {
  return (
    <section className="px-6 py-16 md:px-20 md:py-20">
      <div className="mx-auto max-w-[1280px]">
        {/* Heading */}
        <FadeIn className="mb-10 flex max-w-[876px] flex-col gap-4">
          <h2 className="font-display text-[32px] font-bold leading-none tracking-[-1px] text-balance text-[#111111] md:text-[48px]">
            Engineered for Velocity
          </h2>
          <p className="font-mono text-base text-pretty text-black/55">
            OpenOctopus is a purpose-built inference engine
            <br className="hidden md:block" />
            designed to minimize latency and maximize throughput.
          </p>
        </FadeIn>

        {/* Bento grid */}
        <div className="flex flex-col gap-4">
          {/* Row 1 */}
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Vast Model Library — 45% */}
            <FadeIn className="relative h-[380px] w-full shrink-0 overflow-hidden rounded-xs bg-[#f3f3f3] lg:h-[420px] lg:w-[45%]">
              <div className="absolute top-[10px] right-0 h-[220px] w-[600px] sm:h-[260px] md:h-[280px] lg:h-[287px]">
                <Image
                  alt=""
                  src="https://static.wavespeed.ai/media/images/1772514825344409544_lTpJZlJ7.webp"
                  fill
                  sizes="600px"
                  className="object-contain object-right-top"
                />
              </div>
              <div className="absolute right-6 bottom-6 left-6">
                <h3 className="mb-2 text-2xl font-medium leading-7 text-[#111111]">
                  Vast Model Library
                </h3>
                <p className="w-auto font-mono text-sm text-pretty text-black/55 lg:w-[526px]">
                  Access the entire HuggingFace hub and top proprietary models
                  with a single unified API key.
                </p>
              </div>
            </FadeIn>

            {/* Blazing Fast Inference — flex-1 */}
            <FadeIn
              delay={0.1}
              className="relative h-[380px] w-full overflow-hidden rounded-xs bg-[#f3f3f3] lg:h-[420px] lg:flex-1"
            >
              <div className="absolute top-6 right-6 left-6 z-10 lg:w-[584px]">
                <h3 className="mb-2 text-2xl font-medium leading-7 text-[#111111]">
                  Blazing Fast Inference
                </h3>
                <p className="font-mono text-sm leading-tight text-pretty text-black/55">
                  Optimized GPU clusters deliver up to 4x faster token
                  generation for LLMs and sub-second rendering for image models.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 left-0">
                <video
                  src="https://static.wavespeed.ai/media/videos/1772514874221085877_EeXV9zUm.mp4"
                  width={850}
                  height={360}
                  autoPlay
                  muted
                  playsInline
                  loop
                  className="w-full scale-105"
                />
              </div>
            </FadeIn>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col gap-4 lg:flex-row">
            {/* Built for Scale — 55% */}
            <FadeIn
              delay={0.15}
              className="relative h-[380px] w-full shrink-0 overflow-hidden rounded-xs bg-[#f3f3f3] lg:h-[420px] lg:w-[55%]"
            >
              <div className="absolute top-6 right-6 left-6 z-10 lg:w-[642px]">
                <h3 className="mb-2 text-2xl font-medium leading-7 text-[#111111]">
                  Built for Scale
                </h3>
                <p className="max-w-[400px] font-mono text-sm text-pretty text-black/55">
                  Enterprise-grade reliability with 99.99% uptime guarantees and
                  dedicated throughput for high-volume applications.
                </p>
              </div>
              <div className="absolute bottom-0 left-0 w-full">
                <video
                  src="https://static.wavespeed.ai/media/videos/1772514874218608012_tVKS1bkv.mp4"
                  width={1024}
                  height={360}
                  autoPlay
                  muted
                  playsInline
                  loop
                  className="w-full scale-105"
                />
              </div>
            </FadeIn>

            {/* Security — flex-1 */}
            <FadeIn
              delay={0.2}
              className="relative h-[380px] w-full overflow-hidden rounded-xs bg-[#f3f3f3] lg:h-[420px] lg:flex-1"
            >
              <div className="absolute inset-0">
                <Image
                  alt=""
                  src="https://static.wavespeed.ai/media/images/1772514849424510601_vmLyIR1a.webp"
                  fill
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-contain"
                />
              </div>
              <div className="absolute right-6 bottom-6 left-6 z-10 lg:w-[526px]">
                <h3 className="mb-2 text-2xl font-medium leading-7 text-[#111111]">
                  Security
                </h3>
                <p className="font-mono text-sm leading-tight text-pretty text-black/55">
                  SOC 2 Type II compliant with end-to-end encryption and private
                  VPC deployment options.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
