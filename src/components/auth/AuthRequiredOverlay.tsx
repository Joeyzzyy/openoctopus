"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AuthRequiredOverlay({
  open,
  onClose,
  title = "Sign in required",
  description = "Please sign in to continue.",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!open) {
    return null;
  }

  const nextPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.1] bg-white p-5 shadow-2xl">
        <h4 className="text-base font-semibold text-black">{title}</h4>
        <p className="mt-2 text-sm leading-6 text-black/60">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => router.push(`/login?next=${encodeURIComponent(nextPath)}`)}
            className="h-9 rounded-md bg-[#C27B3B] px-3 text-xs font-semibold text-white shadow-sm hover:bg-[#A6642D]"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
