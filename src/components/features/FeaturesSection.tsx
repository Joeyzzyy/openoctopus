"use client";

import { useState } from "react";
import { Check, Play, ArrowRight } from "lucide-react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { FeatureTabs, TabType } from "./FeatureTabs";
import { CodeEditor } from "./CodeEditor";

const FEATURES = [
  "One request format for image, video, speech, and multimodal generation",
  "Ready-to-run examples for Node, Python, and cURL quickstarts",
  "Consistent auth, pricing, and output handling across model families",
  "Production-grade throughput with autoscaling and 99.9% uptime",
];

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState<TabType>("image");

  return (
    <section className="border-b border-black/8 bg-[#fafafa] px-6 py-12 md:px-12 md:py-20 lg:px-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
        <FadeIn className="flex flex-col gap-4 lg:w-80 lg:shrink-0 lg:pt-6">
          <h2 className="font-display text-3xl font-bold leading-[0.96] tracking-[-0.04em] text-[#111111] md:text-5xl">
            Built For Developers
          </h2>
          <p className="max-w-sm font-mono text-[12px] leading-5 text-black/58 md:text-[13px] md:leading-6">
            Integrate any model with a single API call. Node, Python, or cURL
            and ship in minutes, not days.
          </p>
          <div className="mt-1 flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/docs"
              className="group inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-black/8 bg-[#111111] px-4 text-white transition-colors duration-150 hover:bg-black/90 sm:h-11 sm:px-5"
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                API Docs
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/models"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-black/10 bg-white px-4 text-[#111111] transition-colors duration-150 hover:bg-black/[0.03] sm:h-11 sm:px-5"
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                Quickstart
              </span>
            </Link>
          </div>
          <div className="mt-4 space-y-3.5">
            {FEATURES.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#24be58]/15">
                  <Check className="h-3 w-3 text-[#24be58]" />
                </div>
                <span className="text-sm leading-6 text-black/72">{feature}</span>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn
          direction="right"
          delay={0.15}
          className="min-w-0 flex-1 space-y-3 overflow-hidden rounded-[4px] border border-white/20 bg-black p-2 shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
        >
          <FeatureTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <CodeEditor activeTab={activeTab} />

          <div className="rounded-[2px] border border-white/10 bg-[#0b0b0b] p-4 backdrop-blur-md transition-all duration-300 hover:border-white/20">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[1.1px] text-white/45">
                Generated output
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[1.1px] text-[#24be58]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#24be58]" />
                Ready
              </span>
            </div>
            <div className="mt-3 flex aspect-video items-center justify-center rounded-[2px] border border-white/10 bg-[linear-gradient(180deg,#101010_0%,#070707_100%)]">
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5">
                  <Play className="h-4 w-4 text-white" />
                </div>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[1.1px] text-white/55">
                  Preview available
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-2">
                <div className="font-mono text-[11px] text-white">2048x1152</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-white/42">
                  Resolution
                </div>
              </div>
              <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-2">
                <div className="font-mono text-[11px] text-white">&lt;2s</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-white/42">
                  Latency
                </div>
              </div>
              <div className="rounded-[2px] border border-white/10 bg-white/[0.03] p-2">
                <div className="font-mono text-[11px] text-white">$0.02</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-white/42">
                  Cost
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
