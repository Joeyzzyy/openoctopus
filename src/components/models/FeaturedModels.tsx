"use client";

import Link from "next/link";
import Image from "next/image";

const IMG = "https://static.wavespeed.ai/media/images/";

const LEFT_IMAGES = [
  "1773982486991777301_pAKnxHQ0.webp",
  "1773982485921091987_9RfY7gqA.webp",
  "1773982487527428587_7V5eoxHR.webp",
  "1773982485462820141_SWBsOay0.webp",
  "1773982488096109393_g2UoRiPf.webp",
  "1773982488033922443_4GhqzJT3.webp",
  "1773982488103867536_m9YmHYnM.webp",
  "1773982488677021111_Z5wmwFPZ.webp",
  "1773982486529320898_2EA1uWkK.webp",
  "1773982487109684599_qpWYmG5z.webp",
  "1773982486219725120_geW0oOkK.webp",
  "1773982487225168510_bW7gpyIR.webp",
  "1773982488807980452_SkV5eoxG.webp",
  "1773982486480192004_ShKT2clu.webp",
  "1773982487369289135_VsisBLU3.webp",
  "1773982488389173191_Oq1bluEO.webp",
];

const RIGHT_IMAGES = [
  "1773982485839899969_Xn1blvFP.webp",
  "1773982485686510099_qTuEOX6e.webp",
  "1773982485742876269_w2fpyIS1.webp",
  "1773982485879640021_aRPY8hqz.webp",
  "1773982488243677073_vjIRuEOX.webp",
  "1773982488676921146_ZzrAKT2b.webp",
  "1773982488751485730_npzXI3dn.webp",
  "1773982488525553248_TwoyGQ09.webp",
  "1773982486833266645_bI82pJ8z.webp",
  "1773982486509051721_ZD9jsCKU.webp",
  "1773982486882648964_w1O3iwM0.webp",
  "1773982488396898892_b5vELW5h.webp",
  "1773982489037596683_QmZ7irAK.webp",
  "1773982486341819820_t6IS2clu.webp",
  "1773982488941937311_1wajtCMV.webp",
  "1773982488986532231_fBNjtCLU.webp",
];

interface ModelRow {
  path: string;
  href: string;
  provider: string;
  type: string;
  price: string;
  discount?: { percent: number; original: string };
  image: string;
}

const MODELS: ModelRow[] = [
  { path: "wan-2.7/text-to-video", href: "/models", provider: "alibaba", type: "text-to-video", price: "$0.5", image: "1773982486991777301_pAKnxHQ0.webp" },
  { path: "wan-2.7/image-to-video", href: "/models", provider: "alibaba", type: "image-to-video", price: "$0.5", image: "1773982485921091987_9RfY7gqA.webp" },
  { path: "wan-2.7/reference-to-video", href: "/models", provider: "alibaba", type: "image-to-video", price: "$0.5", image: "1773982487527428587_7V5eoxHR.webp" },
  { path: "wan-2.7/video-edit", href: "/models", provider: "alibaba", type: "video-to-video", price: "$0.5", image: "1773982485462820141_SWBsOay0.webp" },
  { path: "nano-banana-pro/edit", href: "/models", provider: "google", type: "image-to-image", price: "$0.119", discount: { percent: 15, original: "$0.14" }, image: "1773982488096109393_g2UoRiPf.webp" },
  { path: "nano-banana-2/edit", href: "/models", provider: "google", type: "image-to-image", price: "$0.0595", discount: { percent: 15, original: "$0.07" }, image: "1773982488033922443_4GhqzJT3.webp" },
  { path: "nano-banana-2/text-to-image", href: "/models", provider: "google", type: "text-to-image", price: "$0.0595", discount: { percent: 15, original: "$0.07" }, image: "1773982488103867536_m9YmHYnM.webp" },
  { path: "nano-banana-pro/text-to-image", href: "/models", provider: "google", type: "text-to-image", price: "$0.119", discount: { percent: 15, original: "$0.14" }, image: "1773982488677021111_Z5wmwFPZ.webp" },
  { path: "seedream-v4.5/edit", href: "/models", provider: "bytedance", type: "image-to-image", price: "$0.04", image: "1773982486529320898_2EA1uWkK.webp" },
  { path: "infinitetalk", href: "/models", provider: "openoctopus", type: "digital-human", price: "$0.15", image: "1773982487109684599_qpWYmG5z.webp" },
  { path: "wan-2.7/image-edit", href: "/models", provider: "alibaba", type: "image-to-image", price: "$0.03", image: "1773982486219725120_geW0oOkK.webp" },
  { path: "wan-2.7/image-edit-pro", href: "/models", provider: "alibaba", type: "image-to-image", price: "$0.075", image: "1773982487225168510_bW7gpyIR.webp" },
  { path: "wan-2.2/animate", href: "/models", provider: "openoctopus", type: "motion-control", price: "$0.2", image: "1773982488807980452_SkV5eoxG.webp" },
  { path: "kling-v2.6-pro/motion-control", href: "/models", provider: "kwaivgi", type: "motion-control", price: "$0.336", image: "1773982486480192004_ShKT2clu.webp" },
  { path: "wan-2.6/image-to-video-spicy", href: "/models", provider: "alibaba", type: "image-to-video", price: "$0.5", image: "1773982487369289135_VsisBLU3.webp" },
  { path: "wan-2.6/image-to-video", href: "/models", provider: "alibaba", type: "image-to-video", price: "$0.5", image: "1773982488389173191_Oq1bluEO.webp" },
];

