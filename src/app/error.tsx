"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-[#FCFCFA] px-4 py-16 text-[#111827]">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(243, 226, 201, 0.56), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,252,250,1) 46%)",
        }}
      />
      <section className="relative w-full max-w-lg rounded-2xl border border-black/[0.08] bg-white p-8 text-center shadow-[0_24px_60px_rgba(17,24,39,0.08)]">
        <p className="text-[10px] uppercase tracking-[1px] text-black/45">OpenOctopus</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111827]">
          We could not load this page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-black/55">
          The request hit a temporary error. Try again, or return to the dashboard.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-black/35">Error ID: {error.digest}</p>
        ) : null}
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-10 items-center justify-center rounded-md border border-[#111827] bg-[#111827] px-4 text-sm font-medium text-white transition-colors hover:bg-black"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-md border border-black/[0.12] bg-white px-4 text-sm font-medium text-black/75 transition-colors hover:bg-black/[0.03]"
          >
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
