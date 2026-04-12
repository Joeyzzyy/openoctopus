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
    <div className="fixed left-[max(1rem,calc(50%-40rem))] top-8 z-30 w-[220px] rounded-sm border border-black/10 bg-white/92 p-3 shadow-[0_18px_48px_rgba(17,17,17,0.05)] backdrop-blur-sm">
      <div className="mb-3 border-b border-black/10 px-2 pb-3">
        <div className="inline-flex items-center rounded-sm bg-[#f4f4f1] px-2.5 py-1 text-sm text-black/80">
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
                "flex w-full items-center rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-black text-white"
                  : "text-black/60 hover:bg-black/[0.04] hover:text-black"
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
