import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.png"
        alt="OpenOctopus"
        width={160}
        height={40}
        priority
        className="h-7 w-auto"
      />
      <span className="hidden text-[13px] font-semibold tracking-tight min-[420px]:inline">
        Openoctopus
      </span>
    </div>
  );
}
