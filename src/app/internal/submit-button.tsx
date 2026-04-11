"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  disabled = false,
  tone = "default",
}: {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  const className =
    tone === "danger"
      ? "inline-flex h-9 cursor-pointer items-center justify-center rounded-sm bg-[#b54432] px-3 text-xs font-medium text-white transition-colors hover:bg-[#993825] disabled:cursor-not-allowed disabled:bg-[#f1d6d1] disabled:text-[#8f6d67]"
      : "inline-flex h-9 cursor-pointer items-center justify-center rounded-sm bg-[#111111] px-3 text-xs font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35";

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className={className}
    >
      {pending ? (pendingLabel ?? "Saving...") : label}
    </button>
  );
}
