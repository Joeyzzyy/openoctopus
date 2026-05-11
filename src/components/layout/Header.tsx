"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Globe } from "lucide-react";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { label: "Best Of", href: "/bestof" },
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
          ? "border-b border-white/8 bg-[#0C0A09]/90 backdrop-blur-xl"
          : "bg-transparent"
      )}
      style={{ top: "var(--banner-h, 36px)" }}
    >
      <div className="relative mx-auto flex h-[64px] max-w-7xl items-center justify-between gap-2 px-5 xl:px-0">
        <Link href="/" className="flex min-w-[176px] shrink-0 items-center gap-3 xl:min-w-[202px]">
          <Logo />
        </Link>

        <nav className="ml-5 hidden items-center gap-6 xl:ml-8 lg:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="text-[13px] font-medium text-white/80 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2 md:gap-3">
          <button className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 px-2 text-white/80 transition-colors hover:bg-white/15 md:min-w-[56px] md:px-2.5">
            <Globe className="h-4 w-4" />
            <span className="ml-1 hidden text-[12px] font-medium md:inline">EN</span>
          </button>

          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="flex h-9 w-[96px] items-center justify-center rounded-lg bg-[#C27B3B] text-center text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-[#A6642D]"
          >
            {isLoggedIn ? "Dashboard" : "Sign In"}
          </Link>

          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-white lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {!isScrolled && !shouldUseSolidHeader ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        ) : null}
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-[#0C0A09]/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/5"
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
