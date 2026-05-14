"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CreateKeySheet } from "./create-key-sheet";

export function CreateKeyButton({
  disabled = false,
  className,
}: {
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [sheetInstance, setSheetInstance] = useState(0);

  const openSheet = () => {
    setSheetInstance((value) => value + 1);
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={openSheet}
        disabled={disabled}
        title={disabled ? "Create API key is currently unavailable" : "Create API key"}
        className={cn(
          "inline-flex h-9 cursor-pointer items-center gap-2 rounded-[14px] bg-[#1F8A4C] px-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white shadow-sm transition-colors hover:bg-[#176D3D] disabled:cursor-not-allowed disabled:bg-[#1F8A4C]/35 disabled:text-white/75 sm:h-10 sm:px-4",
          className
        )}
      >
        <Plus className="h-4 w-4" />
        <span>Create Key</span>
      </button>
      <CreateKeySheet key={sheetInstance} open={open && !disabled} onOpenChange={setOpen} />
    </>
  );
}
