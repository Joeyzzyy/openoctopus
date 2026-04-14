import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 text-white", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="h-6 w-6 shrink-0"
        aria-hidden="true"
      >
        <rect x="2.5" y="2.5" width="19" height="19" rx="5" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M7.25 15.25L10.75 8.75L14 15.25L17 10.25"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="17" cy="10.25" r="1.25" fill="currentColor" />
      </svg>
      <span className="hidden text-[13px] font-semibold tracking-tight min-[420px]:inline">
        OpenOctopus
      </span>
    </div>
  );
}
