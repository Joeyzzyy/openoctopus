"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ProviderCard, Provider } from "./ProviderCard";
import { FadeIn } from "@/components/animations/FadeIn";

const FEATURED_IMAGES = [
  "https://static.wavespeed.ai/media/images/1773982486991777301_pAKnxHQ0.webp",
  "https://static.wavespeed.ai/media/images/1773982485921091987_9RfY7gqA.webp",
  "https://static.wavespeed.ai/media/images/1773982487527428587_7V5eoxHR.webp",
  "https://static.wavespeed.ai/media/images/1773982485462820141_SWBsOay0.webp",
  "https://static.wavespeed.ai/media/images/1773982488096109393_g2UoRiPf.webp",
  "https://static.wavespeed.ai/media/images/1773982488033922443_4GhqzJT3.webp",
  "https://static.wavespeed.ai/media/images/1773982488103867536_m9YmHYnM.webp",
  "https://static.wavespeed.ai/media/images/1773982488677021111_Z5wmwFPZ.webp",
  "https://static.wavespeed.ai/media/images/1773982486529320898_2EA1uWkK.webp",
  "https://static.wavespeed.ai/media/images/1773982487109684599_qpWYmG5z.webp",
  "https://static.wavespeed.ai/media/images/1773982486219725120_geW0oOkK.webp",
  "https://static.wavespeed.ai/media/images/1773982487225168510_bW7gpyIR.webp",
  "https://static.wavespeed.ai/media/images/1773982488807980452_SkV5eoxG.webp",
  "https://static.wavespeed.ai/media/images/1773982486480192004_ShKT2clu.webp",
  "https://static.wavespeed.ai/media/images/1773982487369289135_VsisBLU3.webp",
  "https://static.wavespeed.ai/media/images/1773982488389173191_Oq1bluEO.webp",
  "https://static.wavespeed.ai/media/images/1773982485839899969_Xn1blvFP.webp",
  "https://static.wavespeed.ai/media/images/1773982485686510099_qTuEOX6e.webp",
  "https://static.wavespeed.ai/media/images/1773982485742876269_w2fpyIS1.webp",
  "https://static.wavespeed.ai/media/images/1773982485879640021_aRPY8hqz.webp",
  "https://static.wavespeed.ai/media/images/1773982488243677073_vjIRuEOX.webp",
  "https://static.wavespeed.ai/media/images/1773982488676921146_ZzrAKT2b.webp",
  "https://static.wavespeed.ai/media/images/1773982488751485730_npzXI3dn.webp",
  "https://static.wavespeed.ai/media/images/1773982488525553248_TwoyGQ09.webp",
  "https://static.wavespeed.ai/media/images/1773982486833266645_bI82pJ8z.webp",
  "https://static.wavespeed.ai/media/images/1773982486509051721_ZD9jsCKU.webp",
  "https://static.wavespeed.ai/media/images/1773982486882648964_w1O3iwM0.webp",
  "https://static.wavespeed.ai/media/images/1773982488396898892_b5vELW5h.webp",
  "https://static.wavespeed.ai/media/images/1773982489037596683_QmZ7irAK.webp",
  "https://static.wavespeed.ai/media/images/1773982486341819820_t6IS2clu.webp",
  "https://static.wavespeed.ai/media/images/1773982488941937311_1wajtCMV.webp",
  "https://static.wavespeed.ai/media/images/1773982488986532231_fBNjtCLU.webp",
  "https://static.wavespeed.ai/media/images/1773983575543521741_L9jIS1cl.webp",
  "https://static.wavespeed.ai/media/images/1773983575549817055_cayHQ3dm.webp",
  "https://static.wavespeed.ai/media/images/1773983575443653992_rdCMZ8hr.webp",
  "https://static.wavespeed.ai/media/images/1773983575227260340_BNIR3cmw.webp",
];

const PROVIDER_NAMES = [
  "Wan 2.1",
  "Kling 2.1",
  "Nano Banana 2",
  "Seedream 4.0",
  "Flux Kontext",
  "InfiniteTalk",
  "Runway",
  "Hailuo",
  "PixVerse",
  "Midjourney",
  "OpenAI",
  "Recraft",
  "Ideogram",
  "Gemini",
  "Pika",
  "Luma",
  "MiniMax",
  "Qwen",
  "Veo",
  "Fal",
  "Replicate",
  "Together",
  "Mistral",
  "Anthropic",
  "Fireworks",
  "SambaNova",
  "Cohere",
  "Groq",
  "Cerebras",
  "AI21",
  "Haiper",
  "Morph",
  "Gen-3",
  "CogView",
  "DALL-E",
  "Sora",
];

