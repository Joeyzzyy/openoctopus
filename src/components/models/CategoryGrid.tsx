"use client";

import { FadeIn } from "@/components/animations/FadeIn";
import { CategoryCard, Category } from "./CategoryCard";

const CATEGORIES: Category[] = [
  { id: "1", name: "Text to Image", count: 156, href: "/category/text-to-image" },
  { id: "2", name: "Image to Video", count: 89, href: "/category/image-to-video" },
  { id: "3", name: "Text to Video", count: 67, href: "/category/text-to-video" },
  { id: "4", name: "Image Editing", count: 124, href: "/category/image-editing" },
  { id: "5", name: "Upscale", count: 45, href: "/category/upscale" },
  { id: "6", name: "Remove Background", count: 23, href: "/category/remove-bg" },
  { id: "7", name: "Motion Control", count: 34, href: "/category/motion-control" },
  { id: "8", name: "Avatar", count: 78, href: "/category/avatar" },
  { id: "9", name: "Lip Sync", count: 28, href: "/category/lip-sync" },
  { id: "10", name: "Voice Clone", count: 42, href: "/category/voice-clone" },
  { id: "11", name: "Music Gen", count: 56, href: "/category/music-gen" },
  { id: "12", name: "3D Generation", count: 31, href: "/category/3d-gen" },
  { id: "13", name: "Character", count: 89, href: "/category/character" },
  { id: "14", name: "Product Shot", count: 67, href: "/category/product" },
  { id: "15", name: "Interior", count: 45, href: "/category/interior" },
  { id: "16", name: "Fashion", count: 52, href: "/category/fashion" },
  { id: "17", name: "Food", count: 38, href: "/category/food" },
  { id: "18", name: "Architecture", count: 41, href: "/category/architecture" },
  { id: "19", name: "Landscape", count: 73, href: "/category/landscape" },
  { id: "20", name: "Portrait", count: 98, href: "/category/portrait" },
];

export function CategoryGrid() {
  return (
    <section className="py-20 px-4">
      <div className="mx-auto max-w-[1160px]">
        {/* Section Header */}
        <FadeIn className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Browse by Category
            </h2>
            <p className="mt-2 text-white/60">
              Find the perfect model for your use case
            </p>
          </div>
          <a
            href="/categories"
            className="group text-sm text-blue-400 transition-colors hover:text-blue-300"
          >
            View all categories 
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </a>
        </FadeIn>

        {/* Grid with staggered animation */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {CATEGORIES.map((category, index) => (
            <FadeIn key={category.id} delay={index * 0.03}>
              <CategoryCard category={category} />
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
