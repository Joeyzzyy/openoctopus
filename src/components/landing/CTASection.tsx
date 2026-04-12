import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative h-[240px] overflow-hidden md:h-[280px]">
      {/* Video background */}
      <div className="absolute inset-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="https://static.wavespeed.ai/media/images/1772527118034677265_3w5enxGQ.webp"
          className="size-full scale-105 object-cover blur-sm"
        >
          <source
            src="https://static.wavespeed.ai/media/videos/1772527117983538034_isCL.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Content overlay */}
      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col items-center justify-center gap-6 px-6 py-12 md:flex-row md:justify-between md:px-20 md:py-0">
        <h2 className="text-center font-display text-[32px] font-bold leading-none tracking-[-1px] text-balance text-black md:text-left md:text-[48px]">
          Unlock Your AI Potential Today
        </h2>
        <Link
          href="/login"
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center gap-3 rounded-xs bg-black px-8 py-4 text-white transition-colors duration-150 hover:bg-black/80"
        >
          <span className="font-mono text-sm font-medium leading-4 tracking-[1.2px]">
            Start Building
          </span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
