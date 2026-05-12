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

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [sectionIds]);

  return (
    <nav className="mt-4 space-y-1">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          onClick={() => setActiveId(section.id)}
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
