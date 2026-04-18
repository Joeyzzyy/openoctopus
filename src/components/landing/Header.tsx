"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-sky-500 to-violet-500 text-white text-center text-sm py-2 px-4">
        🎉 Nano Banana 2 & Pro Sale — <span className="font-semibold">15% OFF</span> | Apr 1–15 Only
      </div>

      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="text-slate-900">
            <Logo className="text-slate-900" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/bestof" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100">
              Best Of
            </Link>
            <Link href="/docs" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100">
              Docs
            </Link>
            <Link href="/pricing" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100">
              Pricing
            </Link>
            <Link href="/enterprise" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100">
              Enterprise
            </Link>
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="inline-flex h-8 items-center justify-center rounded-lg bg-sky-600 px-2.5 text-sm font-medium text-white transition-all hover:bg-sky-700"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden text-slate-600"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200/60 bg-white px-4 py-4 space-y-2">
            <Link href="/bestof" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Best Of</Link>
            <Link href="/docs" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Docs</Link>
            <Link href="/pricing" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Pricing</Link>
            <Link href="/enterprise" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Enterprise</Link>
            <div className="pt-2 space-y-2">
              <Link
                href="/login"
                className="inline-flex h-8 w-full items-center justify-center rounded-lg text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="inline-flex h-8 w-full items-center justify-center rounded-lg bg-blue-600 text-sm font-medium text-white transition-all hover:bg-blue-700"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
