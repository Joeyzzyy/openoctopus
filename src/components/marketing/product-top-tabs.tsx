"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TAB_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Models", href: "/models" },
];

export function ProductTopTabs() {
  const pathname = usePathname();

  return (
    <div className="sticky top-16 z-30 mb-3 border-b border-black/[0.08] bg-[#FCFCFA]/95 backdrop-blur-xl">
      <div className="flex items-center gap-1">
        {TAB_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                active
                  ? "border-black text-black"
                  : "border-transparent text-black/55 hover:text-black"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
