"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

function formatTimestamp(value: Date | null) {
  if (!value) {
    return "等待首次刷新";
  }

  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

export function MonitoringAutoRefresh({
  enabled,
  intervalMs = 30_000,
}: {
  enabled: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
      setLastRefreshAt(new Date());
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled, intervalMs, router]);

  if (!enabled) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#BAE6FD] bg-[#F8FCFF] px-3 py-2.5 text-xs text-black/58 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex size-2 rounded-full ${
            isPending ? "bg-[#355fb4]" : "bg-[#1f6b3b]"
          }`}
        />
        <span>视频任务监控已开启 30 秒自动刷新</span>
      </div>
      <span>{isPending ? "正在刷新..." : `上次刷新 ${formatTimestamp(lastRefreshAt)}`}</span>
    </div>
  );
}
