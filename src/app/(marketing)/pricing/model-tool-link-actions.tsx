"use client";

import { Check, Copy, ExternalLink } from "lucide-react";

import { useState } from "react";

export function ModelToolLinkActions({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="flex min-w-0 items-center gap-2">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] font-mono text-xs leading-5 text-black/65 underline underline-offset-2 hover:text-black"
        title={url}
      >
        {url}
      </a>
      <button
        type="button"
        onClick={copyUrl}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-black/[0.1] bg-white text-black/65 hover:bg-black/[0.03] hover:text-black"
        aria-label="Copy tool page URL"
        title="Copy tool page URL"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-black/[0.1] bg-white text-black/65 hover:bg-black/[0.03] hover:text-black"
        aria-label="Open tool page in new tab"
        title="Open tool page in new tab"
      >
        <ExternalLink className="size-3.5" />
      </a>
    </span>
  );
}
