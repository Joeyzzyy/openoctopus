"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Category {
  id: string;
  name: string;
  description?: string;
  count: number;
  icon?: string;
  href: string;
}

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  return (
    <Link
      href={category.href}
      className={cn(
        "group relative flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 p-4 transition-all duration-300 hover:border-white/20 hover:bg-white/10",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-semibold text-white transition-colors group-hover:text-blue-400">
          {category.name}
        </h3>
        <ArrowUpRight className="h-4 w-4 text-white/30 transition-all group-hover:text-white/60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>

      {/* Count */}
      <p className="text-xs text-white/50">{category.count} models</p>

      {/* Description (optional) */}
      {category.description && (
        <p className="mt-1 text-xs text-white/40 line-clamp-2">
          {category.description}
        </p>
      )}
    </Link>
  );
}
