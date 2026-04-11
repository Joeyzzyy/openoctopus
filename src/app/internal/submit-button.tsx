"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  label,
  pendingLabel,
  disabled = false,
}: {
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-busy={pending}
      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-sm bg-[#111111] px-3 text-xs font-medium text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35"
    >
      {pending ? (pendingLabel ?? "Saving...") : label}
    </button>
  );
}
