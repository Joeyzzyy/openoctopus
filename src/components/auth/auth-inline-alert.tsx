"use client";

import { AlertCircle } from "lucide-react";

export function AuthInlineAlert({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-[#FECACA] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(254,242,242,0.98))] p-3 text-left shadow-[0_12px_30px_rgba(239,68,68,0.08)]">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-[#DC2626]">
          <AlertCircle className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#7F1D1D]">{title}</p>
          <p className="mt-1 text-sm leading-5 text-[#991B1B]/85">{message}</p>
        </div>
      </div>
    </div>
  );
}
