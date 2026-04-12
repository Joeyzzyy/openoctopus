"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Search, Globe } from "lucide-react";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
  { label: "Enterprise", href: "/enterprise" },
];

export function Header({
  isLoggedIn = false,
  variant = "overlay",
}: {
  isLoggedIn?: boolean;
  variant?: "overlay" | "solid";
}) {
  const { isScrolled } = useScrollPosition();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const shouldUseSolidHeader = variant === "solid";

  return (
    <header
      className={cn(
        "fixed top-0 z-50 w-full transition-all duration-300",
        isScrolled || shouldUseSolidHeader
          ? "border-b border-white/10 bg-[#09070B]/92 backdrop-blur-xl"
          : "bg-transparent"
      )}
      style={{ top: "var(--banner-h, 36px)" }}
    >
      <div className="relative mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-2 px-4 xl:px-0">
        <Link href="/" className="flex min-w-[176px] shrink-0 items-center gap-4 xl:min-w-[202px]">
          <Logo />
        </Link>

        <nav className="ml-5 hidden items-center gap-4.5 xl:ml-7 xl:gap-6.5 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-mono text-[12px] text-white transition-colors hover:text-white/60 xl:text-[13px]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-1.5 md:gap-2">
          <div className="hidden h-8 items-center rounded-[4px] border border-white/5 bg-white/25 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors hover:bg-white/35 md:flex">
            <Search className="h-3.5 w-3.5 text-white" />
            <input
              readOnly
              value=""
              placeholder="Search model..."
              className="h-full w-[108px] border-none bg-transparent pl-2 font-mono text-[11px] text-white outline-none placeholder:text-white/70 xl:w-[128px]"
            />
          </div>

          <button className="flex h-8 min-w-8 items-center justify-center rounded-[4px] border border-white/5 bg-white/25 px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] font-mono text-[11px] text-white transition-colors hover:bg-white/35 md:min-w-[52px] md:px-2.5">
            <Globe className="h-4 w-4" />
            <span className="ml-1 hidden md:inline">EN</span>
          </button>

          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="flex h-8 w-[90px] items-center justify-center rounded-[4px] bg-white text-center font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] transition-colors hover:bg-white/90"
          >
            {isLoggedIn ? "Dashboard" : "Sign In"}
          </Link>

          <button
            className="flex h-8 w-8 items-center justify-center rounded-[2px] text-white lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {!isScrolled && !shouldUseSolidHeader ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        ) : null}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#09070B]/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-[2px] px-3 py-2 text-sm font-mono text-white transition-colors hover:bg-white/5"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
