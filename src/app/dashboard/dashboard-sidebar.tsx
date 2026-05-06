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
  userLabel,
  activeHref,
}: DashboardSidebarProps) {
  return (
    <div className="fixed left-[max(1rem,calc(50%-40rem))] top-8 z-30 w-[220px] rounded-2xl border border-black/[0.08] bg-white/95 p-3 shadow-[0_18px_48px_rgba(17,24,39,0.06)] backdrop-blur-sm">
      <div className="mb-3 border-b border-black/[0.08] px-2 pb-3">
        <div className="inline-flex items-center rounded-full bg-[#F3F4F6] px-2.5 py-1 text-sm text-black/80">
          {userLabel}
        </div>
      </div>

      <nav className="space-y-1">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex w-full items-center rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-[#111827] text-white"
                  : "text-black/60 hover:bg-black/[0.03] hover:text-black"
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
