"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Slide {
  id: number;
  image: string;
  badge?: string;
  title: string;
  description: string;
  cta: {
    text: string;
    href: string;
  };
  docsHref: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    image: "https://static.wavespeed.ai/media/images/1773962750924385948_Ty3dmwFP.webp",
    title: "Ultimate AI Media Generation Platform",
    description:
      "The fastest way to run image, video, audio, and multimodal generation through one unified inference platform.",
    cta: { text: "Start Building", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 2,
    image: "https://static.wavespeed.ai/media/images/1773962750571484976_JuAKU3bj.webp",
    badge: "15% Off",
    title: "Nano Banana 2",
    description:
      "Fast, low-cost image generation with polished prompt following and production-ready quality.",
    cta: { text: "Try Model", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 3,
    image: "https://static.wavespeed.ai/media/images/1773962750558085840_71aX5fox.webp",
    badge: "15% Off",
    title: "Seedream 4.5",
    description:
      "Designed for typography and posters, with precise layouts and strong prompt control.",
    cta: { text: "Try Model", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 4,
    image: "https://static.wavespeed.ai/media/images/1773962750943067757_6xirBLU2.webp",
    title: "InfiniteTalk",
    description:
      "Create expressive talking characters with high fidelity lip sync and stable identity across scenes.",
    cta: { text: "Try Model", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 5,
    image: "https://static.wavespeed.ai/media/images/1773962750383987480_n3hqzHRZ.webp",
    title: "Kling V3 Motion Control",
    description:
      "Guide camera movement and subject motion with stronger control for cinematic video generation.",
    cta: { text: "Try Model", href: "/login" },
    docsHref: "/docs",
  },
];

const AUTO_PLAY_INTERVAL = 5000;

export function HeroSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(2);
  const [progress, setProgress] = useState(0);

  const goToSlide = useCallback((index: number) => {
    if (index === currentIndex) return;
    setProgress(0);
    setCurrentIndex(index);
  }, [currentIndex]);

  const nextSlide = useCallback(() => {
    const next = (currentIndex + 1) % SLIDES.length;
    goToSlide(next);
  }, [currentIndex, goToSlide]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          nextSlide();
          return 0;
        }
        return prev + (100 / (AUTO_PLAY_INTERVAL / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [nextSlide]);

  const currentSlide = SLIDES[currentIndex];

  return (
    <section className="relative h-[420px] w-full overflow-hidden border-b border-white/10 bg-black sm:h-[480px] md:h-[560px] lg:h-[640px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={currentSlide.image}
            alt={currentSlide.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.32) 38%, rgba(0,0,0,0.88) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/55 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative flex h-full flex-col justify-end px-6 pb-6 sm:pb-8 md:px-12 md:pb-10 lg:px-20 lg:pb-12">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex max-w-[610px] flex-col items-start gap-2 sm:gap-2.5 lg:pb-1"
            >
              {currentSlide.badge ? (
                <span className="rounded-[2px] bg-[#24be58] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[1.1px] text-white">
                  {currentSlide.badge}
                </span>
              ) : null}
              <h1 className="font-display text-[34px] leading-[0.92] font-bold tracking-[-0.05em] text-white sm:text-[44px] md:text-[58px] lg:text-[68px] xl:text-[72px]">
                {currentSlide.title}
              </h1>
              <p className="max-w-[350px] font-mono text-[12px] leading-5 text-white/60 md:max-w-[470px] md:text-[13px] md:leading-[1.55]">
                {currentSlide.description}
              </p>

              <div className="mt-1.5 flex flex-wrap gap-2">
                <Link
                  href={currentSlide.cta.href}
                  className="flex h-10 min-w-[122px] items-center justify-center gap-2 rounded-[2px] border border-transparent bg-white px-4 text-black transition-colors duration-150 hover:bg-white/90 sm:h-11 sm:min-w-[132px] sm:px-5"
                >
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                    {currentSlide.cta.text}
                  </span>
                </Link>
                <Link
                  href={currentSlide.docsHref}
                  className="flex h-10 min-w-[144px] items-center justify-center rounded-[2px] border border-white/20 bg-black/15 px-4 text-white transition-colors duration-150 hover:bg-white/10 sm:h-11 sm:min-w-[156px] sm:px-5"
                >
                  <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                    Documentation
                  </span>
                </Link>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Link
                  href="/login"
                  className="relative flex h-8 items-center gap-1.5 rounded-[2px] border border-white/20 bg-black/15 px-3 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
                >
                  <ImageIcon className="size-3" />
                  <span className="font-mono text-[10px] font-medium uppercase tracking-[1.1px]">
                    Image Generator
                  </span>
                  <span className="absolute -right-2 -top-2 text-[10px]">🔥</span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col items-start gap-2.5 lg:items-end lg:self-end lg:pb-1">
            <div className="flex gap-1.5 sm:hidden">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "size-1.5 rounded-full transition-all duration-300",
                    index === currentIndex ? "scale-125 bg-white" : "bg-white/30"
                  )}
                />
              ))}
            </div>
            <div className="hidden translate-y-[2px] gap-1.5 rounded-[2px] border border-white/10 bg-black/42 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm sm:flex">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "relative flex cursor-pointer overflow-hidden rounded-[2px] border border-white/10 transition-all duration-300",
                    index === currentIndex
                      ? "brightness-110"
                      : "opacity-40 hover:opacity-60"
                  )}
                >
                  <div className="relative h-9 w-14 sm:w-16 md:h-10 md:w-[72px]">
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  </div>
                  {index === currentIndex && (
                    <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-black/40">
                      <motion.div
                        className="h-full bg-white"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.1, ease: "linear" }}
                      />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
