import { FadeIn } from "@/components/animations/FadeIn";
import { modelStats } from "@/lib/data";

export function ModelStats() {
  return (
    <section className="border-t border-black/8 bg-[#fafafa] py-16">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <FadeIn>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-black/35">
            Model Statistics
          </p>
          <h2 className="mb-8 font-display text-xl font-bold tracking-tight text-[#111111] md:text-2xl">
            Models by task type
          </h2>
        </FadeIn>

        <div className="flex flex-wrap gap-3">
          {modelStats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.015}>
              <div className="flex items-center gap-2 rounded-lg border border-black/8 bg-white px-3 py-2 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <span className="font-mono text-[10px] text-black/50">
                  {stat.label}
                </span>
                <span className="font-mono text-xs font-semibold text-[#24be58]">
                  {stat.count}
                </span>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
