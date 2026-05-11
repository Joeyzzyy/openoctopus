import Link from "next/link";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  items: ReadonlyArray<{
    label: string;
    href: string;
  }>;
  userLabel: string;
  activeHref: string;
};

export function DashboardSidebar({
  items,
  activeHref,
}: DashboardSidebarProps) {
  return (
    <div className="fixed left-[max(1rem,calc(50%-40rem))] top-[94px] z-30 w-[208px] rounded-xl border border-black/[0.08] bg-white/90 p-2.5 backdrop-blur-sm">
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-[#111111] text-white"
                  : "text-black/62 hover:bg-black/[0.03] hover:text-black"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function DashboardMobileNav({
  items,
  userLabel,
  activeHref,
}: DashboardSidebarProps) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white/90 p-2.5 backdrop-blur-sm xl:hidden">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="max-w-full truncate text-[12px] font-medium text-black/50">
          {userLabel}
        </span>
      </div>

      <div className="px-1 pb-0.5">
        <nav className="grid grid-cols-2 gap-1.5">
          {items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex min-w-0 items-center justify-center rounded-md border px-2 py-2 text-center text-[12px] font-medium transition-colors",
                  isActive
                    ? "border-[#111111] bg-[#111111] text-white"
                    : "border-black/[0.08] bg-[#FCFCFA] text-black/65 hover:bg-black/[0.03] hover:text-black"
                )}
              >
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
