"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FadeIn } from "@/components/animations/FadeIn";

type TabType = "image" | "video" | "speech" | "chat";

const TABS: { id: TabType; label: string }[] = [
  { id: "image", label: "image.ts" },
  { id: "video", label: "video.ts" },
  { id: "speech", label: "speech.ts" },
  { id: "chat", label: "chat.ts" },
];

interface CodeLine {
  spans: { text: string; type: "keyword" | "ink" | "string" | "function" | "code" }[];
}

const CODE_DATA: Record<TabType, { lines: CodeLine[]; output: { label: string; meta: string; image: string } }> = {
  image: {
    lines: [
      { spans: [{ text: "import", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: " from", type: "keyword" }, { text: ' "openoctopus"', type: "string" }] },
      { spans: [{ text: " ", type: "code" }] },
      { spans: [{ text: "const", type: "keyword" }, { text: " output =", type: "code" }, { text: " await", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: ".run", type: "function" }, { text: "(", type: "code" }] },
      { spans: [{ text: '  "google/nano-banana-pro/text-to-image"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "  {", type: "code" }] },
      { spans: [{ text: "    prompt: ", type: "code" }, { text: '"A person running in the city"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "    aspect_ratio: ", type: "code" }, { text: '"16:9"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "    resolution: ", type: "code" }, { text: '"2k"', type: "string" }] },
      { spans: [{ text: "  }", type: "code" }] },
      { spans: [{ text: ");", type: "code" }] },
      { spans: [{ text: " ", type: "code" }] },
    ],
    output: { label: "Generated output", meta: "2048×1152 · PNG · 4.8MB", image: "https://static.wavespeed.ai/media/images/1773393165258509554_0flmhide.webp" },
  },
  video: {
    lines: [
      { spans: [{ text: "import", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: " from", type: "keyword" }, { text: ' "openoctopus"', type: "string" }] },
      { spans: [{ text: " ", type: "code" }] },
      { spans: [{ text: "const", type: "keyword" }, { text: " output =", type: "code" }, { text: " await", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: ".run", type: "function" }, { text: "(", type: "code" }] },
      { spans: [{ text: '  "alibaba/wan-2.6/text-to-video"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "  {", type: "code" }] },
      { spans: [{ text: "    prompt: ", type: "code" }, { text: '"Driving through a futuristic city"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "    duration: ", type: "code" }, { text: "5", type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "    resolution: ", type: "code" }, { text: '"720p"', type: "string" }] },
      { spans: [{ text: "  }", type: "code" }] },
      { spans: [{ text: ");", type: "code" }] },
      { spans: [{ text: " ", type: "code" }] },
    ],
    output: { label: "Generated video", meta: "1280×720 · MP4 · 8.4MB", image: "https://static.wavespeed.ai/media/images/1773393165258509554_0flmhide.webp" },
  },
  speech: {
    lines: [
      { spans: [{ text: "import", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: " from", type: "keyword" }, { text: ' "openoctopus"', type: "string" }] },
      { spans: [{ text: " ", type: "code" }] },
      { spans: [{ text: "const", type: "keyword" }, { text: " output =", type: "code" }, { text: " await", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: ".run", type: "function" }, { text: "(", type: "code" }] },
      { spans: [{ text: '  "elevenlabs/eleven-v3"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "  {", type: "code" }] },
      { spans: [{ text: "    text: ", type: "code" }, { text: '"Hello from OpenOctopus"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "    voice: ", type: "code" }, { text: '"alloy"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "    format: ", type: "code" }, { text: '"mp3"', type: "string" }] },
      { spans: [{ text: "  }", type: "code" }] },
      { spans: [{ text: ");", type: "code" }] },
      { spans: [{ text: " ", type: "code" }] },
    ],
    output: { label: "Generated audio", meta: "MP3 · 48kHz · 0:05", image: "https://static.wavespeed.ai/media/images/1773393165258509554_0flmhide.webp" },
  },
  chat: {
    lines: [
      { spans: [{ text: "import", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: " from", type: "keyword" }, { text: ' "openoctopus"', type: "string" }] },
      { spans: [{ text: " ", type: "code" }] },
      { spans: [{ text: "const", type: "keyword" }, { text: " output =", type: "code" }, { text: " await", type: "keyword" }, { text: " openoctopus", type: "ink" }, { text: ".run", type: "function" }, { text: "(", type: "code" }] },
      { spans: [{ text: '  "openai/gpt-4o"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: "  {", type: "code" }] },
      { spans: [{ text: "    messages: ", type: "code" }, { text: "[{", type: "code" }] },
      { spans: [{ text: '      role: ', type: "code" }, { text: '"user"', type: "string" }, { text: ",", type: "code" }] },
      { spans: [{ text: '      content: ', type: "code" }, { text: '"Describe this image"', type: "string" }] },
      { spans: [{ text: "    }]", type: "code" }] },
      { spans: [{ text: "  }", type: "code" }] },
      { spans: [{ text: ");", type: "code" }] },
    ],
    output: { label: "Chat response", meta: "GPT-4o · 128K context", image: "https://static.wavespeed.ai/media/images/1773393165258509554_0flmhide.webp" },
  },
};

const SPAN_COLORS: Record<string, string> = {
  keyword: "text-purple-400",
  ink: "text-white",
  string: "text-green-400",
  function: "text-blue-400",
  code: "text-white/60",
};

export function FeaturesSection() {
  const [activeTab, setActiveTab] = useState<TabType>("image");
  const [copied, setCopied] = useState(false);
  const data = CODE_DATA[activeTab];

  function handleCopy() {
    const text = data.lines
      .map((l) => l.spans.map((s) => s.text).join(""))
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="bg-[#111111] px-6 py-16 md:px-20 md:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 lg:flex-row lg:items-center lg:gap-12">
        {/* Left — heading + CTAs */}
        <FadeIn className="flex flex-col gap-4 lg:w-80 lg:shrink-0 lg:pt-6">
          <h2 className="font-display text-2xl font-bold leading-none tracking-tight text-balance text-white md:text-5xl">
            Built For Developers
          </h2>
          <p className="font-mono text-sm text-pretty text-white/50">
            Integrate any model with a single API call. Node, Python, or cURL
            — ship in minutes, not days.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-xs bg-white px-5 py-2.5 font-mono text-sm uppercase tracking-[1.2px] text-black transition-colors duration-150 hover:bg-white/90"
            >
              API Docs
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xs border border-white/20 px-5 py-2.5 font-mono text-sm uppercase tracking-[1.2px] text-white transition-colors duration-150 hover:bg-white/10"
            >
              Quickstart
            </Link>
          </div>
        </FadeIn>

        {/* Right — code editor card */}
        <FadeIn
          direction="right"
          delay={0.15}
          className="min-w-0 overflow-hidden rounded-lg border border-white/20 lg:flex-1"
        >
          <div className="flex flex-col gap-2 rounded-[5px] bg-[#09070B] p-2">
            {/* Tabs row */}
            <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center sm:gap-0">
              {/* File tabs */}
              <div className="flex w-full gap-1 overflow-x-auto sm:w-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex cursor-pointer items-center gap-1 rounded-[3px] px-4 py-2 font-mono text-xs transition-colors ${
                      activeTab === tab.id
                        ? "bg-white/[0.06] text-white"
                        : "text-white/50 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    <span className="relative">{tab.label}</span>
                  </button>
                ))}
              </div>
              {/* Language selector */}
              <div className="hidden gap-1 sm:flex">
                {["node", "python", "curl"].map((lang) => (
                  <button
                    key={lang}
                    className={`cursor-pointer rounded-[2px] px-2 py-1 font-mono text-xs transition-colors ${
                      lang === "node"
                        ? "bg-white/[0.08] text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Code + Output side by side */}
            <div className="flex flex-col gap-2 overflow-hidden rounded-[3px] bg-[#09070B] md:flex-row">
              {/* Code panel */}
              <div className="relative h-72 bg-white/[0.03] md:h-88 md:flex-1">
                <div className="absolute top-10 left-6 flex">
                  {/* Line numbers */}
                  <div className="flex w-6 flex-col gap-1 font-mono text-xs leading-tight text-white/25">
                    {data.lines.map((_, i) => (
                      <p key={i}>{i + 1}</p>
                    ))}
                  </div>
                  {/* Code */}
                  <div className="flex flex-col gap-1 font-mono text-xs leading-tight whitespace-pre">
                    {data.lines.map((line, i) => (
                      <p key={i}>
                        {line.spans.map((span, j) => (
                          <span key={j} className={SPAN_COLORS[span.type]}>
                            {span.text}
                          </span>
                        ))}
                      </p>
                    ))}
                  </div>
                </div>
                {/* Copy button */}
                <button
                  onClick={handleCopy}
                  className="absolute bottom-3 left-6 flex cursor-pointer items-center gap-1.5 rounded bg-[#09070B] px-2 py-1 transition-colors hover:bg-white/[0.06]"
                >
                  <svg className="size-3.5 text-white/40" viewBox="0 0 16 16" fill="none">
                    <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
                    <path d="M3 11V3.5C3 2.67 3.67 2 4.5 2H10" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                  </svg>
                  <span className="font-mono text-xs leading-tight text-white/40">
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              </div>

              {/* Output panel */}
              <div className="relative flex h-72 flex-col items-center justify-end overflow-hidden p-2 md:h-88 md:flex-1">
                {/* Generated image (fill) */}
                <Image
                  alt="Generated output"
                  src={data.output.image}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="pointer-events-none object-cover"
                />
                {/* Info bar */}
                <div className="relative flex h-13 w-full items-center gap-3 rounded-[2px] border border-white/10 bg-black/80 px-3 py-px backdrop-blur-md">
                  <div className="flex flex-col">
                    <p className="text-xs leading-4 text-pretty text-white">
                      {data.output.label}
                    </p>
                    <p className="font-mono text-xs leading-4 text-white/35">
                      {data.output.meta}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
