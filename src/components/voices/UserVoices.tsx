"use client";

import { testimonials } from "@/lib/data";
import { FadeIn } from "@/components/animations/FadeIn";

export function UserVoices() {
  return (
    <section className="bg-[#f3f3f3] py-16 md:py-20">
      {/* Heading */}
      <div className="mb-8 px-6 md:mb-12 md:px-20">
        <h2 className="mx-auto max-w-[1280px] font-display text-[32px] font-bold leading-none tracking-[-1px] text-balance text-[#111111] md:text-[48px]">
          What people are saying
        </h2>
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex cursor-grab gap-6 overflow-x-auto pt-2 pb-8 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          paddingInline:
            "max(24px, calc((100vw - 1280px) / 2))",
        }}
      >
        {testimonials.map((item) => (
          <div
            key={item.name}
            className="group relative flex w-[300px] shrink-0 flex-col justify-between gap-4 overflow-hidden rounded-xs bg-white p-6 transition-shadow duration-300 hover:shadow-[0px_12px_24px_0px_rgba(0,0,0,0.08)] md:w-[480px] md:p-10"
          >
            {/* Content */}
            <div className="relative flex flex-col gap-4">
              {/* Company name as logo placeholder */}
              <div className="flex h-9 items-center">
                <span className="font-display text-base font-bold tracking-tight text-[#111111]">
                  {item.company}
                </span>
              </div>

              {/* Quote */}
              <p className="text-sm leading-7 text-black/55 md:text-[15px]">
                &ldquo;{item.quote}&rdquo;
              </p>
            </div>

            {/* Author */}
            <div className="relative flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#111111] text-xs font-semibold text-white">
                {item.avatar}
              </div>
              <div>
                <p className="text-sm font-medium text-[#111111]">
                  {item.name}
                </p>
                <p className="text-xs text-black/40">{item.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
