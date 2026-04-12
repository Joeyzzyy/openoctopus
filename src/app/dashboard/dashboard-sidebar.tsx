"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type DashboardSidebarProps = {
  items: ReadonlyArray<{
    label: string;
    href: `#${string}`;
  }>;
  userLabel: string;
};

export function DashboardSidebar({ items, userLabel }: DashboardSidebarProps) {
  const [activeHref, setActiveHref] = useState(items[0]?.href ?? "#overview");

  useEffect(() => {
    const sections = items
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter((section): section is HTMLElement => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const updateActiveSection = () => {
      const scrollY = window.scrollY + 160;
      let currentHref = items[0]?.href ?? "#overview";

      for (const section of sections) {
        if (section.offsetTop <= scrollY) {
          currentHref = `#${section.id}`;
        }
      }

      setActiveHref(currentHref);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
    };
  }, [items]);

  const scrollToSection = (href: `#${string}`) => {
    const section = document.querySelector<HTMLElement>(href);
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", href);
    setActiveHref(href);
  };

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
            <button
              key={item.href}
              type="button"
              onClick={() => scrollToSection(item.href)}
              className={cn(
                "flex w-full cursor-pointer items-center rounded-sm px-2.5 py-2 text-left text-sm transition-colors",
                isActive
                  ? "bg-black text-white"
                  : "text-black/60 hover:bg-black/[0.04] hover:text-black"
              )}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
