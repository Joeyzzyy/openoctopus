import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
}

const ICON_PATH =
  "M282.388 199.73L372.904 42.9505C387.909 16.9606 415.64 0.950195 445.65 0.950195H536.388C550.748 0.950195 562.388 12.5908 562.388 26.9502V199.73L652.904 42.9505C667.909 16.9606 695.64 0.950195 725.651 0.950195H816.388C830.748 0.950195 842.388 12.5908 842.388 26.9502V174.95C842.388 189.31 830.748 200.95 816.388 200.95H792.623L686.069 385.509C668.396 416.12 629.254 426.609 598.643 408.935L520.888 364.044C501.086 352.611 488.888 331.483 488.888 308.618V242.06L406.068 385.51C388.395 416.121 349.253 426.609 318.642 408.936L240.888 364.045C221.086 352.612 208.888 331.484 208.888 308.619V242.06L177.067 297.176C169.887 309.611 153.986 313.872 141.55 306.692L13.3793 232.692C0.943751 225.513 -3.317 209.611 3.86264 197.176L92.9042 42.9504C107.909 16.9606 135.64 0.950195 165.65 0.950195H256.388C270.748 0.950195 282.388 12.5908 282.388 26.9502V199.73Z";

export function Logo({ className }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 text-white", className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 843 418"
        fill="none"
        className="h-6 w-6 shrink-0"
      >
        <path fill="currentColor" d={ICON_PATH} />
      </svg>
      <span className="hidden font-mono text-[10px] font-bold uppercase tracking-[1.2px] min-[420px]:inline sm:text-[11px]">
        OpenOctopus
      </span>
    </div>
  );
}
