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
        <h2 className="text-center font-display text-[30px] font-semibold leading-none tracking-[-0.03em] text-balance text-[#1C1917] md:text-left md:text-[46px]">
          Start creating at scale
        </h2>
        <Link
          href="/login"
          className="flex shrink-0 items-center gap-3 rounded-xl bg-[#1C1917] px-8 py-4 text-white shadow-lg shadow-black/15 transition-colors duration-150 hover:bg-[#1C1917]/85"
        >
          <span className="text-sm font-semibold leading-4 tracking-[-0.01em]">
            Get started
          </span>
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
