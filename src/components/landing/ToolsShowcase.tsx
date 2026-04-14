"use client";

import { useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

const IMG_BASE = "https://static.wavespeed.ai/media/images/";

interface Provider {
  title: string;
  slug: string;
  width: number;
  image1: string;
  image2: string;
  models: string[];
}

interface Category {
  name: string;
  count: number;
  image: string;
}

const providers: Provider[] = [
  { title: "Wan 2.7 Models", slug: "wan-2.7", width: 320, image1: "1773983575543521741_L9jIS1cl.webp", image2: "1773983572239790606_QAoyGPZ8.webp", models: ["wan-2.7/text-to-video", "wan-2.7/image-to-video", "wan-2.7/reference-to-video", "wan-2.7/video-edit"] },
  { title: "Qwen Image 2", slug: "qwen-image-2", width: 320, image1: "1773983575549817055_cayHQ3dm.webp", image2: "1773983572676811160_wYoyHR09.webp", models: ["qwen-image-2.0-pro/text-to-image", "qwen-image-2.0/edit", "qwen-image-2.0-pro/edit", "qwen-image-2.0/text-to-image"] },
  { title: "Grok Models", slug: "grok", width: 320, image1: "1773983575443653992_rdCMZ8hr.webp", image2: "1773983572668552081_TjMW5fnw.webp", models: ["grok-2-image", "grok-imagine-video/edit-video", "grok-imagine-video/image-to-video", "grok-imagine-video/text-to-video"] },
  { title: "Seedance 1.5 Pro", slug: "seedance-1.5", width: 320, image1: "1773983575227260340_BNIR3cmw.webp", image2: "1773983573458872774_C4U3dnwF.webp", models: ["seedance-v1.5-pro/image-to-video", "seedance-v1.5-pro/image-to-video-spicy", "seedance-v1.5-pro/image-to-video-fast", "seedance-v1.5-pro/text-to-video"] },
  { title: "Wan 2.6 Models", slug: "wan-2.6", width: 540, image1: "1773983574814764345_6CrAKT2c.webp", image2: "1773983573721516878_3DxIR09j.webp", models: ["wan-2.6/image-to-video", "wan-2.6/image-to-video-spicy", "wan-2.6/reference-to-video-flash", "wan-2.6/text-to-video"] },
  { title: "Kling O3 Models", slug: "kling-o3", width: 320, image1: "1773983573999594516_SZ8iW6fo.webp", image2: "1773983573916240555_fnwGPlvE.webp", models: ["kling-video-o3-pro/image-to-video", "kling-video-o3-pro/reference-to-video", "kling-video-o3-pro/text-to-video", "kling-video-o3-std/image-to-video"] },
  { title: "OpenAI Models", slug: "openai", width: 320, image1: "1773983574295099012_oXOjH4sI.webp", image2: "1773983573916754422_k12brzIS.webp", models: ["sora-2/characters", "sora-2/image-to-video", "gpt-image-1.5/edit", "sora-2-pro/image-to-video"] },
  { title: "Wan 2.5 Models", slug: "wan-2-5", width: 320, image1: "1773983574552762482_grzKoyHQ.webp", image2: "1773983573919499214_03FKbrzQ.webp", models: ["wan-2.5/image-to-video", "wan-2.5/image-edit", "wan-2.5/text-to-video", "wan-2.5/video-extend"] },
  { title: "Seedream Models", slug: "seedream", width: 320, image1: "1773983574002241118_gRuDNW5f.webp", image2: "1773983573912953125_ZHvENX6f.webp", models: ["seedream-v4.5/edit", "seedream-v5.0-lite", "seedream-v5.0-lite/sequential", "seedream-v5.0-lite/edit-sequential"] },
  { title: "Wan 2.2 Models", slug: "wan-2-2", width: 320, image1: "1773983574001725084_GLA8C5sW.webp", image2: "1773983574001725084_GLA8C5sW.webp", models: ["wan-2.2/animate", "wan-2.2-spicy/image-to-video", "wan-2.2/fun-control", "wan-2.2/image-lora-trainer"] },
  { title: "Dreamina AI", slug: "dreamina", width: 320, image1: "1773983573912953125_ZHvENX6f.webp", image2: "1773983574002241118_gRuDNW5f.webp", models: ["dreamina-v3.0-pro/image-to-video", "dreamina-v3.0-pro/text-to-video", "dreamina-v3.0-pro/edit", "dreamina-v3.0-pro/image-to-video-1080p"] },
  { title: "Seedance Models", slug: "bytedance", width: 320, image1: "1773983573919499214_03FKbrzQ.webp", image2: "1773983574552762482_grzKoyHQ.webp", models: ["seedance-v1.5-pro/image-to-video", "seedance-v1.5-pro/image-to-video-spicy", "seedance-v1.5-pro/image-to-video-fast", "seedance-v1.5-pro/text-to-video"] },
  { title: "Flux Image Tools", slug: "flux", width: 320, image1: "1773983573916754422_k12brzIS.webp", image2: "1773983574295099012_oXOjH4sI.webp", models: ["flux-2-max/edit", "flux-2-max/text-to-image", "flux-2-flash/edit", "flux-2-flash/text-to-image"] },
  { title: "Minimax Hailuo", slug: "minimax", width: 320, image1: "1773983573916240555_fnwGPlvE.webp", image2: "1773983573999594516_SZ8iW6fo.webp", models: ["hailuo-2.3/i2v-pro", "hailuo-2.3/fast", "speech-2.8-turbo", "hailuo-2.3/t2v-pro"] },
  { title: "Kling Models", slug: "kling", width: 320, image1: "1773983573721516878_3DxIR09j.webp", image2: "1773983574814764345_6CrAKT2c.webp", models: ["kling-v2.6-pro/motion-control", "kling-v3.0-pro/image-to-video", "kling-v3.0-pro/motion-control", "kling-v3.0-pro/text-to-video"] },
  { title: "Google Models", slug: "google", width: 540, image1: "1773983573458872774_C4U3dnwF.webp", image2: "1773983575227260340_BNIR3cmw.webp", models: ["lyria-3-pro/music", "lyria-3-clip/music", "veo3.1-lite/text-to-video", "veo3.1-lite/start-end-to-video"] },
  { title: "Flux Kontext", slug: "flux-kontext", width: 320, image1: "1773983572668552081_TjMW5fnw.webp", image2: "1773983575443653992_rdCMZ8hr.webp", models: ["flux-kontext-dev-ultra-fast", "flux-kontext-dev", "flux-kontext-pro", "flux-kontext-max"] },
  { title: "Runwayml AI", slug: "runwayml", width: 320, image1: "1773983572676811160_wYoyHR09.webp", image2: "1773983575549817055_cayHQ3dm.webp", models: ["gen4-aleph", "gen4-turbo", "gen4-image", "gen4-image-turbo"] },
];

const categoriesLarge: Category[] = [
  { name: "Object Detection and Segmentation", count: 9, image: "1772446561343987304_PU3dS2bl.webp" },
  { name: "Content Detection Models", count: 11, image: "1772446561374382835_PvrE7nKw.webp" },
  { name: "Motion Control Models", count: 8, image: "1772446561526849168_bXQYiK1q.webp" },
  { name: "Best Video Models", count: 28, image: "1772446561528170143_8n2bluCM.webp" },
  { name: "Best Image Models", count: 46, image: "1772446561709898347_JZ9hZ9ir.webp" },
  { name: "Swap Anything", count: 16, image: "1772446561707583752_guYC4uVq.webp" },
  { name: "Audio for Video", count: 8, image: "1772446561701443009_TXm5xVkK.webp" },
  { name: "Video Edit", count: 19, image: "1772446561707575034_SS2c4dnw.webp" },
  { name: "Ultra Selection", count: 33, image: "1772446561711701970_zuENjtCM.webp" },
  { name: "LoRA Generation", count: 41, image: "1772446561707377133_Xr09jtCM.webp" },
];

const categoriesSmall: Category[] = [
  { name: "Generate Music", count: 10, image: "1772446561710373283_7m9ksCLV.webp" },
  { name: "First and Last Frame Video", count: 28, image: "1772446561707377133_Xr09jtCM.webp" },
  { name: "Remove Anything", count: 28, image: "1772446561711701970_zuENjtCM.webp" },
  { name: "3D Creation", count: 18, image: "1772446561707575034_SS2c4dnw.webp" },
  { name: "Avatar Lipsync Models", count: 41, image: "1772446561701443009_TXm5xVkK.webp" },
  { name: "Training Tools", count: 10, image: "1772446561707583752_guYC4uVq.webp" },
  { name: "Enhance Videos", count: 10, image: "1772446561709898347_JZ9hZ9ir.webp" },
  { name: "Image Editing", count: 37, image: "1772446561528170143_8n2bluCM.webp" },
  { name: "Upscale Image", count: 15, image: "1772446561526849168_bXQYiK1q.webp" },
  { name: "Speech Generation", count: 39, image: "1772446561374382835_PvrE7nKw.webp" },
];

function ProviderCard({ provider, imageKey }: { provider: Provider; imageKey: "image1" | "image2" }) {
  const w = provider.width === 540 ? "w-[540px]" : "w-[320px]";
  return (
    <Link
      href={`/collections/${provider.slug}`}
      className={`${w} h-[240px] md:h-[320px] flex-shrink-0 rounded-xl relative overflow-hidden group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-black/20`}
    >
      <Image
        src={`${IMG_BASE}${provider[imageKey]}`}
        alt={provider.title}
        fill
        className="object-cover transition-transform duration-500 group-hover:scale-110"
        sizes="(max-width: 768px) 320px, 540px"
        unoptimized
      />
      <div className="absolute inset-x-0 bottom-0 h-[160px] bg-gradient-to-t from-black/80 to-transparent" />
      <div className="absolute inset-0 p-5 flex flex-col justify-between">
        <h3 className="font-display text-lg font-semibold text-white">{provider.title}</h3>
        <div className="space-y-0.5">
          {provider.models.map((m) => (
            <p key={m} className="font-mono text-sm text-white/80 truncate">{m}</p>
          ))}
        </div>
      </div>
    </Link>
  );
}

function CategoryCard({ category, size }: { category: Category; size: "large" | "small" }) {
  const sizeClasses = size === "large" ? "w-[260px] md:w-[400px]" : "w-50 md:w-80";
  return (
    <div className={`${sizeClasses} h-[80px] md:h-[131px] flex-shrink-0 rounded-xl relative overflow-hidden cursor-pointer shadow-sm`}>
      <Image
        src={`${IMG_BASE}${category.image}`}
        alt={category.name}
        fill
        className="object-cover object-top"
        sizes="400px"
        unoptimized
      />
      <div className="absolute inset-0 bg-[#FAFAF8]/85 p-3 md:p-4 flex flex-col justify-center">
        <h3 className="font-display font-medium text-[#1C1917] text-sm md:text-base leading-tight">{category.name}</h3>
        <p className="font-mono text-sm text-[#1C1917]/55">{category.count} models</p>
      </div>
    </div>
  );
}

function useDrag() {
  const ref = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    isDragging.current = true;
    startX.current = e.pageX - el.offsetLeft;
    scrollLeft.current = el.scrollLeft;
    el.style.cursor = "grabbing";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !ref.current) return;
    e.preventDefault();
    const x = e.pageX - ref.current.offsetLeft;
    ref.current.scrollLeft = scrollLeft.current - (x - startX.current);
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (ref.current) ref.current.style.cursor = "grab";
  }, []);

  return { ref, onMouseDown, onMouseMove, onMouseUp, onMouseLeave: onMouseUp };
}

