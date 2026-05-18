"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyTextButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#BAE6FD] bg-white text-black/55 transition-colors hover:bg-[#E0F2FE] hover:text-black/75"
      aria-label={`复制${label}`}
      title={`复制${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
