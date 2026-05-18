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
    title: "Generate anything. Ship everything.",
    description:
      "One platform for image, video, audio, and multimodal creation — built for teams who move fast.",
    cta: { text: "Start creating", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 2,
    image: "https://static.wavespeed.ai/media/images/1773962750571484976_JuAKU3bj.webp",
    badge: "15% Off",
    title: "Nano Banana 2",
    description:
      "Fast, low-cost image generation with polished prompt following and production-ready quality.",
    cta: { text: "Try model", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 3,
    image: "https://static.wavespeed.ai/media/images/1773962750558085840_71aX5fox.webp",
    badge: "15% Off",
    title: "Seedream 4.5",
    description:
      "Designed for typography and posters, with precise layouts and strong prompt control.",
    cta: { text: "Try model", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 4,
    image: "https://static.wavespeed.ai/media/images/1773962750943067757_6xirBLU2.webp",
    title: "InfiniteTalk",
    description:
      "Create expressive talking characters with high fidelity lip sync and stable identity across scenes.",
    cta: { text: "Try model", href: "/login" },
    docsHref: "/docs",
  },
  {
    id: 5,
    image: "https://static.wavespeed.ai/media/images/1773962750383987480_n3hqzHRZ.webp",
    title: "Kling V3 Motion Control",
    description:
      "Guide camera movement and subject motion with stronger control for cinematic video generation.",
    cta: { text: "Try model", href: "/login" },
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
    <section className="relative h-[420px] w-full overflow-hidden bg-[#06131F] sm:h-[480px] md:h-[560px] lg:h-[640px]">
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
                "linear-gradient(180deg, rgba(12,10,9,0.22) 0%, rgba(12,10,9,0.38) 38%, rgba(12,10,9,0.92) 100%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#06131F] via-[#06131F]/60 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative flex h-full flex-col justify-end px-6 pb-8 sm:pb-10 md:px-12 md:pb-12 lg:px-20 lg:pb-14">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start gap-5 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex max-w-[640px] flex-col items-start gap-3 lg:pb-1"
            >
              {currentSlide.badge ? (
                <span className="rounded-md bg-[#38BDF8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-white">
                  {currentSlide.badge}
                </span>
              ) : null}
              <h1 className="font-display text-[32px] leading-[1] font-semibold tracking-[-0.03em] text-white sm:text-[42px] md:text-[56px] lg:text-[64px]">
                {currentSlide.title}
              </h1>
              <p className="max-w-[380px] text-[14px] leading-6 text-white/55 md:max-w-[460px] md:text-[15px] md:leading-7">
                {currentSlide.description}
              </p>

              <div className="mt-2 flex flex-wrap gap-3">
                <Link
                  href={currentSlide.cta.href}
                  className="flex h-11 min-w-[130px] items-center justify-center gap-2 rounded-lg border border-transparent bg-white px-5 text-[#1C1917] transition-colors duration-150 hover:bg-white/90 sm:h-12 sm:min-w-[140px]"
                >
                  <span className="text-[13px] font-semibold">
                    {currentSlide.cta.text}
                  </span>
                </Link>
                <Link
                  href={currentSlide.docsHref}
                  className="flex h-11 min-w-[150px] items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 text-white backdrop-blur-sm transition-colors duration-150 hover:bg-white/15 sm:h-12 sm:min-w-[160px]"
                >
                  <span className="text-[13px] font-medium">
                    Documentation
                  </span>
                </Link>
              </div>

              <div className="mt-1 flex flex-wrap gap-2">
                <Link
                  href="/login"
                  className="relative flex h-9 items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3.5 text-white/70 backdrop-blur-sm transition-colors duration-150 hover:bg-white/15 hover:text-white"
                >
                  <ImageIcon className="size-4" />
                  <span className="text-[11px] font-medium uppercase tracking-[0.8px]">
                    Image Generator
                  </span>
                  <span className="absolute -right-2 -top-2 text-[10px]">🔥</span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex flex-col items-start gap-3 lg:items-end lg:self-end lg:pb-1">
            <div className="flex gap-2 sm:hidden">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "size-2 rounded-full transition-all duration-300",
                    index === currentIndex ? "scale-125 bg-white" : "bg-white/30"
                  )}
                />
              ))}
            </div>
            <div className="hidden translate-y-[2px] gap-2 rounded-xl border border-white/10 bg-black/40 p-2 shadow-lg shadow-black/20 backdrop-blur-md sm:flex">
              {SLIDES.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={cn(
                    "relative flex cursor-pointer overflow-hidden rounded-lg border border-white/10 transition-all duration-300",
                    index === currentIndex
                      ? "brightness-110"
                      : "opacity-40 hover:opacity-65"
                  )}
                >
                  <div className="relative h-10 w-16 sm:w-18 md:h-11 md:w-20">
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
