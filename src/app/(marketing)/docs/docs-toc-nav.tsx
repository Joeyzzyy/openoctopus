"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type TocSection = {
  id: string;
  label: string;
};

export function DocsTocNav({ sections }: { sections: readonly TocSection[] }) {
  const defaultId = sections[0]?.id ?? "";
  const [activeId, setActiveId] = useState(defaultId);

  const sectionIds = useMemo(() => sections.map((section) => section.id), [sections]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const fromHash = window.location.hash.replace("#", "");
    if (fromHash && sectionIds.includes(fromHash)) {
      setActiveId(fromHash);
    }

    const resolveActiveSection = () => {
      const sectionsWithTop = sectionIds
        .map((id) => {
          const element = document.getElementById(id);
          if (!element) return null;
          return {
            id,
            top: element.getBoundingClientRect().top + window.scrollY,
          };
        })
        .filter((item): item is { id: string; top: number } => Boolean(item))
        .sort((a, b) => a.top - b.top);

      if (sectionsWithTop.length === 0) return;

      const thresholdY = window.scrollY + 140;
      let nextActiveId = sectionsWithTop[0].id;

      for (const section of sectionsWithTop) {
        if (section.top <= thresholdY) {
          nextActiveId = section.id;
        } else {
          break;
        }
      }

      setActiveId(nextActiveId);
    };

    const onScroll = () => resolveActiveSection();
    const onHashChange = () => resolveActiveSection();

    resolveActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [sectionIds]);

  return (
    <nav className="mt-4 space-y-1">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={(event) => {
            event.preventDefault();
            const target = document.getElementById(section.id);
            if (!target) return;

            setActiveId(section.id);
            const top = target.getBoundingClientRect().top + window.scrollY - 108;
            window.scrollTo({ top, behavior: "smooth" });
            window.history.replaceState(null, "", `#${section.id}`);
          }}
          className={cn(
            "block rounded-lg px-3 py-2 text-sm transition-colors",
            activeId === section.id
              ? "bg-black text-white"
              : "text-black/62 hover:bg-black/[0.03] hover:text-black"
          )}
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}
