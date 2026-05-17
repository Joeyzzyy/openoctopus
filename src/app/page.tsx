import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { HomeMobileMenu } from "@/components/marketing/home-mobile-menu";
import { HeaderUserMenu } from "@/components/marketing/header-user-menu";
import { buildAbsoluteUrl } from "./(marketing)/models/data";
import { loadHeaderWalletBalanceLabel } from "@/lib/header-wallet";
import { createClient } from "@/lib/supabase/server";

const HEADER_NAV_ITEMS = [
  { label: "Explore", href: "/dashboard?view=explore" },
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

const SECTION_X_PADDING = "px-6 md:px-8";
const SECTION_Y_PADDING = "py-14 md:py-20";
const CARD_CLASS =
  "rounded-xl border border-black/[0.08] bg-white shadow-sm transition-all duration-200 hover:border-[#C27B3B]/35 hover:shadow-md";

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
      "Keep image and video costs predictable with transparent model pricing and unified wallet billing.",
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
    image: "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/light/openai.png",
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

const API_POWER_CARDS = [
  {
    name: "OpenAI Image2 Edit",
    image:
      "https://ltgdspivywdagkthgwzu.supabase.co/storage/v1/object/public/model-showcase-assets/provider-model-showcase/06882d5f-d093-44c5-a277-63c34c9cfe70/cover-1779005162420-openoctopus-gpt-image-2-image-input-1.webp",
    href: "/models/azure-openai/openoctopus-gpt-image-2-image-input",
    tags: ["image-to-image"],
    description:
      "Edit images from natural-language instructions with one or more reference images.",
  },
  {
    name: "Imagen 4",
    image:
      "https://ltgdspivywdagkthgwzu.supabase.co/storage/v1/object/public/model-showcase-assets/provider-model-showcase/f3c761d8-d3a8-46fb-bc28-044821509205/cover-1778847198762-openoctopus-imagen-4-1.png",
    href: "/models/google/openoctopus-imagen-4",
    tags: ["text-to-image"],
    description:
      "Google's flagship text-to-image model for high-fidelity images and creative control.",
  },
  {
    name: "Imagen 3",
    image:
      "https://ltgdspivywdagkthgwzu.supabase.co/storage/v1/object/public/model-showcase-assets/provider-model-showcase/9bf1e2d5-caee-4afe-be0d-f154f047a634/cover-1778817993519-openoctopus-imagen-3-fast-1.png",
    href: "/models/google/openoctopus-imagen-3",
    tags: ["text-to-image"],
    description:
      "Google text-to-image generation for detailed, beautifully lit, photoreal images.",
  },
  {
    name: "Imagen 3 Fast",
    image:
      "https://ltgdspivywdagkthgwzu.supabase.co/storage/v1/object/public/model-showcase-assets/provider-model-showcase/b10d19c6-39f4-4b4a-96e8-f2103867de98/cover-1778840825936-openoctopus-imagen-3-fast-1.png",
    href: "/models/google/openoctopus-imagen-3-fast",
    tags: ["text-to-image"],
    description:
      "Fast text-to-image generation for richly detailed images with lower latency.",
  },
  {
    name: "Imagen 4 Fast",
    image:
      "https://ltgdspivywdagkthgwzu.supabase.co/storage/v1/object/public/model-showcase-assets/provider-model-showcase/05a90004-bd34-4e4d-a92e-d07152b80c79/cover-1778840680016-openoctopus-imagen-4-fast-1.png",
    href: "/models/google/openoctopus-imagen-4-fast",
    tags: ["text-to-image"],
    description:
      "The fast variant of Imagen 4 for high-quality image generation at speed.",
  },
  {
    name: "OpenAI Image2",
    image:
      "https://ltgdspivywdagkthgwzu.supabase.co/storage/v1/object/public/model-showcase-assets/provider-model-showcase/65bb7939-7344-4e5c-ab92-7603e8c6f078/cover-1778850025490-openoctopus-gpt-image-2-text-input-1.png",
    href: "/models/azure-openai/openoctopus-gpt-image-2-text-input",
    tags: ["text-to-image"],
    description:
      "High-quality image generation from natural-language prompts through OpenAI Image2.",
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
  const destinationLabel = user ? "Dashboard" : "Sign In";
  const walletBalanceLabel = user ? await loadHeaderWalletBalanceLabel(user.id) : null;

  return (
    <div className="min-h-screen bg-white text-[#111827]" style={{ colorScheme: "light" }}>
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
      <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-white/95 backdrop-blur-xl">
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
                  className="rounded-md px-3 py-2 text-[14px] font-medium text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="absolute right-0 flex items-center gap-2 lg:static lg:ml-auto">
              <HomeMobileMenu items={HEADER_NAV_ITEMS.map((item) => ({ ...item }))} />
              {user ? (
                <>
                  <HeaderUserMenu
                    userLabel={user.email ?? (user.user_metadata?.name as string | undefined) ?? null}
                    userAvatarUrl={
                      (user.user_metadata?.avatar_url as string | undefined) ??
                      (user.user_metadata?.picture as string | undefined) ??
                      null
                    }
                    walletBalanceLabel={walletBalanceLabel}
                  />
                  <Link
                    href="/dashboard"
                    className="inline-flex h-9 items-center justify-center rounded-full bg-[#C27B3B] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#A6642D]"
                  >
                    Dashboard
                  </Link>
                </>
              ) : (
                <Link
                  href={destination}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#111827] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0B1220]"
                >
                  {destinationLabel}
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="overflow-hidden bg-white tabular-nums">
        <section className="relative isolate overflow-hidden pb-10 md:pb-14">
          <div className="home-hero-field" aria-hidden="true">
            <span className="home-hero-grid" />
            <span className="home-hero-sweep" />
            <span className="home-hero-nodes" />
            <span className="home-hero-trails" />
            <span className="home-hero-fade" />
          </div>
          <div className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center ${SECTION_X_PADDING} pb-12 pt-12 md:pb-16 md:pt-20`}>
            <div className="relative w-full overflow-hidden rounded-[34px] border border-[#D9C8AE]/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(255,249,239,0.92)_46%,rgba(247,235,216,0.9)_100%)] p-6 shadow-[0_34px_110px_rgba(77,45,22,0.14)] backdrop-blur-md md:p-10 lg:p-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.92),transparent_26rem),radial-gradient(circle_at_82%_30%,rgba(207,133,67,0.16),transparent_24rem),linear-gradient(120deg,rgba(255,255,255,0.46),transparent_42%,rgba(122,66,28,0.06))]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.36] [background-image:linear-gradient(rgba(122,66,28,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(122,66,28,0.045)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_0%,rgba(0,0,0,0.44)_48%,transparent_76%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[34px] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-80px_120px_rgba(122,66,28,0.055)]"
              />
              <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="max-w-3xl">
                  <div className="mb-7 flex flex-wrap gap-2">
                    {["Image generation", "Image editing", "Unified billing"].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#C9945B]/25 bg-[#FFF6EA] px-3.5 py-1.5 text-[11px] font-semibold text-[#7A421C]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <h1 className="max-w-3xl text-[40px] font-bold leading-[1.04] tracking-[-0.032em] text-[#17110B] sm:text-5xl md:text-6xl lg:text-[72px]">
                    Your Creative AI
                    <span className="block pb-2 bg-[linear-gradient(92deg,#AF642B_0%,#E0A15D_38%,#7E3F18_100%)] bg-clip-text font-serif italic leading-[1.14] tracking-[-0.045em] text-transparent">
                      Model Layer.
                    </span>
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-[#5F564C] md:text-base md:leading-7">
                    OpenOctopus helps teams turn image generation and editing models into production-ready API
                    infrastructure, with playground testing, unified billing, and one key for every supported model.
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <PrimaryLink href="/models">
                      Explore Models
                      <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </PrimaryLink>
                    <SecondaryLink href={destination}>{destinationLabel}</SecondaryLink>
                  </div>
                </div>
                <HeroOctopusOrbit />
              </div>
            </div>
          </div>
        </section>

        <HowItWorksSection />

        <ProviderEcosystemSection />

        <ApiPowerSection />

        <section className={`mx-auto w-full max-w-7xl space-y-8 ${SECTION_X_PADDING} pb-14 md:pb-20`}>
          <SectionHeader
            title="Built for model operations"
            description="Route requests, review pricing, manage API keys, and keep playground testing close to production API usage."
          />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {CAPABILITY_CARDS.map((card) => (
              <CapabilityCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <BottomPricingCta destination={destination} destinationLabel={destinationLabel} />

      </main>

      <footer className="border-t border-black/[0.06] bg-white">
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

function ApiPowerSection() {
  return (
    <section className={`mx-auto w-full max-w-7xl ${SECTION_X_PADDING} ${SECTION_Y_PADDING}`}>
      <SectionHeader
        title="Discover the Power of Our APIs"
        description="Explore the image generation and editing models currently available on OpenOctopus."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {API_POWER_CARDS.map((model) => (
          <Link key={model.name} href={model.href} className="group block h-full w-full p-2">
            <div className={`${CARD_CLASS} h-full overflow-hidden group-hover:-translate-y-1`}>
              <div className="p-4">
                <div className="overflow-hidden rounded-lg border border-black/[0.04] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={model.image}
                    alt={model.name}
                    className="h-[200px] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-4 text-xl font-bold tracking-wide text-[#C27B3B]">
                  {model.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {model.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full bg-[#C27B3B] px-3 py-1 text-xs font-medium text-white"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm leading-6 tracking-wide text-[#6B7280]">
                  {model.description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/models"
        className="group mx-auto mt-10 flex w-fit items-center justify-center gap-1 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827] hover:underline"
      >
        View More
        <ChevronRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
      </Link>
    </section>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto mb-8 w-full max-w-3xl text-center md:mb-10">
      <h2 className="text-3xl font-semibold tracking-tight text-[#111827] md:text-4xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[#6B7280] md:text-base">{description}</p>
    </div>
  );
}

function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#C27B3B] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A6642D]"
    >
      {children}
    </Link>
  );
}

function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center rounded-lg border border-black/[0.1] bg-white px-5 text-sm font-semibold text-[#111827] shadow-sm transition-colors hover:bg-[#F9FAFB]"
    >
      {children}
    </Link>
  );
}

function ProviderEcosystemSection() {
  return (
    <section className="relative overflow-hidden border-y border-black/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(194,123,59,0.14),transparent_34rem),linear-gradient(180deg,#ffffff_0%,rgba(250,250,249,0.82)_48%,#ffffff_100%)] py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(255,255,255,0.9),transparent)]" />
      <div className={`relative z-10 mx-auto w-full max-w-7xl ${SECTION_X_PADDING}`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              Top model ecosystems, one API
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
              Production model providers on OpenOctopus
            </h2>
          </div>
          <Link
            href="/models"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#C27B3B] transition-colors hover:text-[#A6642D]"
          >
            View all providers
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {AI_MODEL_LOGOS.slice(0, 14).map((model) => (
            <Link
              key={model.name}
              href="/models"
              className="group flex min-h-[72px] min-w-0 items-center gap-3 rounded-xl border border-black/[0.08] bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#C27B3B]/40 hover:shadow-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={model.image}
                  alt={model.name}
                  className="size-6 object-contain"
                  loading="lazy"
                />
              </div>
              <h3 className="min-w-0 truncate text-xs font-bold text-[#111827]">
                {model.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

const HERO_ORBIT_POSITIONS = [
  { x: "7%", y: "11%", delay: "0s" },
  { x: "31%", y: "4%", delay: "0.04s" },
  { x: "70%", y: "8%", delay: "0.08s" },
  { x: "86%", y: "28%", delay: "0.12s" },
  { x: "78%", y: "68%", delay: "0.16s" },
  { x: "58%", y: "84%", delay: "0.2s" },
  { x: "26%", y: "80%", delay: "0.24s" },
  { x: "6%", y: "66%", delay: "0.28s" },
  { x: "16%", y: "38%", delay: "0.32s" },
  { x: "65%", y: "31%", delay: "0.36s" },
  { x: "43%", y: "17%", delay: "0.4s" },
  { x: "41%", y: "67%", delay: "0.44s" },
  { x: "47%", y: "88%", delay: "0.48s" },
  { x: "89%", y: "50%", delay: "0.52s" },
  { x: "1%", y: "53%", delay: "0.56s" },
];

function HeroOctopusOrbit() {
  return (
    <div className="relative min-h-[430px] overflow-visible p-5 md:min-h-[500px]">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#D18A45]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="hero-orbit-ring absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#C9945B]/18 md:h-[330px] md:w-[330px]"
      />
      <div
        aria-hidden="true"
        className="hero-orbit-ring hero-orbit-ring-slow absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#8A552B]/14 md:h-[420px] md:w-[420px]"
      />
      <div className="absolute left-1/2 top-1/2 z-10 flex h-44 w-44 -translate-x-1/2 -translate-y-1/2 items-center justify-center md:h-56 md:w-56">
        <div className="hero-octopus-logo h-full w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="OpenOctopus"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
      {AI_MODEL_LOGOS.map((model, index) => (
        <div
          key={model.name}
          className="hero-orbit-logo absolute z-20 flex size-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white/92 p-2.5 shadow-[0_14px_34px_rgba(28,25,23,0.10)] backdrop-blur transition-transform duration-300 hover:scale-110 md:size-14 md:p-3"
          style={
            {
              "--orbit-x": HERO_ORBIT_POSITIONS[index % HERO_ORBIT_POSITIONS.length].x,
              "--orbit-y": HERO_ORBIT_POSITIONS[index % HERO_ORBIT_POSITIONS.length].y,
              "--orbit-delay": HERO_ORBIT_POSITIONS[index % HERO_ORBIT_POSITIONS.length].delay,
            } as CSSProperties
          }
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

function BottomPricingCta({
  destination,
  destinationLabel,
}: {
  destination: string;
  destinationLabel: string;
}) {
  return (
    <section className={`mx-auto w-full max-w-7xl ${SECTION_X_PADDING} pb-20`}>
      <div className="relative overflow-hidden rounded-xl border border-[#2B3445] bg-[#111827] shadow-sm">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "linear-gradient(135deg, #111827 0%, #17120E 100%)",
          }}
        />
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-16 text-center md:px-10 md:py-20">
          <span className="mb-5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
            Transparent pricing, one balance
          </span>
          <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            Ready to Build Something Amazing?
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/72 md:text-base">
            Access image, video, and editing models with one account. Start building in minutes with developer-friendly docs and unified billing.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href={destination}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#C27B3B] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#A6642D]"
            >
              {destinationLabel}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
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
      <div className={`${CARD_CLASS} group/card flex h-full flex-col overflow-hidden text-[#111827]`}>
        <div className="relative h-44 shrink-0 overflow-hidden border-b border-black/[0.06] bg-white p-2">
          <CapabilityPreview variant={variant} />
        </div>
        <div className="flex h-full flex-col gap-2 px-6 py-4">
          <div className="flex h-full flex-col gap-2">
            <h3 className="text-lg font-semibold transition-colors duration-200 group-hover/card:text-[#111827]">
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
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white opacity-30" />
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
          <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-white opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-transparent to-white opacity-20" />
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

function HowItWorksSection() {
  return (
    <section className={`relative z-10 mx-auto -mt-2 w-full max-w-7xl ${SECTION_X_PADDING} pb-14 md:-mt-4 md:pb-16`}>
      <div className="mb-7 flex flex-col items-start gap-4 md:mb-8">
        <span className="rounded-full border border-[#C27B3B]/20 bg-[#C27B3B]/5 px-3 py-1 text-[11px] font-medium text-[#8A552B]">
          Start in minutes
        </span>
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111827] md:text-5xl">
            From playground to production.
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#6B7280] md:text-base">
            Test a model visually in Playground, then move the same inputs into an OpenOctopus API request when you are ready to ship.
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-sm font-semibold text-[#111827]">
          <Link href="/models" className="group inline-flex items-center gap-1 transition-colors hover:text-[#C27B3B]">
            Explore models
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/docs" className="group inline-flex items-center gap-1 transition-colors hover:text-[#C27B3B]">
            Read API docs
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <StartModeCard
          title="Use in Playground"
          badge="No code"
          cta="Open models"
          href="/models"
          preview={<PlaygroundModePreview />}
        />
        <StartModeCard
          title="Use through API"
          badge="OpenAI compatible"
          cta="View docs"
          href="/docs"
          preview={<ApiModePreview />}
        />
      </div>
    </section>
  );
}

function StartModeCard({
  title,
  badge,
  cta,
  href,
  preview,
}: {
  title: string;
  badge: string;
  cta: string;
  href: string;
  preview: ReactNode;
}) {
  return (
    <div className={`${CARD_CLASS} flex min-h-[440px] flex-col justify-between overflow-hidden bg-[#FAFAF9]`}>
      <div
        className="flex flex-1 items-center justify-center p-6"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(17,24,39,0.13) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      >
        {preview}
      </div>
      <div className="flex flex-col gap-4 border-t border-black/[0.06] bg-white px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-xl font-semibold text-[#111827] md:text-2xl">{title}</h3>
          <span className="rounded-md bg-[#FFCC33] px-2 py-1 text-[11px] font-bold text-[#111827]">
            {badge}
          </span>
        </div>
        <Link
          href={href}
          className="group inline-flex h-10 w-fit items-center justify-center gap-1 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0B1220]"
        >
          {cta}
          <ChevronRight className="size-4 text-white/70 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function PlaygroundModePreview() {
  return (
    <div className="w-full max-w-md rounded-xl border border-black/[0.08] bg-white p-4 shadow-[0_18px_45px_rgba(17,24,39,0.10)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#C27B3B]/10 text-[#C27B3B]">
            <WandSparkles className="size-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">OpenAI Image2 Edit</p>
            <p className="text-xs text-[#6B7280]">image-to-image</p>
          </div>
        </div>
        <span className="rounded-md bg-[#24BE58]/10 px-2 py-1 text-[10px] font-semibold text-[#15803D]">
          Ready
        </span>
      </div>
      <div className="grid gap-3 md:grid-cols-[0.86fr_1.14fr]">
        <div className="flex aspect-[4/5] items-center justify-center rounded-lg border border-dashed border-black/[0.14] bg-[#FAFAF9]">
          <div className="text-center">
            <Sparkles className="mx-auto size-5 text-[#C27B3B]" />
            <p className="mt-2 text-xs font-medium text-[#6B7280]">Upload image</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-black/[0.06] bg-[#FAFAF9] p-3">
            <p className="text-xs font-medium text-[#6B7280]">Prompt</p>
            <div className="mt-2 h-16 rounded-md bg-white p-3 text-xs leading-5 text-[#111827]">
              Make the product photo cleaner and brighter.
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["1:1", "webp"].map((item) => (
              <div key={item} className="rounded-md bg-[#C27B3B]/10 px-3 py-2 text-center text-xs font-semibold text-[#8A552B]">
                {item}
              </div>
            ))}
          </div>
          <div className="h-9 rounded-lg bg-[#111827]" />
        </div>
      </div>
    </div>
  );
}

function ApiModePreview() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-black/[0.08] bg-[#0B0D10] shadow-[0_18px_45px_rgba(17,24,39,0.16)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-4 py-3">
        <div className="flex gap-2 text-xs font-medium text-white/72">
          <span className="rounded-md bg-white/10 px-2 py-1 text-white">OpenOctopus REST</span>
          <span className="hidden rounded-md px-2 py-1 md:inline">Async task</span>
        </div>
        <span className="text-xs text-white/45">copy</span>
      </div>
      <pre className="overflow-hidden p-5 text-[12px] leading-6 text-[#E5E7EB]">
        <code>{`curl -X POST https://api.openoctopus.com/v1/images/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ooq_your_api_key" \\
  -d '{
    "model": "openoctopus/imagen-4",
    "prompt": "A clean product hero image",
    "input": {
      "aspect_ratio": "1:1",
      "output_format": "webp"
    }
  }'`}</code>
      </pre>
    </div>
  );
}
