"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
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
            <Link href="/explore" className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors rounded-md hover:bg-slate-100">
              Explore
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
            <Button variant="ghost" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
              Sign In
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700 text-white">
              Get Started
            </Button>
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
            <Link href="/explore" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Explore</Link>
            <Link href="/pricing" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Pricing</Link>
            <Link href="/enterprise" className="block px-3 py-2 text-sm text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100">Enterprise</Link>
            <div className="pt-2 space-y-2">
              <Button variant="ghost" className="w-full text-slate-600">Sign In</Button>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">Get Started</Button>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
