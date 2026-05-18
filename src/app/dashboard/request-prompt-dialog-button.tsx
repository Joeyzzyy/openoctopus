"use client";

import { useState } from "react";
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
}: {
  prompt: string;
  buttonLabel: string;
  title: string;
  description: string;
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
        <DialogContent className="max-w-2xl p-0 sm:max-w-2xl">
          <DialogHeader className="border-b border-black/[0.08] px-5 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6">
            <div className="flex items-start justify-between gap-3 pr-8">
              <div className="min-w-0">
                <DialogTitle className="text-sm font-semibold uppercase tracking-[1px] text-[#111827]">
                  {title}
                </DialogTitle>
                <DialogDescription className="mt-2 text-black/55">
                  {description}
                </DialogDescription>
              </div>
              <CopyTextButton value={prompt} label={title} />
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