const PROVIDERS: Provider[] = FEATURED_IMAGES.map((icon, index) => ({
  id: String(index + 1),
  name: PROVIDER_NAMES[index] ?? `Model ${index + 1}`,
  icon,
  status: "online",
}));

const LEFT_PROVIDERS = PROVIDERS.slice(0, 18);
const RIGHT_PROVIDERS = PROVIDERS.slice(18, 36);

export function FeaturedModels() {
  return (
    <section className="relative overflow-hidden border-b border-black/8 bg-white py-16 md:py-20">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/[0.03] to-transparent" />
      <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-8 px-4 sm:px-6">
        <FadeIn className="flex max-w-[876px] flex-col items-center gap-3 text-center">
          <h2 className="font-display text-3xl font-bold leading-none tracking-tight text-[#111111] sm:text-4xl md:text-[46px]">
            Featured Models
          </h2>
        </FadeIn>

        <div className="relative mt-8 w-full xl:min-h-[720px]">
          <div className="pointer-events-none absolute left-0 top-0 hidden flex-col items-start gap-3 xl:flex">
            {Array.from({ length: 9 }).map((_, rowIndex) => (
              <div
                key={`left-row-${rowIndex}`}
                className="flex gap-3"
                style={{ marginLeft: rowIndex % 2 === 0 ? "0px" : "46px" }}
              >
                {LEFT_PROVIDERS.slice(rowIndex * 2, rowIndex * 2 + 2).map((provider, i) => (
                  <div
                    key={provider.id}
                    className="relative overflow-hidden transition-all duration-300"
                    style={{
                      height: "80px",
                      width: "80px",
                      opacity: 0.58,
                      animationDelay: `${(rowIndex * 2 + i) * 50}ms`,
                    }}
                  >
                    <ProviderCard provider={provider} size="md" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="pointer-events-none absolute right-0 top-0 hidden flex-col items-end gap-3 xl:flex">
            {Array.from({ length: 9 }).map((_, rowIndex) => (
              <div
                key={`right-row-${rowIndex}`}
                className="flex gap-3"
                style={{ marginRight: rowIndex % 2 === 0 ? "0px" : "46px" }}
              >
                {RIGHT_PROVIDERS.slice(rowIndex * 2, rowIndex * 2 + 2).map((provider, i) => (
                  <div
                    key={provider.id}
                    className="relative overflow-hidden transition-all duration-300"
                    style={{
                      height: "80px",
                      width: "80px",
                      opacity: 0.58,
                      animationDelay: `${(rowIndex * 2 + i) * 50}ms`,
                    }}
                  >
                    <ProviderCard provider={provider} size="md" />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <FadeIn
            delay={0.2}
            className="mx-auto flex max-w-[500px] flex-col items-center gap-5 rounded-[4px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,17,17,0.96),rgba(0,0,0,0.9))] px-6 py-8 text-center shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-[2px] xl:absolute xl:left-1/2 xl:top-1/2 xl:w-[470px] xl:-translate-x-1/2 xl:-translate-y-1/2 xl:px-10 xl:py-10"
          >
            <h3 className="font-display text-[29px] font-bold leading-[0.94] tracking-[-0.035em] text-white sm:text-[34px]">
              One Platform, <br className="sm:hidden" />
              <span className="text-white/80">Infinite Possibilities</span>
            </h3>

            <p className="max-w-[390px] font-mono text-[12px] leading-5 text-white/52 sm:text-[13px] sm:leading-6">
              Access flagship image, video, speech, and multimodal models
              through one unified platform.
            </p>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <Link
                href="/models"
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-[2px] bg-white px-4 text-black shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-colors duration-150 hover:bg-white/90 sm:h-11 sm:px-5"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                  Explore
                </span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/docs"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[2px] border border-white/20 bg-white/[0.02] px-4 text-white transition-colors duration-150 hover:bg-white/10 sm:h-11 sm:px-5"
              >
                <span className="font-mono text-[11px] font-bold uppercase tracking-[1.25px] sm:text-xs">
                  Documentation
                </span>
              </Link>
            </div>
          </FadeIn>
        </div>

        <FadeIn
          delay={0.3}
          className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-9 xl:hidden"
        >
          {LEFT_PROVIDERS.slice(0, 9).map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              size="sm"
              className="h-auto w-auto p-2"
            />
          ))}
        </FadeIn>
      </div>
    </section>
  );
}
