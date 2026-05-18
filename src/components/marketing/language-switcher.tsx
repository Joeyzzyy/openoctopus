"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function LanguageSwitcher({
  locale,
  label,
  nextLabel,
  ariaLabel,
}: {
  locale: Locale;
  label: string;
  nextLabel: string;
  ariaLabel: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextLocale = locale === "zh" ? "en" : "zh";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await fetch("/api/locale", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: nextLocale }),
          });
          router.refresh();
        });
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#BAE6FD] bg-white px-3 text-[12px] font-semibold text-[#0369A1] shadow-sm transition-colors hover:bg-[#F0F9FF] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Languages className="size-3.5" aria-hidden="true" />
      <span>{label}</span>
      <span className="text-[#64748B]">/ {nextLabel}</span>
    </button>
  );
}
