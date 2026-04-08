"use client";

import { cn } from "@/lib/utils";

interface StatusDotsProps {
  count?: number;
  className?: string;
}

export function StatusDots({ count = 5, className }: StatusDotsProps) {
  return (
    <div className={cn("flex items-center gap-px", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-3 w-1 bg-[#24be58] animate-pulse"
          style={{
            animationDelay: `${i * 100}ms`,
            animationDuration: "1.5s",
          }}
        />
      ))}
    </div>
  );
}
