import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

const COLLECTION_NAMES: Record<string, string> = {
  "wan-2.7": "Wan 2.7 Models",
  "qwen-image-2": "Qwen Image 2",
  grok: "Grok Models",
  "seedance-1.5": "Seedance 1.5 Pro",
  "wan-2.6": "Wan 2.6 Models",
  "kling-o3": "Kling O3 Models",
  openai: "OpenAI Models",
  "wan-2-5": "Wan 2.5 Models",
  seedream: "Seedream Models",
  "wan-2-2": "Wan 2.2 Models",
  dreamina: "Dreamina AI",
  bytedance: "Seedance Models",
  flux: "Flux Image Tools",
  minimax: "Minimax Hailuo",
  kling: "Kling Models",
  google: "Google Models",
  "flux-kontext": "Flux Kontext",
  runwayml: "Runwayml AI",
  wan: "Wan 2.1 Video",
  ideogram: "Ideogram Image",
  recraft: "Recraft Image",
  pixverse: "Pixverse AI",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = COLLECTION_NAMES[slug] ?? slug;
  return { title: `${name} — Coming Soon | OpenOctopus` };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const name = COLLECTION_NAMES[slug] ?? slug;

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 pt-[60px]">
      <div className="mx-auto max-w-lg text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f5f4ef] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[1.1px] text-black/50">
          Collection
        </div>

        <h1 className="mt-6 font-display text-[36px] font-bold leading-[1] tracking-[-0.04em] text-[#111111] md:text-[52px]">
          {name}
        </h1>

        <p className="mt-4 text-[15px] leading-7 text-black/55">
          This model collection is coming soon. We&apos;re preparing detailed
          documentation, playground access, and pricing for every model in this
          family.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/models"
            className="inline-flex h-10 items-center gap-2 rounded-[4px] bg-[#111111] px-5 font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-white transition-colors hover:bg-[#333]"
          >
            <ArrowLeft className="h-4 w-4" />
            Explore Models
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-10 items-center gap-2 rounded-[4px] border border-black/10 bg-white px-5 font-mono text-[11px] font-bold uppercase tracking-[1.1px] text-[#111111] transition-colors hover:bg-black/[0.03]"
          >
            View Pricing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
