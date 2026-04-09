"use client";

import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { Logo } from "./Logo";

const FOOTER_SECTIONS = [
  {
    title: "Learn More",
    links: [
      { label: "Home", href: "/" },
      { label: "Explore", href: "/models" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "About Us", href: "/about" },
    ],
  },
  {
    title: "Models",
    links: [
      { label: "Wan 2.7", href: "/collections/wan-2.7" },
      { label: "Qwen Image 2", href: "/collections/qwen-image-2" },
      { label: "Seedance 1.5 Pro", href: "/collections/seedance-1.5" },
      { label: "Kling O3", href: "/collections/kling-o3" },
      { label: "OpenAI", href: "/collections/openai" },
      { label: "Seedream", href: "/collections/seedream" },
      { label: "Flux Kontext", href: "/collections/flux-kontext" },
      { label: "Runwayml AI", href: "/collections/runwayml" },
      { label: "Wan 2.1 Video", href: "/collections/wan" },
      { label: "Ideogram Image", href: "/collections/ideogram" },
      { label: "Recraft Image", href: "/collections/recraft" },
      { label: "Pixverse AI", href: "/collections/pixverse" },
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
    <footer className="border-t border-white/10 bg-[#09070B] py-16 md:px-20 md:pt-20">
      <div className="mx-auto w-full max-w-7xl px-4 xl:px-0">
        <FadeIn>
          <div className="flex w-full flex-col items-start justify-between gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center">
            <Link href="/" className="flex items-center gap-2">
              <Logo />
            </Link>
            <Link
              href="https://status.wavespeed.ai/"
              className="flex h-7 items-center gap-2 rounded-[2px] border border-white/10 bg-black/20 px-2.5"
            >
              <span className="size-2 rounded-full bg-green-400" />
              <span className="font-mono text-[10px] uppercase tracking-[0.95px] text-white/40">
                All Service Online
              </span>
            </Link>
          </div>

          <div className="mb-10 mt-8 grid grid-cols-2 gap-x-8 gap-y-9 md:grid-cols-3">
            {FOOTER_SECTIONS.map((section) => (
              <div key={section.title} className="flex w-auto flex-col gap-3">
                <h4 className="font-mono text-[11px] uppercase tracking-[1.1px] text-white/45">
                  {section.title}
                </h4>
                <ul className="flex flex-col gap-1.5">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="font-mono text-[11px] leading-4 text-white/50 transition-colors hover:text-white"
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

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/20 pt-4 sm:flex-row sm:items-end">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-white/40">
            © {new Date().getFullYear()} OpenOctopus
          </p>
          <div className="flex items-center gap-4.5">
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-white/40">
              Light
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[1px] text-white/40">
              GitHub
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
