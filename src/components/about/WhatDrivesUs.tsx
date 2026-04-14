import { FadeIn } from "@/components/animations/FadeIn";
import { aboutValues } from "@/lib/data";

export function WhatDrivesUs() {
  return (
    <section className="border-y border-black/10 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <FadeIn>
          <h2 className="mb-12 text-center text-2xl font-bold text-[#1C1917] md:text-3xl">
            What drives us
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {aboutValues.map((value, i) => (
            <FadeIn key={value.title} delay={i * 0.1}>
              <div>
                <h3 className="mb-2 font-semibold text-[#1C1917]">
                  {value.title}
                </h3>
                <p className="text-sm leading-relaxed text-black/55">
                  {value.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
