"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { CreateKeySheet } from "./create-key-sheet";

export function CreateKeyButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-[14px] bg-[#111111] px-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white sm:h-10 sm:px-4"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden min-[480px]:inline">Create Key</span>
      </button>
      <CreateKeySheet open={open} onOpenChange={setOpen} />
    </>
  );
}
