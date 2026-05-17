"use client";

import Link from "next/link";
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
      {walletBalanceLabel ? (
        <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E7C89A] bg-[#FFF8EC] pl-3 pr-1 text-[#9A4F18] shadow-sm">
          <span className="max-w-[92px] truncate text-[12px] font-semibold sm:max-w-[132px] sm:text-[13px]">
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
            className="inline-flex size-7 items-center justify-center rounded-full text-[#9A4F18]/65 transition-colors hover:bg-[#F1D5A8]/35 hover:text-[#7A3E12] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-label="Open account menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-[#E7C89A] bg-white text-[12px] font-semibold text-[#9A4F18] shadow-sm transition-colors hover:bg-[#FFF8EC]"
      >
        {userAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userAvatarUrl} alt={userLabel ?? "User avatar"} className="h-full w-full object-cover" />
        ) : (
          <span>{avatarFallback}</span>
        )}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-20 w-64 rounded-xl border border-black/[0.08] bg-white p-3 shadow-xl">
          <p className="truncate text-sm font-medium text-black">{userLabel ?? "OpenOctopus User"}</p>
          {walletBalanceLabel ? (
            <>
              <p className="mt-2 text-xs text-black/55">Wallet balance</p>
              <p className="text-lg font-semibold text-black">{walletBalanceLabel}</p>
            </>
          ) : null}
          <div className="mt-3 grid gap-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-[#111827] px-3 text-sm font-medium text-white hover:bg-[#0B1220]"
            >
              Dashboard
            </Link>
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
