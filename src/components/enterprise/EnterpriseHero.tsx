import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { EnterpriseLogoStrip } from "./EnterpriseLogoStrip";

export function EnterpriseHero() {
  return (
    <>
      <section className="relative h-[420px] w-full overflow-hidden sm:h-[480px] lg:h-[640px]">
        <Image
          alt=""
          src="https://static.wavespeed.ai/media/images/1773746947814275720_mbVhF1S8.webp"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(0, 0, 0, 0.8) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.1) 100%)",
          }}
        />

        <div className="relative flex h-full flex-col justify-end px-6 pb-6 sm:pb-8 md:px-12 md:pb-12 lg:px-20">
          <div className="mx-auto w-full max-w-7xl">
            <FadeIn className="flex max-w-2xl flex-col items-start gap-4">
              <h1 className="font-display text-3xl font-bold leading-none tracking-[-0.05em] text-balance text-white sm:text-4xl md:text-5xl lg:text-6xl">
                Ultimate AI Media
                <br />
                Generation Platform
                <br />
                for Enterprise
              </h1>
              <p className="max-w-lg text-sm leading-normal text-white/60 md:text-base">
                OpenOctopus accelerates AI Image and Video generation for you to
                build, create, and scale faster.
              </p>
              <Link
                href="#contact-us"
                className="mt-2 flex items-center gap-2.5 rounded-xs border border-transparent bg-white px-6 py-3 text-black transition-colors duration-150 hover:bg-white/90"
              >
                <span className="font-mono text-sm font-bold uppercase leading-4 tracking-[1.2px]">
                  Talk to us
                </span>
                <ArrowRight className="size-4" />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>
      <EnterpriseLogoStrip />
    </>
  );
}