export function ToolsShowcase() {
  const dragRow3 = useDrag();
  const dragRow4 = useDrag();

  return (
    <section className="bg-[#F2F0EB] py-16 md:py-24 overflow-hidden">
      <div className="text-center mb-12 px-4">
        <h2 className="font-display text-3xl md:text-5xl font-semibold text-[#1C1917] mb-4">
          The complete creative stack
        </h2>
        <p className="text-[#1C1917]/55 text-sm md:text-base max-w-2xl mx-auto">
          Hundreds of AI models from the best providers — curated, optimized, and ready to run.
        </p>
      </div>

      {/* Row 1 — Marquee left→right */}
      <div className="group mb-4">
        <div className="flex gap-4 animate-[marquee_60s_linear_infinite] group-hover:[animation-play-state:paused]">
          {[...providers, ...providers].map((p, i) => (
            <ProviderCard key={`r1-${i}`} provider={p} imageKey="image1" />
          ))}
        </div>
      </div>

      {/* Row 2 — Marquee right→left */}
      <div className="group mb-8">
        <div className="flex gap-4 animate-[marquee-reverse_60s_linear_infinite] group-hover:[animation-play-state:paused]">
          {[...providers, ...providers].map((p, i) => (
            <ProviderCard key={`r2-${i}`} provider={p} imageKey="image2" />
          ))}
        </div>
      </div>

      {/* Row 3 — Draggable large category cards */}
      <div
        ref={dragRow3.ref}
        onMouseDown={dragRow3.onMouseDown}
        onMouseMove={dragRow3.onMouseMove}
        onMouseUp={dragRow3.onMouseUp}
        onMouseLeave={dragRow3.onMouseLeave}
        className="flex gap-4 px-4 mb-4 overflow-x-auto cursor-grab scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categoriesLarge.map((c) => (
          <CategoryCard key={c.name} category={c} size="large" />
        ))}
      </div>

      {/* Row 4 — Draggable small category cards */}
      <div
        ref={dragRow4.ref}
        onMouseDown={dragRow4.onMouseDown}
        onMouseMove={dragRow4.onMouseMove}
        onMouseUp={dragRow4.onMouseUp}
        onMouseLeave={dragRow4.onMouseLeave}
        className="flex gap-4 px-4 overflow-x-auto cursor-grab scrollbar-hide"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categoriesSmall.map((c) => (
          <CategoryCard key={c.name} category={c} size="small" />
        ))}
      </div>
    </section>
  );
}
