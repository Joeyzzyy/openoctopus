import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Terminal,
  WandSparkles,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { HomeMobileMenu } from "@/components/marketing/home-mobile-menu";
import { HeaderUserMenu } from "@/components/marketing/header-user-menu";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { buildAbsoluteUrl } from "./(marketing)/models/data";
import { loadHeaderWalletBalanceLabel } from "@/lib/header-wallet";
import { getI18n } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { createClient } from "@/lib/supabase/server";

const SECTION_X_PADDING = "px-6 md:px-8";
const SECTION_Y_PADDING = "py-14 md:py-20";
const CARD_CLASS =
  "rounded-xl border border-sky-950/[0.08] bg-white shadow-[0_10px_30px_rgba(14,165,233,0.06)] transition-all duration-200 hover:border-[#38BDF8]/40 hover:shadow-[0_18px_45px_rgba(14,165,233,0.14)]";

const CAPABILITY_CARD_CONFIG = [
  {
    variant: "providers",
    href: "/bestof",
  },
  {
    variant: "routing",
    href: "/docs",
    external: true,
  },
  {
    variant: "performance",
    href: "/docs",
    external: true,
  },
  {
    variant: "policy",
    href: "/docs",
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
  const locale = await getLocale();
  const copy = getI18n(locale);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = user ? "/dashboard" : "/login";
  const destinationLabel = user ? copy.nav.dashboard : copy.nav.signIn;
  const walletBalanceLabel = user ? await loadHeaderWalletBalanceLabel(user.id) : null;
  const headerNavItems = [
    { label: copy.nav.explore, href: "/dashboard?view=explore" },
    { label: copy.nav.pricing, href: "/pricing" },
    { label: copy.nav.docs, href: "/docs" },
    { label: copy.nav.learnMore, href: "/resource" },
  ];
  const footerNavItems = [
    { label: copy.nav.models, href: "/models" },
    { label: copy.nav.pricing, href: "/pricing" },
    { label: copy.nav.docs, href: "/docs" },
    { label: copy.nav.learnMore, href: "/resource" },
    { label: copy.nav.tools, href: "/tools" },
  ];
  const capabilityCards = CAPABILITY_CARD_CONFIG.map((card, index) => ({
    ...card,
    ...copy.home.capabilityCards[index],
  }));

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
              {headerNavItems.map((item) => (
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
              <HomeMobileMenu
                items={headerNavItems.map((item) => ({ ...item }))}
                labels={copy.mobileMenu}
              />
              {user ? (
                <>
                  <HeaderUserMenu
                    locale={locale}
                    userLabel={user.email ?? (user.user_metadata?.name as string | undefined) ?? null}
                    userAvatarUrl={
                      (user.user_metadata?.avatar_url as string | undefined) ??
                      (user.user_metadata?.picture as string | undefined) ??
                      null
                    }
                    walletBalanceLabel={walletBalanceLabel}
                    labels={{
                      openMenu: copy.account.openMenu,
                      userFallback: copy.account.userFallback,
                      walletBalance: copy.account.walletBalance,
                      dashboard: copy.nav.dashboard,
                      signOut: copy.nav.signOut,
                      refreshingBalance: copy.account.refreshingBalance,
                      refreshBalance: copy.account.refreshBalance,
                      language: copy.account.language,
                      english: copy.account.english,
                      chinese: copy.account.chinese,
                    }}
                  />
                </>
              ) : (
                <>
                  <LanguageSwitcher
                    locale={locale}
                    label={copy.language.short}
                    nextLabel={copy.language.nextShort}
                    ariaLabel={copy.language.switchTo}
                  />
                  <Link
                    href={destination}
                    className="inline-flex h-9 items-center justify-center rounded-md bg-[linear-gradient(135deg,#0EA5E9_0%,#06B6D4_100%)] px-4 text-[13px] font-medium text-white shadow-sm shadow-sky-500/20 transition-all hover:shadow-md hover:shadow-sky-500/30"
                  >
                    {destinationLabel}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden bg-white tabular-nums">
        <PageBubbles />
        <section className="relative isolate overflow-hidden pb-10 md:pb-14">
          <div className="home-hero-field" aria-hidden="true">
            <span className="home-hero-grid" />
            <HeroBubbles className="home-hero-bubbles home-bubbles-glossy" />
            <span className="home-hero-sweep" />
            <span className="home-hero-nodes" />
            <span className="home-hero-trails" />
            <span className="home-hero-fade" />
          </div>
          <div className={`relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center ${SECTION_X_PADDING} pb-12 pt-12 md:pb-16 md:pt-20`}>
            <div className="relative w-full overflow-hidden rounded-[34px] border border-[#BAE6FD]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(240,249,255,0.94)_44%,rgba(224,242,254,0.9)_100%)] p-6 shadow-[0_34px_110px_rgba(14,165,233,0.18)] backdrop-blur-md md:p-10 lg:p-14">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_16%,rgba(255,255,255,0.96),transparent_26rem),radial-gradient(ellipse_at_82%_30%,rgba(56,189,248,0.2),transparent_24rem),linear-gradient(120deg,rgba(255,255,255,0.5),transparent_42%,rgba(14,165,233,0.08))]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:linear-gradient(rgba(7,89,133,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(7,89,133,0.045)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_0%,rgba(0,0,0,0.44)_48%,transparent_76%)]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[34px] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-80px_120px_rgba(14,165,233,0.09)]"
              />
              <HeroBubbles className="home-hero-card-bubbles home-bubbles-glossy" />
              <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
                <div className="max-w-3xl">
                  <div className="mb-7 flex flex-wrap gap-2">
                    {copy.home.chips.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-[#7DD3FC]/40 bg-[#F0F9FF]/90 px-3.5 py-1.5 text-[11px] font-semibold text-[#075985] shadow-sm shadow-sky-200/40"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <h1 className="max-w-3xl text-[40px] font-bold leading-[1.04] tracking-[-0.032em] text-[#082F49] sm:text-5xl md:text-6xl lg:text-[72px]">
                    {copy.home.heroTitle}
                    <span className="block bg-[linear-gradient(92deg,#0284C7_0%,#38BDF8_42%,#06B6D4_68%,#075985_100%)] bg-clip-text pb-2 font-serif italic leading-[1.14] tracking-[-0.045em] text-transparent">
                      {copy.home.heroHighlight}
                    </span>
                  </h1>
                  <p className="mt-5 max-w-2xl text-sm leading-6 text-[#475569] md:text-base md:leading-7">
                    {copy.home.heroDescription}
                  </p>
                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <PrimaryLink href="/models">
                      {copy.home.exploreModels}
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

        <HowItWorksSection copy={copy.home} />

        <ProviderEcosystemSection copy={copy.home} />

        <ApiPowerSection copy={copy.home} />

        <section className={`mx-auto w-full max-w-7xl space-y-8 ${SECTION_X_PADDING} pb-14 md:pb-20`}>
          <SectionHeader
            title={copy.home.opsTitle}
            description={copy.home.opsDescription}
          />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {capabilityCards.map((card) => (
              <CapabilityCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        <BottomPricingCta copy={copy.home} destination={destination} destinationLabel={destinationLabel} />

      </main>

      <footer className="border-t border-black/[0.06] bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-4">
            <Logo className="text-[#111827]" />
            <span className="hidden text-[13px] text-[#9CA3AF] md:inline">
              {copy.footer.tagline}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6B7280]">
            {footerNavItems.map((item) => (
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

function ApiPowerSection({ copy }: { copy: ReturnType<typeof getI18n>["home"] }) {
  return (
    <section className={`mx-auto w-full max-w-7xl ${SECTION_X_PADDING} ${SECTION_Y_PADDING}`}>
      <SectionHeader
        title={copy.discoverTitle}
        description={copy.discoverDescription}
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
                <h3 className="mt-4 text-xl font-bold tracking-wide text-[#38BDF8]">
                  {model.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {model.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-full bg-[#38BDF8] px-3 py-1 text-xs font-medium text-white"
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
        {copy.viewMore}
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
      className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#38BDF8] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0284C7]"
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

function ProviderEcosystemSection({ copy }: { copy: ReturnType<typeof getI18n>["home"] }) {
  return (
    <section className="relative overflow-hidden border-y border-sky-950/[0.06] bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.18),transparent_34rem),linear-gradient(180deg,#ffffff_0%,rgba(240,249,255,0.86)_48%,#ffffff_100%)] py-14">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-[linear-gradient(0deg,rgba(255,255,255,0.9),transparent)]" />
      <div className={`relative z-10 mx-auto w-full max-w-7xl ${SECTION_X_PADDING}`}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
              {copy.providersEyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
              {copy.providersTitle}
            </h2>
          </div>
          <Link
            href="/models"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#38BDF8] transition-colors hover:text-[#0284C7]"
          >
            {copy.viewAllProviders}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {AI_MODEL_LOGOS.slice(0, 14).map((model) => (
            <Link
              key={model.name}
              href="/models"
              className="group flex min-h-[72px] min-w-0 items-center gap-3 rounded-xl border border-sky-950/[0.08] bg-white px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#38BDF8]/40 hover:shadow-md"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-sky-950/[0.08] bg-white">
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

const HOME_HERO_BUBBLES = [
  { x: "5%", y: "72%", size: "12px", opacity: 0.48, duration: "13s", delay: "-8s", drift: "36px", driftMid: "-18px", rise: "-680px", riseMid: "-310px" },
  { x: "9%", y: "28%", size: "24px", opacity: 0.42, duration: "19s", delay: "-15s", drift: "-42px", driftMid: "22px", rise: "-720px", riseMid: "-340px" },
  { x: "14%", y: "54%", size: "9px", opacity: 0.52, duration: "11s", delay: "-5s", drift: "26px", driftMid: "-28px", rise: "-610px", riseMid: "-280px" },
  { x: "20%", y: "82%", size: "18px", opacity: 0.46, duration: "16s", delay: "-11s", drift: "54px", driftMid: "18px", rise: "-760px", riseMid: "-360px" },
  { x: "27%", y: "36%", size: "14px", opacity: 0.5, duration: "14s", delay: "-9s", drift: "-34px", driftMid: "16px", rise: "-640px", riseMid: "-300px" },
  { x: "33%", y: "66%", size: "30px", opacity: 0.34, duration: "22s", delay: "-19s", drift: "48px", driftMid: "-24px", rise: "-820px", riseMid: "-400px" },
  { x: "39%", y: "20%", size: "11px", opacity: 0.48, duration: "12s", delay: "-7s", drift: "-22px", driftMid: "26px", rise: "-620px", riseMid: "-260px" },
  { x: "45%", y: "48%", size: "21px", opacity: 0.44, duration: "18s", delay: "-13s", drift: "-52px", driftMid: "20px", rise: "-740px", riseMid: "-330px" },
  { x: "52%", y: "77%", size: "13px", opacity: 0.5, duration: "15s", delay: "-10s", drift: "38px", driftMid: "-20px", rise: "-700px", riseMid: "-320px" },
  { x: "58%", y: "31%", size: "27px", opacity: 0.36, duration: "21s", delay: "-17s", drift: "-30px", driftMid: "28px", rise: "-790px", riseMid: "-390px" },
  { x: "64%", y: "58%", size: "10px", opacity: 0.54, duration: "10.5s", delay: "-4s", drift: "24px", driftMid: "-18px", rise: "-590px", riseMid: "-250px" },
  { x: "70%", y: "86%", size: "19px", opacity: 0.45, duration: "17s", delay: "-12s", drift: "-46px", driftMid: "16px", rise: "-760px", riseMid: "-350px" },
  { x: "77%", y: "42%", size: "15px", opacity: 0.5, duration: "13.5s", delay: "-6s", drift: "34px", driftMid: "-24px", rise: "-650px", riseMid: "-300px" },
  { x: "84%", y: "70%", size: "26px", opacity: 0.38, duration: "20s", delay: "-16s", drift: "-40px", driftMid: "24px", rise: "-800px", riseMid: "-370px" },
  { x: "91%", y: "24%", size: "12px", opacity: 0.5, duration: "12.5s", delay: "-8s", drift: "28px", driftMid: "-14px", rise: "-620px", riseMid: "-290px" },
  { x: "96%", y: "52%", size: "17px", opacity: 0.46, duration: "16.5s", delay: "-14s", drift: "-44px", driftMid: "12px", rise: "-730px", riseMid: "-330px" },
  { x: "11%", y: "90%", size: "34px", opacity: 0.26, duration: "24s", delay: "-21s", drift: "60px", driftMid: "24px", rise: "-860px", riseMid: "-430px" },
  { x: "62%", y: "12%", size: "8px", opacity: 0.5, duration: "10s", delay: "-3s", drift: "18px", driftMid: "-22px", rise: "-560px", riseMid: "-240px" },
  { x: "2%", y: "38%", size: "38px", opacity: 0.34, duration: "25s", delay: "-20s", drift: "64px", driftMid: "-24px", rise: "-850px", riseMid: "-420px" },
  { x: "18%", y: "17%", size: "26px", opacity: 0.48, duration: "18s", delay: "-12s", drift: "-38px", driftMid: "22px", rise: "-680px", riseMid: "-320px" },
  { x: "31%", y: "7%", size: "16px", opacity: 0.56, duration: "13s", delay: "-5s", drift: "28px", driftMid: "-16px", rise: "-560px", riseMid: "-260px" },
  { x: "48%", y: "24%", size: "42px", opacity: 0.28, duration: "27s", delay: "-23s", drift: "-58px", driftMid: "30px", rise: "-900px", riseMid: "-440px" },
  { x: "67%", y: "45%", size: "23px", opacity: 0.5, duration: "16s", delay: "-9s", drift: "42px", driftMid: "-20px", rise: "-700px", riseMid: "-340px" },
  { x: "79%", y: "14%", size: "18px", opacity: 0.54, duration: "14s", delay: "-6s", drift: "-30px", driftMid: "18px", rise: "-610px", riseMid: "-280px" },
  { x: "88%", y: "87%", size: "36px", opacity: 0.32, duration: "24s", delay: "-18s", drift: "-66px", driftMid: "28px", rise: "-860px", riseMid: "-410px" },
  { x: "38%", y: "92%", size: "20px", opacity: 0.52, duration: "15s", delay: "-10s", drift: "34px", driftMid: "-26px", rise: "-650px", riseMid: "-310px" },
];

const HOME_PAGE_BUBBLES = [
  { x: "3%", y: "6%", size: "18px", opacity: 0.2, duration: "22s", delay: "-14s", drift: "48px", driftMid: "-22px", rise: "-540px", riseMid: "-250px" },
  { x: "94%", y: "8%", size: "12px", opacity: 0.24, duration: "16s", delay: "-7s", drift: "-34px", driftMid: "18px", rise: "-420px", riseMid: "-210px" },
  { x: "17%", y: "14%", size: "9px", opacity: 0.28, duration: "13s", delay: "-5s", drift: "28px", driftMid: "-16px", rise: "-390px", riseMid: "-180px" },
  { x: "82%", y: "18%", size: "28px", opacity: 0.18, duration: "26s", delay: "-20s", drift: "-52px", driftMid: "26px", rise: "-620px", riseMid: "-310px" },
  { x: "8%", y: "25%", size: "13px", opacity: 0.24, duration: "15s", delay: "-10s", drift: "32px", driftMid: "-20px", rise: "-430px", riseMid: "-220px" },
  { x: "55%", y: "29%", size: "22px", opacity: 0.2, duration: "21s", delay: "-13s", drift: "-42px", driftMid: "18px", rise: "-560px", riseMid: "-280px" },
  { x: "91%", y: "34%", size: "10px", opacity: 0.27, duration: "12s", delay: "-4s", drift: "-24px", driftMid: "16px", rise: "-370px", riseMid: "-190px" },
  { x: "27%", y: "39%", size: "30px", opacity: 0.16, duration: "27s", delay: "-23s", drift: "56px", driftMid: "-28px", rise: "-660px", riseMid: "-320px" },
  { x: "6%", y: "45%", size: "20px", opacity: 0.21, duration: "19s", delay: "-12s", drift: "44px", driftMid: "18px", rise: "-500px", riseMid: "-240px" },
  { x: "73%", y: "49%", size: "14px", opacity: 0.25, duration: "15.5s", delay: "-8s", drift: "-36px", driftMid: "20px", rise: "-430px", riseMid: "-220px" },
  { x: "41%", y: "54%", size: "8px", opacity: 0.3, duration: "11s", delay: "-6s", drift: "22px", driftMid: "-18px", rise: "-340px", riseMid: "-160px" },
  { x: "96%", y: "58%", size: "24px", opacity: 0.18, duration: "23s", delay: "-17s", drift: "-58px", driftMid: "24px", rise: "-590px", riseMid: "-300px" },
  { x: "15%", y: "64%", size: "11px", opacity: 0.27, duration: "13.5s", delay: "-9s", drift: "30px", driftMid: "-12px", rise: "-390px", riseMid: "-200px" },
  { x: "61%", y: "68%", size: "32px", opacity: 0.15, duration: "29s", delay: "-25s", drift: "-48px", driftMid: "28px", rise: "-700px", riseMid: "-340px" },
  { x: "35%", y: "73%", size: "16px", opacity: 0.23, duration: "17s", delay: "-11s", drift: "38px", driftMid: "-24px", rise: "-470px", riseMid: "-230px" },
  { x: "87%", y: "78%", size: "9px", opacity: 0.3, duration: "10.5s", delay: "-3s", drift: "-20px", driftMid: "14px", rise: "-330px", riseMid: "-150px" },
  { x: "4%", y: "83%", size: "26px", opacity: 0.17, duration: "24s", delay: "-18s", drift: "50px", driftMid: "-18px", rise: "-610px", riseMid: "-290px" },
  { x: "49%", y: "88%", size: "12px", opacity: 0.26, duration: "14s", delay: "-7s", drift: "-28px", driftMid: "20px", rise: "-390px", riseMid: "-180px" },
  { x: "76%", y: "93%", size: "19px", opacity: 0.21, duration: "18s", delay: "-13s", drift: "40px", driftMid: "-22px", rise: "-500px", riseMid: "-260px" },
  { x: "22%", y: "97%", size: "10px", opacity: 0.29, duration: "12.5s", delay: "-5s", drift: "24px", driftMid: "-16px", rise: "-360px", riseMid: "-170px" },
  { x: "37%", y: "10%", size: "34px", opacity: 0.2, duration: "27s", delay: "-22s", drift: "62px", driftMid: "-28px", rise: "-700px", riseMid: "-330px" },
  { x: "68%", y: "15%", size: "16px", opacity: 0.3, duration: "14s", delay: "-6s", drift: "-26px", driftMid: "16px", rise: "-410px", riseMid: "-190px" },
  { x: "44%", y: "23%", size: "25px", opacity: 0.23, duration: "20s", delay: "-15s", drift: "46px", driftMid: "-22px", rise: "-560px", riseMid: "-270px" },
  { x: "20%", y: "32%", size: "18px", opacity: 0.29, duration: "15s", delay: "-9s", drift: "-34px", driftMid: "18px", rise: "-440px", riseMid: "-210px" },
  { x: "79%", y: "41%", size: "38px", opacity: 0.17, duration: "30s", delay: "-27s", drift: "-70px", driftMid: "32px", rise: "-760px", riseMid: "-370px" },
  { x: "12%", y: "52%", size: "28px", opacity: 0.22, duration: "23s", delay: "-18s", drift: "54px", driftMid: "-26px", rise: "-610px", riseMid: "-300px" },
  { x: "52%", y: "61%", size: "15px", opacity: 0.31, duration: "13s", delay: "-5s", drift: "-24px", driftMid: "16px", rise: "-380px", riseMid: "-180px" },
  { x: "69%", y: "71%", size: "24px", opacity: 0.24, duration: "19s", delay: "-12s", drift: "42px", driftMid: "-22px", rise: "-520px", riseMid: "-260px" },
  { x: "30%", y: "81%", size: "36px", opacity: 0.18, duration: "28s", delay: "-24s", drift: "-58px", driftMid: "30px", rise: "-720px", riseMid: "-350px" },
  { x: "93%", y: "87%", size: "17px", opacity: 0.3, duration: "15s", delay: "-8s", drift: "-30px", driftMid: "18px", rise: "-420px", riseMid: "-210px" },
  { x: "9%", y: "94%", size: "22px", opacity: 0.25, duration: "18s", delay: "-11s", drift: "38px", driftMid: "-18px", rise: "-480px", riseMid: "-230px" },
  { x: "58%", y: "98%", size: "31px", opacity: 0.19, duration: "25s", delay: "-20s", drift: "-48px", driftMid: "24px", rise: "-650px", riseMid: "-310px" },
];

type BubbleConfig = (typeof HOME_HERO_BUBBLES)[number];

function Bubbles({
  className,
  bubbles,
}: {
  className: string;
  bubbles: BubbleConfig[];
}) {
  return (
    <span className={className}>
      {bubbles.map((bubble, index) => (
        <span
          key={index}
          className="home-hero-bubble"
          style={
            {
              "--bubble-x": bubble.x,
              "--bubble-y": bubble.y,
              "--bubble-size": bubble.size,
              "--bubble-opacity": bubble.opacity,
              "--bubble-duration": bubble.duration,
              "--bubble-delay": bubble.delay,
              "--bubble-drift": bubble.drift,
              "--bubble-drift-mid": bubble.driftMid,
              "--bubble-rise": bubble.rise,
              "--bubble-rise-mid": bubble.riseMid,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}

function HeroBubbles({ className }: { className: string }) {
  return <Bubbles className={className} bubbles={HOME_HERO_BUBBLES} />;
}

function PageBubbles() {
  return <Bubbles className="home-page-bubbles" bubbles={HOME_PAGE_BUBBLES} />;
}

function HeroOctopusOrbit() {
  return (
    <div className="relative min-h-[430px] overflow-visible p-5 md:min-h-[500px]">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38BDF8]/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="hero-orbit-ring absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#7DD3FC]/18 md:h-[330px] md:w-[330px]"
      />
      <div
        aria-hidden="true"
        className="hero-orbit-ring hero-orbit-ring-slow absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[#075985]/14 md:h-[420px] md:w-[420px]"
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
  copy,
  destination,
  destinationLabel,
}: {
  copy: ReturnType<typeof getI18n>["home"];
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
              "linear-gradient(135deg, #082F49 0%, #0C4A6E 48%, #075985 100%)",
          }}
        />
        <div className="relative z-10 flex w-full flex-col items-center justify-center px-6 py-16 text-center md:px-10 md:py-20">
          <span className="mb-5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
            {copy.ctaEyebrow}
          </span>
          <h2 className="max-w-4xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            {copy.ctaTitle}
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/72 md:text-base">
            {copy.ctaDescription}
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href={destination}
              className="group inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#38BDF8] px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0284C7]"
            >
              {destinationLabel}
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-white/15 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/15"
            >
              {copy.viewPricing}
            </Link>
            <Link
              href="/docs"
              className="text-sm font-medium text-white/78 underline-offset-4 transition-colors hover:text-white hover:underline"
            >
              {copy.viewDocumentation}
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
          <span className="text-sm font-medium text-[#38BDF8] group-hover/card:underline">
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
  const palette = ["#E0F2FE", "#E0F7FA", "#DBEAFE", "#ECFEFF", "#DFF6FF"];

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

function HowItWorksSection({ copy }: { copy: ReturnType<typeof getI18n>["home"] }) {
  return (
    <section className={`relative z-10 mx-auto -mt-2 w-full max-w-7xl ${SECTION_X_PADDING} pb-14 md:-mt-4 md:pb-16`}>
      <div className="mb-7 flex flex-col items-start gap-4 md:mb-8">
        <span className="rounded-full border border-[#38BDF8]/20 bg-[#38BDF8]/5 px-3 py-1 text-[11px] font-medium text-[#075985]">
          {copy.startEyebrow}
        </span>
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[#111827] md:text-5xl">
            {copy.startTitle}
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#6B7280] md:text-base">
            {copy.startDescription}
          </p>
        </div>
        <div className="flex flex-wrap gap-8 text-sm font-semibold text-[#111827]">
          <Link href="/models" className="group inline-flex items-center gap-1 transition-colors hover:text-[#38BDF8]">
            {copy.exploreModels}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/docs" className="group inline-flex items-center gap-1 transition-colors hover:text-[#38BDF8]">
            {copy.readDocs}
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <StartModeCard
          title={copy.usePlayground}
          badge={copy.noCode}
          cta={copy.openModels}
          href="/models"
          preview={<PlaygroundModePreview copy={copy} />}
        />
        <StartModeCard
          title={copy.useApi}
          badge={copy.openAiCompatible}
          cta={copy.viewDocs}
          href="/docs"
          preview={<ApiModePreview copy={copy} />}
        />
        <StartModeCard
          title={copy.useCli}
          badge="npm install"
          cta={copy.readDocs}
          href="/docs"
          preview={<CliModePreview />}
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
    <div className={`${CARD_CLASS} flex min-h-[320px] flex-col justify-between overflow-hidden bg-[#FAFAF9] md:min-h-[380px] lg:min-h-[440px]`}>
      <div
        className="flex min-h-[188px] shrink-0 items-center justify-center p-3 sm:p-4 md:min-h-0 md:flex-1 md:p-6"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(17,24,39,0.13) 1.5px, transparent 1.5px)",
          backgroundSize: "28px 28px",
        }}
      >
        {preview}
      </div>
      <div className="flex shrink-0 flex-col justify-between gap-2 border-t border-black/[0.06] bg-white px-4 py-3 md:gap-3 md:px-6 md:py-5">
        <div className="flex min-w-0 items-center gap-2 md:gap-2.5">
          <h3 className="text-[13px] font-semibold leading-tight text-[#111827] md:whitespace-nowrap md:text-[14px] lg:text-[13px] xl:text-[16px] 2xl:text-[18px]">
            {title}
          </h3>
          <span className="shrink-0 whitespace-nowrap rounded-md bg-[#BAE6FD] px-2 py-1 text-[10px] font-bold leading-none text-[#111827] md:text-[11px]">
            {badge}
          </span>
        </div>
        <Link
          href={href}
          className="group inline-flex h-8 w-fit shrink-0 items-center justify-center gap-1 self-start whitespace-nowrap rounded-lg bg-[#111827] px-3 text-xs font-semibold text-white transition-colors hover:bg-[#0B1220] md:h-10 md:px-4 md:text-sm"
        >
          {cta}
          <ChevronRight className="size-4 text-white/70 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

function PlaygroundModePreview({ copy }: { copy: ReturnType<typeof getI18n>["home"] }) {
  return (
    <div className="w-full max-w-md rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-[0_18px_45px_rgba(17,24,39,0.10)] md:p-4">
      <div className="mb-2 flex items-center justify-between md:mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#38BDF8]/10 text-[#38BDF8] md:size-8">
            <WandSparkles className="size-3.5 md:size-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[#111827] md:text-sm">OpenAI Image2 Edit</p>
            <p className="text-[10px] text-[#6B7280] md:text-xs">image-to-image</p>
          </div>
        </div>
        <span className="rounded-md bg-[#24BE58]/10 px-2 py-1 text-[10px] font-semibold text-[#15803D]">
          {copy.ready}
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-[0.86fr_1.14fr] md:gap-3">
        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-black/[0.14] bg-[#FAFAF9] md:h-auto md:aspect-[4/5]">
          <div className="text-center">
            <Sparkles className="mx-auto size-4 text-[#38BDF8] md:size-5" />
            <p className="mt-1 text-[10px] font-medium text-[#6B7280] md:mt-2 md:text-xs">{copy.uploadImage}</p>
          </div>
        </div>
        <div className="space-y-2 md:space-y-3">
          <div className="rounded-lg border border-black/[0.06] bg-[#FAFAF9] p-2 md:p-3">
            <p className="text-[10px] font-medium text-[#6B7280] md:text-xs">{copy.prompt}</p>
            <div className="mt-1 min-h-9 rounded-md bg-white p-2 text-[10px] leading-4 text-[#111827] md:mt-2 md:min-h-16 md:p-3 md:text-xs md:leading-5">
              {copy.promptExample}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["1:1", "webp"].map((item) => (
              <div key={item} className="rounded-md bg-[#38BDF8]/10 px-2 py-1.5 text-center text-[10px] font-semibold text-[#075985] md:px-3 md:py-2 md:text-xs">
                {item}
              </div>
            ))}
          </div>
          <div className="hidden h-9 rounded-lg bg-[#111827] md:block" />
        </div>
      </div>
    </div>
  );
}

function ApiModePreview({ copy }: { copy: ReturnType<typeof getI18n>["home"] }) {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-black/[0.08] bg-[#0B0D10] shadow-[0_18px_45px_rgba(17,24,39,0.16)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#111827] px-4 py-3">
        <div className="flex gap-2 text-xs font-medium text-white/72">
          <span className="rounded-md bg-white/10 px-2 py-1 text-white">OpenOctopus REST</span>
          <span className="hidden rounded-md px-2 py-1 md:inline">{copy.asyncTask}</span>
        </div>
        <span className="text-xs text-white/45">{copy.copy}</span>
      </div>
      <pre className="overflow-x-auto p-4 text-[10px] leading-5 text-[#E5E7EB] md:p-5 md:text-[12px] md:leading-6">
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

function CliModePreview() {
  return (
    <div className="w-full max-w-md overflow-hidden rounded-xl border border-black/[0.08] bg-[#082F49] shadow-[0_18px_45px_rgba(8,47,73,0.18)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#0C4A6E] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-white/72">
          <span className="flex size-7 items-center justify-center rounded-md bg-white/10 text-white">
            <Terminal className="size-4" />
          </span>
          <span className="text-white">OpenOctopus CLI</span>
        </div>
        <span className="rounded-md bg-[#38BDF8]/18 px-2 py-1 text-[10px] font-semibold text-[#BAE6FD]">
          ooct
        </span>
      </div>
      <div className="space-y-3 p-4 md:space-y-4 md:p-5">
        <pre className="overflow-x-auto rounded-lg border border-white/10 bg-black/24 p-3 text-[10px] leading-5 text-[#E0F2FE] md:p-4 md:text-[12px] md:leading-6">
          <code>{`npm i -g @openoctopus/cli
ooct auth login
ooct run openoctopus/image-captioner-molmo2 \\
  --image ./input.png \\
  --detail-level low`}</code>
        </pre>
        <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3">
          <p className="text-[11px] font-semibold uppercase text-[#7DD3FC]">Output</p>
          <p className="mt-2 text-sm leading-6 text-white/82">
            A pixel art landscape with a magnifying glass highlighting a mountain scene.
          </p>
        </div>
      </div>
    </div>
  );
}
