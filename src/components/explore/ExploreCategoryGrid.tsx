import { FadeIn } from "@/components/animations/FadeIn";
import { exploreCategories, exploreCollections } from "@/lib/data";
import { ArrowUpRight } from "lucide-react";

function CategoryTile({
  name,
  count,
  delay,
}: {
  name: string;
  count: number;
  delay: number;
}) {
  return (
    <FadeIn delay={delay}>
      <div className="group flex items-center justify-between rounded-2xl border border-black/8 bg-white px-4 py-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-black/15 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
        <div>
          <h3 className="text-xs font-semibold text-[#111111] transition-colors group-hover:text-[#24be58]">
            {name}
          </h3>
          <p className="mt-0.5 font-mono text-[10px] text-black/35">
            {count} models
          </p>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-black/20 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-black/50" />
      </div>
    </FadeIn>
  );
}

export function ExploreCategoryGrid() {
  return (
    <section className="border-t border-black/8 bg-[#fafafa] py-16">
      <div className="mx-auto max-w-7xl px-4 xl:px-0">
        {/* Tool categories */}
        <FadeIn>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-black/35">
            Categories
          </p>
          <h2 className="mb-8 font-display text-xl font-bold tracking-tight text-[#111111] md:text-2xl">
            Browse by category
          </h2>
        </FadeIn>

        <div className="mb-16 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {exploreCategories.map((cat, i) => (
            <CategoryTile
              key={cat.name}
              name={cat.name}
              count={cat.count}
              delay={i * 0.02}
            />
          ))}
        </div>

        {/* Model collections */}
        <FadeIn>
          <p className="mb-3 text-xs uppercase tracking-[0.28em] text-black/35">
            Collections
          </p>
          <h2 className="mb-8 font-display text-xl font-bold tracking-tight text-[#111111] md:text-2xl">
            Browse by provider
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {exploreCollections.map((col, i) => (
            <CategoryTile
              key={col.name}
              name={col.name}
              count={col.count}
              delay={i * 0.02}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
