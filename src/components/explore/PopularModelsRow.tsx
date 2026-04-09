import { FadeIn } from "@/components/animations/FadeIn";
import { popularModels } from "@/lib/data";

export function PopularModelsRow() {
  return (
    <section className="border-t border-black/8 bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        <FadeIn>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-black/35">
            Most Popular
          </p>
          <h2 className="mb-8 font-display text-xl font-bold tracking-tight text-[#111111] md:text-2xl">
            Trending right now
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {popularModels.map((model, i) => (
            <FadeIn key={model.id} delay={i * 0.03}>
              <div className="group rounded-2xl border border-black/8 bg-white p-4 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:border-black/15 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                {/* Placeholder thumbnail */}
                <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg bg-[#f3f3f3]">
                  <div className="flex h-full items-center justify-center">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-black/20">
                      {model.task}
                    </span>
                  </div>
                </div>
                <h3 className="text-xs font-semibold leading-snug text-[#111111]">
                  {model.name}
                </h3>
                <p className="mt-0.5 font-mono text-[10px] text-black/35">
                  {model.provider}
                </p>
                <span className="mt-1.5 inline-block rounded-sm bg-black/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-black/40">
                  {model.task}
                </span>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
