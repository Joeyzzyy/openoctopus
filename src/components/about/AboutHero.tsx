import { FadeIn } from "@/components/animations/FadeIn";

export function AboutHero() {
  return (
    <section className="relative overflow-hidden bg-black">
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-black/80" />
      <div className="relative mx-auto max-w-5xl px-6 pb-24 pt-40 text-center">
        <FadeIn>
          <p className="mb-4 font-mono text-sm uppercase tracking-[0.28em] text-white/40">
            About OpenOctopus
          </p>
          <h1 className="mb-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-6xl">
            We make AI generation
            <br />
            <span className="text-[#22c55e]">blazing fast</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-white/60 md:text-xl">
            With 1,000+ top-tier models, OpenOctopus is the most powerful
            platform for AI image and video generation — built to help you
            create faster and scale without limits.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}
