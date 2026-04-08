"use client";

import { FadeIn } from "@/components/animations/FadeIn";
import { testimonials } from "@/lib/data";

export function UserVoices() {
  return (
    <section className="bg-[#f3f3f3] px-6 pb-16 md:px-12 md:pb-20 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-8 flex flex-col gap-4 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-black/35">
            User Voices
          </p>
          <h2 className="font-display text-3xl font-bold leading-none tracking-tight text-[#111111] md:text-5xl">
            Trusted By Teams Shipping AI Products
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-6 text-black/55">
            Feedback from operators, product teams, and creators using Open Octopus
            to move multimodal workloads into production.
          </p>
        </FadeIn>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {testimonials.map((item, index) => (
            <FadeIn key={item.name} delay={index * 0.05} className="h-full">
              <article className="flex h-full flex-col justify-between rounded-[16px] border border-black/8 bg-white p-6 shadow-[0_18px_50px_rgba(0,0,0,0.06)] transition-colors duration-200 hover:border-black/15">
                <p className="text-sm leading-7 text-black/72">
                  &ldquo;{item.quote}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-[#111111] text-sm font-semibold text-white">
                    {item.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#111111]">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-black/45">
                      {item.title}
                    </p>
                  </div>
                </div>
              </article>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
