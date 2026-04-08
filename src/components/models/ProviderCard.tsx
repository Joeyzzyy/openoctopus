"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { StatusDots } from "./StatusDots";

export interface Provider {
  id: string;
  name: string;
  icon: string;
  status: "online" | "busy" | "offline";
  latency?: string;
}

interface ProviderCardProps {
  provider: Provider;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function ProviderCard({ provider, className, size = "md" }: ProviderCardProps) {
  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-20 w-20",
    lg: "h-24 w-24",
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[2px] border border-black/10 bg-[#111111] shadow-[0_10px_30px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 ease-out",
        "hover:scale-105 hover:border-black/20 hover:bg-[#171717]",
        "active:scale-95",
        sizeClasses[size],
        className
      )}
    >
      <div className="absolute inset-0">
        {provider.icon ? (
          <Image
            src={provider.icon}
            alt={provider.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={size === "sm" ? "64px" : size === "md" ? "80px" : "96px"}
            unoptimized
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#1b1b1b] text-xs font-bold text-white">
            {provider.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

      {provider.status === "online" && (
        <div className="absolute bottom-1 left-1 transition-transform duration-300 group-hover:scale-110">
          <StatusDots count={5} />
        </div>
      )}
    </div>
  );
}
