"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RefreshCw } from "lucide-react";

export function OpsHubRefreshButton({ label = "刷新" }: { label?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#BAE6FD] bg-white px-2.5 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE] disabled:cursor-not-allowed disabled:opacity-55"
    >
      <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "刷新中..." : label}
    </button>
  );
}
