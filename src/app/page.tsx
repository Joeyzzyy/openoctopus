import Link from "next/link";
import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Clapperboard,
  CreditCard,
  ShieldCheck,
  Sparkles,
  UserRound,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { HomeMobileMenu } from "@/components/marketing/home-mobile-menu";
import { buildAbsoluteUrl } from "./(marketing)/models/data";
import { createClient } from "@/lib/supabase/server";

const HEADER_NAV_ITEMS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Learn More", href: "/resource" },
];

const FOOTER_NAV_ITEMS = [
  { label: "Models", href: "/models" },
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Learn More", href: "/resource" },
  { label: "Tools", href: "/tools" },
];

const CAPABILITY_CARDS = [
  {
    variant: "providers",
    title: "One API for Any Model",
    description:
      "Access all major models through a single, unified interface. OpenAI SDK works out of the box.",
    href: "/bestof",
    cta: "Browse all",
  },
  {
    variant: "routing",
    title: "Higher Availability",
    description:
      "Reliable AI models via our distributed infrastructure. Fall back to other providers when one goes down.",
    href: "/docs",
    cta: "Learn more",
    external: true,
  },
  {
    variant: "performance",
    title: "Price and Performance",
    description:
      "Keep costs in check without sacrificing speed. OpenRouter runs at the edge for minimal latency between your users and their inference.",
    href: "/docs",
    cta: "Learn more",
    external: true,
  },
  {
    variant: "policy",
    title: "Custom Data Policies",
    description:
      "Protect your organization with fine grained data policies. Ensure prompts only go to the models and providers you trust.",
    href: "/docs",
    cta: "View docs",
    external: true,
  },
];

const PROVIDER_ORBS = [
  "Microsoft",
  "NVIDIA",
  "Meta",
  "Google",
  "Amazon",
  "DeepSeek",
  "Qwen",
  "Moonshot",
  "MiniMax",
  "Z.ai",
  "Mistral",
  "Anthropic",
  "OpenAI",
  "AI Studio",
  "xAI",
  "Cohere",
  "HF",
  "Perplexity",
  "Nous",
  "Together",
  "Morph",
  "Inflection",
  "Liquid",
  "Inception",
  "Arcee",
];

const AI_MODEL_LOGOS = [
  {
    name: "Kling",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/kling-color.png",
  },
  {
    name: "Luma",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/luma-color.png",
  },
  {
    name: "Runway",
    image: "https://www.mindvideo.ai/images/ai-models/runway.webp",
  },
  {
    name: "Veo",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/google-color.png",
  },
  {
    name: "Hailuo",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/minimax-color.png",
  },
  {
    name: "Jimeng",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/doubao-color.png",
  },
  {
    name: "Gemini",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/gemini-color.png",
  },
  {
    name: "Vidu",
    image: "https://www.mindvideo.ai/images/ai-models/vidu.webp",
  },
  {
    name: "Midjourney",
    image: "https://www.mindvideo.ai/images/ai-models/mj.webp",
  },
  {
    name: "Stable Diffusion",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/stability-color.png",
  },
  {
    name: "DALL-E 3",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/dalle-color.png",
  },
  {
    name: "Sora",
    image: "https://www.mindvideo.ai/images/ai-models/sora2.webp",
  },
  {
    name: "Flux",
    image: "https://www.mindvideo.ai/images/ai-models/flux.webp",
  },
  {
    name: "Tongyi Wanx",
    image: "https://www.mindvideo.ai/images/ai-models/wanx.webp",
  },
  {
    name: "Claude",
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/claude-color.png",
  },
];

const FEATURED_MODELS = [
  {
    name: "Claude Opus 4.7",
    provider: "anthropic",
    byline: "by anthropic",
    metricLabel: "Tokens",
    metricValue: "997.0B",
    trendLabel: "Weekly Trend",
    trend: "-24.09%",
    icon: WandSparkles,
  },
  {
    name: "GPT-5.5",
    provider: "openai",
    byline: "by openai",
    metricLabel: "Tokens",
    metricValue: "297.1B",
    trendLabel: "Weekly Trend",
    trend: "+88.51%",
    badge: "New",
    icon: Clapperboard,
  },
  {
    name: "Gemini 3.1 Pro Preview",
    provider: "google",
    byline: "by google",
    metricLabel: "Tokens",
    metricValue: "336.0B",
    trendLabel: "Weekly Trend",
    trend: "-16.58%",
    icon: Sparkles,
  },
];

