import { FadeIn } from "@/components/animations/FadeIn";
import { aboutMetrics } from "@/lib/data";

export function MetricsRow() {
  return (
    <section className="border-y border-black/10 py-16">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 text-center md:grid-cols-4">
        {aboutMetrics.map((metric, i) => (
          <FadeIn key={metric.label} delay={i * 0.1}>
            <div>
              <p className="text-3xl font-bold text-[#111111] md:text-4xl">
                {metric.value}
              </p>
              <p className="mt-1 font-mono text-sm uppercase tracking-[0.18em] text-black/45">
                {metric.label}
              </p>
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
