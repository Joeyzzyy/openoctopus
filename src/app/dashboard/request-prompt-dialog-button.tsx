"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CopyTextButton } from "@/app/ops-hub/copy-text-button";

export function RequestPromptDialogButton({
  prompt,
  buttonLabel,
  title,
  description,
  closeLabel,
}: {
  prompt: string;
  buttonLabel: string;
  title: string;
  description: string;
  closeLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 items-center whitespace-nowrap rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]"
      >
        {buttonLabel}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[min(680px,calc(100%-2rem))] max-w-[680px] bg-white p-0"
        >
          <DialogHeader className="border-b border-black/[0.08] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold uppercase tracking-[1px] text-[#111827]">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-black/55">
                  {description}
                </DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <CopyTextButton value={prompt} label={title} />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>{closeLabel || "Close"}</span>
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto px-5 py-4 sm:px-6">
            <pre className="whitespace-pre-wrap break-words text-sm leading-6 text-black/80">
              {prompt}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
