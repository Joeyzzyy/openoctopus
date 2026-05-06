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
      ? "inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#B54432] px-3 text-xs font-medium text-white transition-colors hover:bg-[#9A3828] disabled:cursor-not-allowed disabled:bg-[#F5D9D4] disabled:text-[#8F6D67]"
      : "inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#111827] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0B1220] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35";

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
