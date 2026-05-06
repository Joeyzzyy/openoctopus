import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

export function PageHero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  stats,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction?: { href: string; label: string };
  secondaryAction?: { href: string; label: string };
  stats?: Array<{ label: string; value: string }>;
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(243, 226, 201, 0.56), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,252,250,1) 46%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[360px] opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,24,39,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 pb-14 pt-20 md:px-8 md:pb-20 md:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#9CA3AF]">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.065em] text-[#111827] md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-[15px] leading-7 text-[#6B7280] md:text-xl md:leading-8">
            {description}
          </p>
          {primaryAction || secondaryAction ? (
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {primaryAction ? (
                <HeroButton href={primaryAction.href} primary>
                  {primaryAction.label}
                </HeroButton>
              ) : null}
              {secondaryAction ? (
                <HeroButton href={secondaryAction.href}>{secondaryAction.label}</HeroButton>
              ) : null}
            </div>
          ) : null}
          {stats?.length ? (
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-black/[0.08] bg-white p-4 shadow-sm">
                  <p className="text-[12px] uppercase tracking-[0.18em] text-[#9CA3AF]">{stat.label}</p>
                  <p className="mt-2 text-[24px] font-semibold tracking-[-0.05em] text-[#111827]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function HeroButton({
  href,
  children,
  primary = false,
}: {
  href: string;
  children: ReactNode;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center rounded-md bg-[#111827] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#0B1220]"
          : "inline-flex h-11 items-center justify-center rounded-md border border-black/[0.08] bg-white px-5 text-[14px] font-medium text-[#111827] shadow-sm transition-colors hover:bg-[#F9FAFB]"
      }
    >
      {children}
      {!primary ? <ArrowRight className="ml-2 h-4 w-4" /> : null}
    </Link>
  );
}

export function PageSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-14 md:px-8 md:pb-20">
      <div className="mb-6">
        <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[#111827]">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-[15px] leading-7 text-[#6B7280]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-black/[0.08] bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}
