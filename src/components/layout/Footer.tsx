"use client";

import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { Logo } from "./Logo";

const FOOTER_SECTIONS = [
  {
    title: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Documentation", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "About Us", href: "/about" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/about" },
      { label: "Privacy Policy", href: "/about" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0C0A09] py-16 md:px-20 md:pt-20">
      <div className="mx-auto w-full max-w-7xl px-5 xl:px-0">
        <FadeIn>
          <div className="flex w-full flex-col items-start justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
            </Link>
            <Link
              href="https://status.wavespeed.ai/"
              className="flex h-8 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3"
            >
              <span className="size-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-white/50">
                All systems operational
              </span>
            </Link>
          </div>

          <div className="mb-10 mt-8 grid grid-cols-2 gap-x-8 gap-y-9 md:grid-cols-2">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title} className="flex w-auto flex-col gap-3">
                <h4 className="text-[12px] font-semibold uppercase tracking-[1px] text-white/40">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[13px] leading-5 text-white/50 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeIn>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-end">
          <p className="text-[12px] text-white/40">
            © {new Date().getFullYear()} OpenOctopus
          </p>
        </div>
      </div>
    </footer>
  );
}
