"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, RefreshCw } from "lucide-react";
import type { Locale } from "@/lib/i18n";

export function HeaderUserMenu({
  locale,
  userLabel,
  userAvatarUrl,
  walletBalanceLabel,
  labels = {
    openMenu: "Open account menu",
    userFallback: "OpenOctopus User",
    walletBalance: "Wallet balance",
    dashboard: "Dashboard",
    signOut: "Sign out",
    refreshingBalance: "Refreshing balance",
    refreshBalance: "Refresh balance",
    language: "Language",
    english: "English",
    chinese: "Chinese",
  },
}: {
  locale: Locale;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  walletBalanceLabel?: string | null;
  labels?: {
    openMenu: string;
    userFallback: string;
    walletBalance: string;
    dashboard: string;
    signOut: string;
    refreshingBalance: string;
    refreshBalance: string;
    language: string;
    english: string;
    chinese: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [isSwitchingLocale, startLocaleTransition] = useTransition();
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
        <div className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#BAE6FD] bg-[#F0F9FF] pl-3 pr-1 text-[#0369A1] shadow-sm">
          <span className="max-w-[92px] truncate text-[12px] font-semibold sm:max-w-[132px] sm:text-[13px]">
            {walletBalanceLabel}
          </span>
          <button
            type="button"
            aria-label={isRefreshing ? labels.refreshingBalance : labels.refreshBalance}
            disabled={isRefreshing}
            onClick={() => {
              startRefreshTransition(() => {
                router.refresh();
              });
            }}
            className="inline-flex size-7 items-center justify-center rounded-full text-[#0369A1]/65 transition-colors hover:bg-[#F1D5A8]/35 hover:text-[#7A3E12] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      ) : null}
      <button
        type="button"
        aria-label={labels.openMenu}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-9 items-center justify-center overflow-hidden rounded-full border border-[#BAE6FD] bg-white text-[12px] font-semibold text-[#0369A1] shadow-sm transition-colors hover:bg-[#F0F9FF]"
      >
        {userAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={userAvatarUrl} alt={userLabel ?? labels.userFallback} className="h-full w-full object-cover" />
        ) : (
          <span>{avatarFallback}</span>
        )}
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-20 w-[min(19rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-[#BAE6FD] bg-[linear-gradient(180deg,#ffffff_0%,#f8fcff_100%)] p-3 shadow-[0_24px_60px_rgba(14,165,233,0.14)]">
          <div className="rounded-xl border border-[#DDF4FF] bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-11 items-center justify-center overflow-hidden rounded-full border border-[#BAE6FD] bg-[#E0F2FE] text-sm font-semibold text-[#0369A1]">
                {userAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatarUrl} alt={userLabel ?? labels.userFallback} className="h-full w-full object-cover" />
                ) : (
                  <span>{avatarFallback}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0F172A]">{userLabel ?? labels.userFallback}</p>
                <p className="mt-0.5 text-xs text-[#64748B]">{labels.walletBalance}</p>
              </div>
            </div>
            {walletBalanceLabel ? (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-[#DDF4FF] bg-[#F0F9FF] px-3 py-2.5">
                <div>
                  <p className="text-[11px] text-[#64748B]">{labels.walletBalance}</p>
                  <p className="mt-0.5 text-base font-semibold text-[#0C4A6E]">{walletBalanceLabel}</p>
                </div>
                <button
                  type="button"
                  aria-label={isRefreshing ? labels.refreshingBalance : labels.refreshBalance}
                  disabled={isRefreshing}
                  onClick={() => {
                    startRefreshTransition(() => {
                      router.refresh();
                    });
                  }}
                  className="inline-flex size-8 items-center justify-center rounded-full border border-[#BAE6FD] bg-white text-[#0369A1]/70 transition-colors hover:bg-[#E0F2FE] hover:text-[#0369A1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-[#DDF4FF] bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              <Languages className="size-3.5" />
              <span>{labels.language}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isSwitchingLocale || locale === "en"}
                onClick={() => {
                  startLocaleTransition(async () => {
                    await fetch("/api/locale", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ locale: "en" }),
                    });
                    router.refresh();
                  });
                }}
                className={`inline-flex h-9 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                  locale === "en"
                    ? "border-[#38BDF8] bg-[#E0F2FE] text-[#0369A1]"
                    : "border-[#DDF4FF] bg-white text-[#475569] hover:bg-[#F8FCFF]"
                }`}
              >
                {labels.english}
              </button>
              <button
                type="button"
                disabled={isSwitchingLocale || locale === "zh"}
                onClick={() => {
                  startLocaleTransition(async () => {
                    await fetch("/api/locale", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ locale: "zh" }),
                    });
                    router.refresh();
                  });
                }}
                className={`inline-flex h-9 items-center justify-center rounded-xl border text-sm font-medium transition-colors ${
                  locale === "zh"
                    ? "border-[#38BDF8] bg-[#E0F2FE] text-[#0369A1]"
                    : "border-[#DDF4FF] bg-white text-[#475569] hover:bg-[#F8FCFF]"
                }`}
              >
                {labels.chinese}
              </button>
            </div>
          </div>

          <div className="mt-3 grid gap-2">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-[#0F172A] px-3 text-sm font-medium text-white transition-colors hover:bg-[#020617]"
            >
              {labels.dashboard}
            </Link>
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#DDF4FF] bg-white px-3 text-sm font-medium text-[#334155] transition-colors hover:bg-[#F8FCFF]"
              >
                {labels.signOut}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
