import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const HEADER_NAV_ITEMS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Learn More", href: "/resource" },
  { label: "Tools", href: "/tools" },
];

const FOOTER_NAV_ITEMS = [
  { label: "Pricing", href: "/pricing" },
  { label: "Docs", href: "/docs" },
  { label: "Learn More", href: "/resource" },
  { label: "Tools", href: "/tools" },
];

export function MarketingHeader({
  isLoggedIn = false,
  userLabel,
}: {
  isLoggedIn?: boolean;
  userLabel?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-[#FCFCFA]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-6 md:px-8">
        <div className="relative flex w-full items-center text-sm md:text-base">
          <Link
            href="/"
            className="-ml-2 rounded-md px-2 py-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
          >
            <Logo className="text-[#111827]" />
          </Link>

          <nav className="ml-5 hidden items-center gap-1 lg:flex">
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

          <div className="ml-auto flex items-center gap-2">
            {isLoggedIn && userLabel ? (
              <span className="hidden max-w-[260px] truncate text-[13px] text-[#6B7280] md:inline">
                Hi, {userLabel}
              </span>
            ) : null}
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#111827] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0B1220]"
            >
              {isLoggedIn ? "Dashboard" : "Get API Key"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-black/[0.06] bg-[#FCFCFA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-8 md:py-12">
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
  );
}