function StatusDots() {
  return (
    <div className="flex items-center gap-px">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-green h-3 w-1" />
      ))}
    </div>
  );
}

export function FeaturedModels() {
  return (
    <section className="py-20">
      {/* Title */}
      <div className="mx-auto flex max-w-[1160px] flex-col items-center gap-10">
        <div className="flex max-w-[876px] flex-col items-center gap-4 text-center">
          <h2 className="text-[32px] font-bold leading-none tracking-[-1px] text-balance text-[#111] md:text-[48px] font-display">
            Featured Models
          </h2>
        </div>
      </div>

      {/* Decorative images + model list */}
      <div className="relative mt-10">
        {/* Left decorative column */}
        <div className="pointer-events-none absolute left-0 top-0 hidden flex-col items-start xl:flex">
          {LEFT_IMAGES.map((img) => (
            <div
              key={img}
              className="relative overflow-hidden transition-all duration-300 ease-out"
              style={{ height: 80, width: 80, opacity: 0.6 }}
            >
              <Image alt="" src={`${IMG}${img}`} fill className="object-cover" sizes="100vw" unoptimized />
            </div>
          ))}
        </div>

        {/* Right decorative column */}
        <div className="pointer-events-none absolute right-0 top-0 hidden flex-col items-end xl:flex">
          {RIGHT_IMAGES.map((img) => (
            <div
              key={img}
              className="relative overflow-hidden transition-all duration-300 ease-out"
              style={{ height: 80, width: 80, opacity: 0.6 }}
            >
              <Image alt="" src={`${IMG}${img}`} fill className="object-cover" sizes="100vw" unoptimized />
            </div>
          ))}
        </div>

        {/* Model list */}
        <div className="mx-auto max-w-[1160px]">
          <div className="flex flex-col">
            {MODELS.map((model) => (
              <Link
                key={model.href}
                href={model.href}
                className="grid grid-cols-[40px_1fr_auto] items-center gap-3 border-b border-black/5 px-4 py-3 transition-colors duration-150 md:h-20 md:grid-cols-12 md:gap-4 md:px-8 md:py-6 xl:grid-cols-12"
              >
                {/* Thumbnail - below xl */}
                <div className="relative size-10 shrink-0 overflow-hidden rounded-xs xl:hidden">
                  <Image alt="" src={`${IMG}${model.image}`} fill className="object-cover" sizes="100vw" unoptimized />
                </div>

                {/* Model path + mobile discount */}
                <div className="col-span-1 flex items-center justify-between gap-2 md:col-span-4">
                  <span className="font-mono text-sm leading-5 text-[#111]">{model.path}</span>
                  {model.discount && (
                    <span className="block whitespace-nowrap rounded-full bg-orange-500 px-2 font-mono text-xs uppercase leading-4 text-white md:hidden">
                      {model.discount.percent}% off
                    </span>
                  )}
                </div>

                {/* Provider */}
                <div className="col-span-2 hidden md:block">
                  <span className="font-mono text-sm leading-5 text-[#111]">{model.provider}</span>
                </div>

                {/* Type */}
                <div className="col-span-2 hidden md:block">
                  <span className="font-mono text-sm leading-5 text-[#111]">{model.type}</span>
                </div>

                {/* Price */}
                <div className="col-span-1 hidden items-center md:flex">
                  <span className="font-mono text-sm uppercase leading-4 text-[#111]">
                    {model.discount ? (
                      <><del>{model.discount.original}</del> {model.price}</>
                    ) : (
                      model.price
                    )}
                  </span>
                </div>

                {/* Desktop discount badge */}
                <div className="col-span-1 hidden items-center md:flex">
                  {model.discount && (
                    <span className="ml-2 whitespace-nowrap rounded-full bg-orange-500 px-2 font-mono text-xs uppercase leading-4 text-white">
                      {model.discount.percent}% off
                    </span>
                  )}
                </div>

                {/* Status dots */}
                <div className="col-span-1 hidden items-center justify-end md:flex">
                  <StatusDots />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Explore all button */}
      <div className="mx-auto mt-10 flex max-w-[1160px] justify-center">
        <Link
          href="/models"
          className="rounded-xs bg-[#111] px-4 py-3 font-mono text-sm font-medium tracking-[1.2px] text-white transition-colors duration-150 hover:bg-[#111]/80"
        >
          Explore <span className="font-bold">All 1000+</span> models
        </Link>
      </div>
    </section>
  );
}