const WORKFLOW_STEPS = [
  {
    step: "1",
    title: "Signup",
    description: "Create an account to get started. You can set up an org for your team later.",
    icon: Workflow,
  },
  {
    step: "2",
    title: "Buy credits",
    description: "Credits can be used with any model or provider.",
    detailLines: ["Apr 1   $99", "Mar 30   $10"],
    icon: Zap,
  },
  {
    step: "3",
    title: "Get your API key",
    description: "Create an API key and start making requests. Fully OpenAI compatible.",
    detailLines: ["OPENROUTER_API_KEY", "••••••••••••••••"],
    icon: ShieldCheck,
  },
];

export const metadata: Metadata = {
  title: "OpenOctopus | One API for AI Image, Video, and Model Routing",
  description:
    "OpenOctopus unifies top AI models behind one API with routing, budgets, pricing visibility, and model management for teams shipping image and video generation.",
  alternates: {
    canonical: buildAbsoluteUrl("/"),
  },
  openGraph: {
    type: "website",
    url: buildAbsoluteUrl("/"),
    title: "OpenOctopus | One API for AI Image, Video, and Model Routing",
    description:
      "OpenOctopus unifies top AI models behind one API with routing, budgets, pricing visibility, and model management for teams shipping image and video generation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "OpenOctopus | One API for AI Image, Video, and Model Routing",
    description:
      "OpenOctopus unifies top AI models behind one API with routing, budgets, pricing visibility, and model management for teams shipping image and video generation.",
  },
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = user ? "/dashboard" : "/login";
  const destinationLabel = user ? "Dashboard" : "Get API Key";

  return (
    <div className="min-h-screen bg-[#FCFCFA] text-[#111827]" style={{ colorScheme: "light" }}>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                name: "OpenOctopus",
                url: buildAbsoluteUrl("/"),
              },
              {
                "@type": "WebSite",
                name: "OpenOctopus",
                url: buildAbsoluteUrl("/"),
                description:
                  "OpenOctopus unifies top AI models behind one API with routing, budgets, pricing visibility, and model management for teams shipping image and video generation.",
              },
              {
                "@type": "SoftwareApplication",
                name: "OpenOctopus",
                applicationCategory: "DeveloperApplication",
                operatingSystem: "Web",
                url: buildAbsoluteUrl("/"),
                description:
                  "OpenOctopus unifies top AI models behind one API with routing, budgets, pricing visibility, and model management for teams shipping image and video generation.",
              },
            ],
          }),
        }}
      />
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-[#FCFCFA]/95 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="relative flex h-14 w-full items-center justify-start text-sm md:text-base">
            <Link
              href="/"
              className="-ml-2 rounded-md px-2 py-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
            >
              <Logo className="text-[#111827]" />
            </Link>

            <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
              {HEADER_NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md px-3 py-2 text-[14px] font-medium text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="absolute right-0 flex items-center gap-2 lg:static lg:ml-auto">
              {user ? (
                <span className="hidden max-w-[260px] truncate text-[13px] text-[#6B7280] md:inline">
                  Hi, {user.email ?? user.user_metadata?.name ?? "there"}
                </span>
              ) : null}
              <HomeMobileMenu items={HEADER_NAV_ITEMS.map((item) => ({ ...item }))} />
              <Link
                href={destination}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#111827] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0B1220]"
              >
                {destinationLabel}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="tabular-nums">
        <section className="relative overflow-hidden bg-[#FCFCFA]">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 0%, rgba(243, 226, 201, 0.58), transparent 34%), radial-gradient(circle at 12% 62%, rgba(194,123,59,0.10), transparent 30%), #FCFCFA",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-[440px] opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(17,24,39,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
            }}
          />

          <div className="relative mx-auto flex w-full max-w-7xl flex-col items-center px-6 pb-14 pt-12 md:px-8 md:pb-20 md:pt-20">
            <div className="pointer-events-none absolute left-8 top-16 h-24 w-24 rounded-full border border-[#C27B3B]/20 bg-[#C27B3B]/10 blur-xl" />
            <div className="pointer-events-none absolute bottom-20 right-10 h-32 w-32 rounded-full border border-[#4338CA]/10 bg-[#4338CA]/10 blur-2xl" />
            <div className="z-10 mx-auto flex w-full max-w-7xl flex-col overflow-hidden rounded-xl border border-white/70 bg-white/55 p-6 shadow-[0_30px_100px_rgba(17,24,39,0.18)] backdrop-blur-xl md:p-10 lg:p-16">
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.2)_42%,rgba(194,123,59,0.10))]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
              <div className="relative mb-8 flex flex-wrap items-center justify-center gap-2">
                {["Image", "Video", "Edit", "Routing"].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-black/[0.08] bg-white/70 px-3 py-1 text-[11px] font-medium text-[#6B7280] shadow-sm"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="relative flex flex-col items-center justify-center gap-6 lg:flex-row lg:gap-10">
                <h1 className="text-center text-5xl font-semibold tracking-tight text-[#111827] md:text-7xl lg:text-8xl">
                  Any API
                </h1>
                <p className="max-w-md text-center text-sm leading-6 text-[#6B7280] md:text-base lg:text-left">
                  Discover, integrate, and manage image, video, and multimodal models in one unified API marketplace.
                  Fast integration, reliable routing, and transparent pricing.
                </p>
              </div>

              <div className="relative mt-10 flex flex-col items-center gap-10 lg:flex-row">
                <HeroModelIconStack />
                <h2 className="text-center text-5xl font-semibold tracking-tight text-[#111827] md:text-7xl lg:text-8xl">
                  Any Model
                </h2>
              </div>

              <div className="relative mt-10 flex flex-col items-center gap-8 lg:flex-row lg:items-end lg:justify-center">
                <h2 className="text-center text-5xl font-semibold tracking-tight text-[#111827] underline decoration-[#C27B3B]/60 decoration-4 underline-offset-8 md:text-7xl lg:text-8xl">
                  Always On
                </h2>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/models"
                    className="group relative inline-flex h-12 items-center justify-center overflow-hidden rounded-full bg-[#C27B3B] px-6 text-sm font-bold tracking-wide text-white shadow-lg shadow-[#C27B3B]/25 transition-colors hover:bg-[#A6642D] md:h-14 md:px-8 md:text-[17px]"
                  >
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative z-10 flex items-center gap-2">
                      Explore Models
                      <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                  <Link
                    href={destination}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-black/[0.1] bg-white/70 px-6 text-sm font-semibold text-[#111827] shadow-sm transition-colors hover:bg-white md:h-14 md:px-8 md:text-[17px]"
                  >
                    {destinationLabel}
                  </Link>
                </div>
              </div>

              <div className="relative mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                <HeroStatCard label="Monthly Tokens" value="80T" />
                <HeroStatCard label="Global Users" value="8M+" />
                <HeroStatCard label="Active Providers" value="60+" />
                <HeroStatCard label="Models" value="400+" highlight />
              </div>
            </div>
          </div>
        </section>

        <ModelLogoMarquee />

        <section className="mx-auto w-full max-w-7xl space-y-4 px-6 pb-14 md:space-y-8 md:px-8 md:pb-20">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {CAPABILITY_CARDS.map((card) => (
              <CapabilityCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <ModelLogoGrid />

        <section className="mx-auto w-full max-w-7xl space-y-6 px-6 pb-14 md:px-8 md:pb-20">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Link href="/bestof">
                <div>
                  <h2 className="mb-1 flex items-center gap-1 text-2xl font-semibold align-baseline text-[#111827]">
                    Featured Models
                    <ChevronRight className="inline-block size-5 text-[#6B7280]" />
                  </h2>
                </div>
              </Link>
              <p className="text-sm text-[#6B7280]">
                400+ active models on 60+ providers
              </p>
            </div>
            <Link
              href="/bestof"
              className="group inline-flex text-sm text-[#6B7280] transition-colors hover:text-[#111827]"
            >
              <span className="inline-flex items-center gap-1">
                <span>View all</span>
                <ArrowRight className="inline-flex size-3 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {FEATURED_MODELS.map((model) => (
              <FeaturedModelCard key={model.name} {...model} />
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-4xl space-y-8 px-6 pb-14 md:space-y-12 md:pb-20">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
            {WORKFLOW_STEPS.map((step) => (
              <HowItWorksCard key={step.title} {...step} />
            ))}
          </div>
        </section>

        <BottomPricingCta destination={destination} destinationLabel={destinationLabel} />

      </main>

      <footer className="border-t border-black/[0.06] bg-[#FCFCFA]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-4">
            <Logo className="text-[#111827]" />
            <span className="hidden text-[13px] text-[#9CA3AF] md:inline">
              Creative model routing with spend control.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6B7280]">
            {FOOTER_NAV_ITEMS.map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-[#111827]">
                {item.label}
              </Link>
            ))}
            <span className="text-[#D1D5DB]">•</span>
            <span>© 2026 OpenOctopus</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ModelLogoMarquee() {
  const marqueeItems = [...AI_MODEL_LOGOS, ...AI_MODEL_LOGOS];

  return (
    <section className="w-full overflow-hidden px-0 pb-14 md:pb-20">
      <div className="group relative flex w-full overflow-hidden py-1 [--gap:6px] [gap:var(--gap)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#FCFCFA] to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#FCFCFA] to-transparent"
        />
        <div className="flex shrink-0 animate-[marquee_40s_linear_infinite] justify-around [gap:var(--gap)] group-hover:[animation-play-state:paused]">
          {marqueeItems.map((model, index) => (
            <div key={`${model.name}-${index}`} className="h-full">
              <div className="mx-2 flex h-full min-w-[160px] items-center gap-3 overflow-visible rounded-xl border border-black/[0.08] bg-white/70 px-5 py-4 shadow-sm backdrop-blur-md md:mx-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={model.image}
                  alt={model.name}
                  className="h-10 w-10 shrink-0 object-contain"
                  loading="lazy"
                />
                <span className="whitespace-nowrap text-sm font-semibold text-[#111827]">
                  {model.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroModelIconStack() {
  return (
    <div className="relative flex max-w-full flex-wrap justify-center -space-x-5 -space-y-3 px-5 pt-3 md:-space-x-6">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-16 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#C27B3B]/15 blur-2xl"
      />
      {AI_MODEL_LOGOS.slice(0, 5).map((model, index) => (
        <div
          key={model.name}
          className={`${index >= 2 ? "hidden md:flex" : "flex"} relative size-16 items-center justify-center rounded-full border border-black/[0.08] bg-white p-4 shadow-2xl transition-transform duration-300 hover:-translate-y-1 md:size-20 md:p-5`}
          title={model.name}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={model.image}
            alt={model.name}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

function ModelLogoGrid() {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-4 md:px-8 md:pb-24 md:pt-8">
      <div className="mx-auto mb-10 w-full max-w-3xl text-center">
        <p className="mx-auto max-w-3xl text-sm leading-6 text-[#6B7280] md:text-base">
          OpenOctopus provides access to Kling AI, Runway, Luma AI, Veo, Sora, Flux, and more, all in one place.
          Create stunning visuals using the best AI models available.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 md:grid-cols-6 md:gap-6 lg:grid-cols-8">
        {AI_MODEL_LOGOS.map((model) => (
          <Link
            key={model.name}
            href="/models"
            className="group flex min-w-0 flex-col items-center gap-2"
          >
            <div className="flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-black/[0.08] bg-white/70 p-3 shadow-sm transition-all group-hover:scale-105 group-hover:border-[#C27B3B]/35 group-hover:shadow-md md:size-20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={model.image}
                alt={model.name}
                className="h-full w-full object-contain"
                loading="lazy"
              />
            </div>
            <span className="max-w-full text-center text-xs leading-tight text-[#6B7280] md:text-sm">
              {model.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BottomPricingCta({
  destination,
  destinationLabel,
}: {
  destination: string;
  destinationLabel: string;
}) {
  return (
    <section className="mx-auto w-full max-w-7xl px-6 pb-20 md:px-8">
      <div className="relative h-[30rem] overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 24% 20%, rgba(194,123,59,0.46), transparent 28%), radial-gradient(circle at 78% 70%, rgba(67,56,202,0.28), transparent 30%), linear-gradient(135deg, #111827 0%, #17120E 58%, #2A160C 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(circle at center, black, transparent 76%)",
          }}
        />
        <div className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
        <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 py-8 text-center md:px-10">
          <span className="mb-5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
            Transparent pricing, one balance
          </span>
          <h2 className="max-w-4xl text-3xl font-bold tracking-tight text-white md:text-6xl">
            Ready to Build Something Amazing?
          </h2>
          <p className="mt-6 max-w-xl text-sm leading-6 text-white/72 md:text-xl md:leading-8">
            Access image, video, and editing models with one account. Start building in minutes with developer-friendly docs and unified billing.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href={destination}
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#C27B3B] px-7 text-sm font-semibold text-white shadow-lg shadow-[#C27B3B]/25 transition-colors hover:bg-[#A6642D]"
            >
              {destinationLabel}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 bg-white/10 px-7 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              View Pricing
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-white/78 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              View Documentation
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroStatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border-none bg-transparent text-[#111827] transition-all duration-200">
      <div className="p-4 md:p-6">
        <div className="flex flex-col items-center gap-1 md:gap-2">
          <p className={`text-3xl font-bold md:text-4xl ${highlight ? "text-[#C27B3B]" : "text-[#111827]"}`}>
            {value}
          </p>
          <p className="text-xs text-[#6B7280] md:text-sm">{label}</p>
        </div>
      </div>
    </div>
  );
}

function CapabilityCard({
  variant,
  title,
  description,
  href,
  cta,
  external = false,
}: {
  variant: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  external?: boolean;
}) {
  return (
    <Link href={href} className="h-full">
      <div className="group/card flex h-full flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white text-[#111827] shadow-sm transition-colors duration-200 hover:border-[#C27B3B] hover:shadow-lg">
        <div className="relative h-48 shrink-0 overflow-hidden rounded-t-xl border-b border-black/[0.06] bg-[#FCFCFA] p-2 transition-transform group-hover/card:-translate-y-1 group-hover/card:scale-[1.02]">
          <CapabilityPreview variant={variant} />
        </div>
        <div className="flex h-full flex-col gap-2 px-6 py-4">
          <div className="flex h-full flex-col gap-2">
            <h3 className="text-xl font-semibold transition-colors duration-200 group-hover/card:text-[#111827]">
              {title}
            </h3>
            <p className="text-sm text-[#6B7280]">{description}</p>
          </div>
          <span className="text-sm font-medium text-[#C27B3B] group-hover/card:underline">
            {cta}
            {external ? <ArrowUpRight className="ml-1 inline-block h-4 w-4" /> : null}
          </span>
        </div>
      </div>
    </Link>
  );
}

function CapabilityPreview({ variant }: { variant: string }) {
  if (variant === "providers") {
    return (
      <div className="absolute inset-0">
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-t from-[#FCFCFA] via-transparent to-[#FCFCFA] opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FCFCFA] via-transparent to-[#FCFCFA] opacity-30" />
        </div>
        <div className="absolute inset-4 z-10 grid scale-105 grid-cols-5 gap-x-0 gap-y-1">
          {PROVIDER_ORBS.map((provider, index) => (
            <ProviderOrb key={provider} label={provider} index={index} />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "routing") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="relative flex w-full max-w-52 flex-col items-center gap-y-2">
          <div className="rounded-lg bg-[#EEF2F7] px-3 py-1 text-xs text-[#111827]">
            anthropic/claude-opus-4.7
          </div>
          <svg viewBox="0 0 200 70" className="h-[70px] w-full text-[#9CA3AF]/70" fill="none" aria-hidden="true">
            <path d="M95 0 C100 40, 20 20, 10 65" stroke="currentColor" strokeWidth="0.75" />
            <path d="M100 0 C100 20, 100 20, 100 65" stroke="currentColor" strokeWidth="0.75" />
            <path d="M105 0 C100 40, 180 20, 190 65" stroke="currentColor" strokeWidth="0.75" />
          </svg>
          <div className="flex w-full justify-between">
            {["Google", "Anthropic", "Bedrock"].map((item) => (
              <div
                key={item}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] p-1 shadow-inner"
              >
                <span className="text-[9px] font-semibold text-[#111827]">{item.slice(0, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "performance") {
    return (
      <div className="relative flex h-full items-center justify-center">
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-gradient-to-t from-[#FCFCFA] via-transparent to-[#FCFCFA] opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FCFCFA] via-transparent to-[#FCFCFA] opacity-20" />
        </div>
        <div className="relative flex h-full w-full items-end justify-center gap-2 px-5 pb-5">
          {[28, 44, 64, 58, 82, 98, 88].map((height) => (
            <div
              key={height}
              className="w-6 rounded-t-md bg-gradient-to-t from-[#D6E4FF] to-[#EEF4FF]"
              style={{ height }}
            />
          ))}
          <svg className="absolute inset-0 h-full w-full px-4 py-6" viewBox="0 0 260 150" fill="none" aria-hidden="true">
            <path
              d="M8 118 C45 90, 72 102, 108 74 C138 52, 165 62, 190 40 C214 19, 232 28, 252 18"
              stroke="#111827"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex w-full max-w-52 flex-col items-center">
        <div className="mb-[-8px] flex w-full items-end justify-between px-[45px]">
          <ShieldCheck className="size-4 text-[#9CA3AF]" strokeWidth={1.5} />
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DCFCE7]">
            <svg viewBox="0 0 24 24" className="size-5 text-[#15803D]" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <ShieldCheck className="size-4 text-[#9CA3AF]" strokeWidth={1.5} />
        </div>
        <svg viewBox="0 0 128 128" className="size-32 text-[#9CA3AF]/70" fill="none" aria-hidden="true">
          <path d="M64 14a64 64 0 0 1-44.8 17.6A64 64 0 0 0 16 51.7 64 64 0 0 0 64 114a64 64 0 0 0 44.8-82.4H108A64 64 0 0 1 64 14Z" stroke="currentColor" strokeWidth="2" />
          <path d="M76 78a19 19 0 0 0 8-.8 6 6 0 0 0-10-5m2 5.8v1.4A25 25 0 0 1 64 82c-4.4 0-8.6-1-12-3v-1.4m24 0a12 12 0 0 0-2-6.4m0 0a12 12 0 0 0-10-5.2 12 12 0 0 0-10 5.2m0 0a6 6 0 0 0-10 5.4 19 19 0 0 0 8 .8m2-6.2a12 12 0 0 0-2 6.4M70 49a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm12 6a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm-27 0a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </div>
    </div>
  );
}

function ProviderOrb({ label, index }: { label: string; index: number }) {
  const shifted = index >= 5 && index < 10 ? "translate-x-9" : index >= 15 && index < 20 ? "translate-x-9" : "";
  const palette = ["#E8F0FE", "#ECFDF5", "#FEF3C7", "#F3E8FF", "#FEE2E2"];

  return (
    <div
      title={label}
      className={`size-9 transform transition-all duration-500 ease-out hover:scale-110 hover:brightness-110 ${shifted}`}
      style={{ opacity: 0.85 }}
    >
      <div
        className="flex size-6 items-center justify-center rounded-full border border-black/[0.08] bg-white p-1 shadow-sm"
        style={{ backgroundColor: palette[index % palette.length] }}
      >
        <div className="overflow-hidden rounded-full">
          <span className="flex h-4 w-4 items-center justify-center text-[8px] font-semibold text-[#111827]">
            {label.slice(0, 2).toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function FeaturedModelCard({
  name,
  provider,
  byline,
  metricLabel,
  metricValue,
  trendLabel,
  trend,
  badge,
  icon: Icon,
}: {
  name: string;
  provider: string;
  byline: string;
  metricLabel: string;
  metricValue: string;
  trendLabel: string;
  trend: string;
  badge?: string;
  icon: LucideIcon;
}) {
  return (
    <Link href={`/models/${provider}/${slugifyModelName(name)}`} className="block h-full">
      <div className="group/card flex h-full flex-col overflow-hidden rounded-xl border border-black/[0.08] bg-white text-[#111827] shadow-sm transition-colors hover:border-[#C27B3B] hover:shadow-lg">
        <div className="flex flex-1 flex-col justify-between p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-12 shrink-0 overflow-hidden rounded-full border border-black/[0.08] transition-transform group-hover/card:rotate-12 group-hover/card:scale-110">
                <div className="flex size-full items-center justify-center bg-[#F9FAFB]">
                  <Icon className="h-5 w-5 text-[#111827]" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#111827]">{name}</h3>
                  {badge ? (
                    <span className="rounded-[6px] bg-black/[0.06] px-1.5 py-0.5 text-xs font-medium text-[#111827]">
                      {badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-[#6B7280]">{byline}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 border-t border-black/[0.08] pt-5">
            <div className="flex items-center justify-between">
              <div className="flex flex-col items-start justify-between">
                <span className="text-sm text-[#6B7280]">{metricLabel}</span>
                <span className="text-sm font-medium text-[#111827]">{metricValue}</span>
              </div>
              <div className="flex flex-col items-end justify-between">
                <span className="text-sm text-[#6B7280]">{trendLabel}</span>
                <span className={`text-sm font-medium ${trend.startsWith("+") ? "text-[#15803D]" : "text-[#DC2626]"}`}>
                  {trend}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function HowItWorksCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const isSignup = step === "1";
  const isCredits = step === "2";
  const isApiKey = step === "3";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#C27B3B]/10 text-sm font-medium text-[#C27B3B] md:h-8 md:w-8">
          {step}
        </div>
        <h3 className="text-base font-semibold text-[#111827] md:text-lg">{title}</h3>
      </div>
      <div className="min-h-10 md:min-h-12">
        <p className="text-sm text-[#6B7280]">
          {isApiKey ? (
            <>
              Create an API key and start making requests.{" "}
              <Link href="/docs" className="text-[#111827] underline decoration-black/20 underline-offset-4">
                Fully OpenAI compatible
              </Link>
              .
            </>
          ) : (
            description
          )}
        </p>
      </div>
      <div className="flex w-full max-w-56 flex-col gap-3 pt-4 md:px-2">
        {isSignup ? <SignupPreview /> : null}
        {isCredits ? <CreditsPreview /> : null}
        {isApiKey ? <ApiKeyPreview /> : null}
      </div>
    </div>
  );
}

function SignupPreview() {
  return (
    <>
      <div className="flex items-center gap-2">
        <UserRound className="h-5 w-5 text-[#C27B3B]" strokeWidth={1.5} />
        <TinyLine width="w-6" />
        <TinyLine width="w-12" />
      </div>
      <div className="flex max-w-56 flex-row justify-center gap-2">
        <IconBox icon={<GoogleIcon />} />
      </div>
    </>
  );
}

function CreditsPreview() {
  return (
    <>
      <div className="flex items-center gap-2">
        <CreditCard className="h-5 w-5 text-[#C27B3B]" strokeWidth={1.5} />
        <TinyLine width="w-6" />
        <TinyLine width="w-6" />
        <TinyLine width="w-6" />
        <TinyLine width="w-6" />
      </div>
      <div className="space-y-2">
        <CreditRow date="Apr 1" amount="$99" />
        <CreditRow date="Mar 30" amount="$10" />
      </div>
    </>
  );
}

function ApiKeyPreview() {
  return (
    <>
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#C27B3B]" strokeWidth={1.5} />
        <div className="flex h-6 flex-1 items-center rounded-sm bg-[#C27B3B]/5 px-2">
          <span className="text-xs tracking-wide text-[#6B7280]">OPENROUTER_API_KEY</span>
        </div>
      </div>
      <div className="flex h-6 items-center rounded-sm bg-[#C27B3B]/5 px-2">
        <span className="text-xs tracking-wider text-[#111827]">••••••••••••••••</span>
      </div>
    </>
  );
}

function TinyLine({ width }: { width: string }) {
  return (
    <div className={`flex h-4 flex-col justify-center ${width}`}>
      <div className="h-1 rounded-sm bg-[#C27B3B]/20" />
      <div className="mt-0.5 h-0.5 rounded-sm bg-[#C27B3B]/10" />
    </div>
  );
}

function IconBox({
  label,
  icon,
  dark = false,
  accent = false,
}: {
  label?: string;
  icon?: React.ReactNode;
  dark?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black/[0.04]">
      {icon ? (
        icon
      ) : (
        <span
          className={`text-[10px] font-semibold ${
            dark ? "text-[#111827]" : accent ? "text-[#C27B3B]" : "text-[#4285F4]"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function CreditRow({ date, amount }: { date: string; amount: string }) {
  return (
    <div className="flex h-6 items-center rounded-sm bg-[#C27B3B]/5 px-2">
      <span className="text-xs text-[#6B7280]">{date}</span>
      <div className="mx-2 flex flex-1 items-center gap-2">
        <div className="h-2 flex-1 rounded-sm bg-[#C27B3B]/10" />
        <div className="h-2 flex-1 rounded-sm bg-[#C27B3B]/10" />
      </div>
      <span className="text-sm font-medium text-[#111827]">{amount}</span>
    </div>
  );
}

function slugifyModelName(name: string) {
  return name.toLowerCase().replace(/\./g, ".").replace(/\s+/g, "-");
}
