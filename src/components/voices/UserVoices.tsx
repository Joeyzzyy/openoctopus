"use client";

import { testimonials } from "@/lib/data";
import { FadeIn } from "@/components/animations/FadeIn";

export function UserVoices() {
  return (
    <section className="bg-[#F2F0EB] py-16 md:py-20">
      {/* Heading */}
      <div className="mb-8 px-6 md:mb-12 md:px-20">
        <h2 className="mx-auto max-w-[1280px] font-display text-[32px] font-semibold leading-none tracking-[-0.03em] text-balance text-[#1C1917] md:text-[48px]">
          What people are saying
        </h2>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex cursor-grab gap-5 overflow-x-auto pt-2 pb-8 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingInline:
            "max(24px, calc((100vw - 1280px) / 2))",
        }}
      >
        {testimonials.map((item) => (
          <div
            key={item.name}
            className="group relative flex w-[300px] shrink-0 flex-col justify-between gap-4 overflow-hidden rounded-2xl bg-[#FAFAF8] p-6 transition-shadow duration-300 hover:shadow-[0px_16px_32px_0px_rgba(0,0,0,0.06)] md:w-[480px] md:p-10"
          >
            {/* Content */}
            <div className="relative flex flex-col gap-4">
              {/* Company name as logo placeholder */}
              <div className="flex h-9 items-center">
                <span className="font-display text-base font-semibold tracking-tight text-[#1C1917]">
                  {item.company}
                </span>
              </div>

              {/* Quote */}
              <p className="text-sm leading-7 text-[#1C1917]/55 md:text-[15px]">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            {/* Author */}
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1C1917] text-xs font-semibold text-white">
                {item.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1C1917]">
                  {item.name}
                </p>
                <p className="text-xs text-[#1C1917]/40">{item.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
