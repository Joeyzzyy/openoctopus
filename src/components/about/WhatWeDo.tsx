import { FadeIn } from "@/components/animations/FadeIn";
import { whatWeDo } from "@/lib/data";
export function WhatWeDo() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
        <FadeIn>
          <h2 className="mb-4 text-2xl font-bold text-[#111111] md:text-3xl">
            What we do
          </h2>
          <p className="mb-12 max-w-3xl text-lg leading-relaxed text-black/55">
            We operate a high-performance inference engine optimized for
            generative AI. Our platform provides instant access to the best
            open-source and proprietary models through a single unified API —
            from text-to-image and video generation to speech synthesis and
            large language models.
          </p>
        </FadeIn>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {whatWeDo.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 0.1}>
              <div className="rounded-xl border border-black/10 bg-white p-6">
                <h3 className="mb-2 text-lg font-semibold text-[#111111]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-black/55">
                  {feature.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
    </section>
  );
}
