"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function TopUpCelebration({
  labels = {
    fallback: "Balance updated successfully",
    title: "Top-up completed",
    amountPrefix: "Balance +",
  },
}: {
  labels?: {
    fallback: string;
    title: string;
    amountPrefix: string;
  };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [amountLabel, setAmountLabel] = useState<string | null>(null);

  const confettiItems = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        id: index,
        left: `${(index * 97) % 100}%`,
        delayMs: (index % 7) * 120,
        durationMs: 2200 + (index % 5) * 220,
        rotation: (index * 37) % 360,
        color:
          index % 5 === 0
            ? "#22c55e"
            : index % 5 === 1
              ? "#f59e0b"
              : index % 5 === 2
                ? "#3b82f6"
                : index % 5 === 3
                  ? "#ef4444"
                  : "#a855f7",
      })),
    []
  );

  useEffect(() => {
    const shouldCelebrate = searchParams.get("celebrateTopup") === "1";
    if (!shouldCelebrate) {
      return;
    }

    const amountRaw = searchParams.get("topupAmount");
    const parsedAmount = amountRaw ? Number(amountRaw) : NaN;
    const safeAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : null;

    setAmountLabel(
      safeAmount !== null
        ? `${labels.amountPrefix}$${safeAmount.toFixed(2)}`
        : labels.fallback
    );
    setVisible(true);

    const hideTimer = window.setTimeout(() => setVisible(false), 4800);
    const cleanupTimer = window.setTimeout(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("celebrateTopup");
      nextParams.delete("topupAmount");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, 5200);

    return () => {
      window.clearTimeout(cleanupTimer);
      window.clearTimeout(hideTimer);
    };
  }, [labels.amountPrefix, labels.fallback, pathname, router, searchParams]);

  if (!visible || !amountLabel) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {confettiItems.map((item) => (
          <span
            key={item.id}
            className="confetti-piece"
            style={{
              left: item.left,
              backgroundColor: item.color,
              animationDelay: `${item.delayMs}ms`,
              animationDuration: `${item.durationMs}ms`,
              transform: `rotate(${item.rotation}deg)`,
            }}
          />
        ))}
      </div>

      <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-center shadow-[0_16px_42px_rgba(16,185,129,0.22)]">
          <p className="text-sm font-semibold text-emerald-700">{labels.title}</p>
          <p className="mt-1 text-base font-bold text-emerald-800">{amountLabel}</p>
        </div>
      </div>
    </>
  );
}
