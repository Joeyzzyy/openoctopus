"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export function HeaderUserMenu({
  userLabel,
  userAvatarUrl,
  walletBalanceLabel,
}: {
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  walletBalanceLabel?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const avatarFallback = (userLabel?.trim()?.charAt(0) || "U").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      <span className="hidden max-w-[260px] truncate text-[13px] text-[#6B7280] md:inline">
        {userLabel ?? "OpenOctopus User"}
      </span>
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-black/[0.08] bg-white text-[12px] font-semibold text-black/75 transition-colors hover:bg-black/[0.03]"
      >
        {userAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userAvatarUrl} alt={userLabel ?? "User avatar"} className="h-full w-full object-cover" />
        ) : (
          <span>{avatarFallback}</span>
        )}
      </button>
      {walletBalanceLabel ? (
        <>
          <span className="max-w-[120px] truncate text-[12px] font-medium text-[#111827] sm:max-w-none sm:text-[13px]">
            {walletBalanceLabel}
          </span>
          <button
            type="button"
            aria-label={isRefreshing ? "Refreshing balance" : "Refresh balance"}
            disabled={isRefreshing}
            onClick={() => {
              startRefreshTransition(() => {
                router.refresh();
              });
            }}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.08] bg-white text-black/55 transition-colors hover:bg-black/[0.03] hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </>
      ) : null}

      {open ? (
        <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-black/[0.08] bg-white p-3 shadow-xl">
          <p className="truncate text-sm font-medium text-black">{userLabel ?? "OpenOctopus User"}</p>
          {walletBalanceLabel ? (
            <>
              <p className="mt-2 text-xs text-black/55">Wallet balance</p>
              <p className="text-lg font-semibold text-black">{walletBalanceLabel}</p>
            </>
          ) : null}
          <div className="mt-3">
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-md border border-black/[0.12] bg-white px-3 text-sm font-medium text-black/80 hover:bg-black/[0.03]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
