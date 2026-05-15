"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const detailMessage = typeof error?.message === "string" && error.message.trim().length > 0
    ? error.message
    : "No error message provided.";
  const detailStack = typeof error?.stack === "string" && error.stack.trim().length > 0
    ? error.stack
    : null;
  const detailText = detailStack ? `${detailMessage}\n\n${detailStack}` : detailMessage;

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#FCFCFA] font-sans text-[#111827]">
        <title>OpenOctopus - Page Error</title>
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-16">
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at top, rgba(243, 226, 201, 0.56), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,252,250,1) 46%)",
            }}
          />
          <section className="relative w-full max-w-lg rounded-2xl border border-black/[0.08] bg-white p-8 text-center shadow-[0_24px_60px_rgba(17,24,39,0.08)]">
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#111827]">
              We could not load this page.
            </h1>
            <section className="mt-5 rounded-xl border border-black/[0.08] bg-[#FCFCFA] p-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-[0.8px] text-black/50">Error details</p>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(detailText)}
                  className="inline-flex h-7 items-center rounded-md border border-black/[0.12] bg-white px-2.5 text-[11px] font-medium text-black/70 transition-colors hover:bg-black/[0.03]"
                >
                  复制
                </button>
              </div>
              <p className="mt-2 break-words font-mono text-[12px] leading-5 text-[#8A2B1D]">{detailMessage}</p>
              {detailStack ? (
                <pre className="mt-2 max-h-44 overflow-auto rounded-md border border-black/[0.08] bg-white p-2 text-[11px] leading-5 text-black/65">
                  {detailStack}
                </pre>
              ) : null}
            </section>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={() => unstable_retry()}
                className="inline-flex h-10 items-center justify-center rounded-md border border-[#111827] bg-[#111827] px-4 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex h-10 items-center justify-center rounded-md border border-black/[0.12] bg-white px-4 text-sm font-medium text-black/75 transition-colors hover:bg-black/[0.03]"
              >
                Go back
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
