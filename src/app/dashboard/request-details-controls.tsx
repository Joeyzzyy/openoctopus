"use client";

import { useRef, useState, useTransition } from "react";
import type { PointerEvent } from "react";
import { useRouter } from "next/navigation";

type RequestInterval = "minute" | "hour" | "day";
type RequestRange = "60m" | "6h" | "24h" | "7d" | "30d" | "90d";

type ApiKeyOption = {
  id: string;
  name: string;
};

const requestIntervalOptions = [
  { value: "minute", label: "By minute" },
  { value: "hour", label: "By hour" },
  { value: "day", label: "By day" },
] as const;

function getRequestRangeOptions(interval: RequestInterval) {
  if (interval === "minute") {
    return [
      { value: "60m", label: "Last 60m" },
      { value: "6h", label: "Last 6h" },
      { value: "24h", label: "Last 24h" },
    ] as const;
  }

  if (interval === "hour") {
    return [
      { value: "24h", label: "Last 24h" },
      { value: "7d", label: "Last 7d" },
      { value: "30d", label: "Last 30d" },
    ] as const;
  }

  return [
    { value: "30d", label: "Last 30d" },
    { value: "90d", label: "Last 90d" },
  ] as const;
}

function parseRequestRange(value: string | undefined, interval: RequestInterval): RequestRange {
  const validValues = getRequestRangeOptions(interval).map((option) => option.value);
  return validValues.includes(value as RequestRange) ? (value as RequestRange) : validValues[0];
}

function buildDashboardHref(input: {
  apiKeyId?: string | null;
  analyticsInterval: RequestInterval;
  analyticsRange: RequestRange;
}) {
  const params = new URLSearchParams();
  params.set("view", "request-details");
  params.set("requestsPage", "1");
  params.set("billingPage", "1");
  params.set("analyticsInterval", input.analyticsInterval);
  params.set("analyticsRange", input.analyticsRange);
  if (input.apiKeyId) {
    params.set("apiKey", input.apiKeyId);
  }
  return `/dashboard?${params.toString()}`;
}

export function RequestDetailsFilters({
  apiKeys,
  selectedApiKeyId,
  analyticsInterval,
  analyticsRange,
}: {
  apiKeys: ApiKeyOption[];
  selectedApiKeyId: string | null;
  analyticsInterval: RequestInterval;
  analyticsRange: RequestRange;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const rangeOptions = getRequestRangeOptions(analyticsInterval);
  const navigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <>
      <div className="mb-4 grid gap-3 rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] p-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <label className="block">
          <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">
            API key filter
          </span>
          <select
            value={selectedApiKeyId ?? "all"}
            disabled={isPending}
            onChange={(event) => {
              navigate(
                buildDashboardHref({
                  apiKeyId: event.target.value === "all" ? null : event.target.value,
                  analyticsInterval,
                  analyticsRange,
                })
              );
            }}
            className="h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#38BDF8] disabled:cursor-wait disabled:opacity-70"
          >
            <option value="all">All keys</option>
            {apiKeys.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">
            Time granularity
          </span>
          <select
            value={analyticsInterval}
            disabled={isPending}
            onChange={(event) => {
              const nextInterval = event.target.value as RequestInterval;
              navigate(
                buildDashboardHref({
                  apiKeyId: selectedApiKeyId,
                  analyticsInterval: nextInterval,
                  analyticsRange: parseRequestRange(undefined, nextInterval),
                })
              );
            }}
            className="h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#38BDF8] disabled:cursor-wait disabled:opacity-70"
          >
            {requestIntervalOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] tracking-[0.35px] text-black/55">
            Time range
          </span>
          <select
            value={analyticsRange}
            disabled={isPending}
            onChange={(event) => {
              navigate(
                buildDashboardHref({
                  apiKeyId: selectedApiKeyId,
                  analyticsInterval,
                  analyticsRange: event.target.value as RequestRange,
                })
              );
            }}
            className="h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-[#111827] outline-none focus:border-[#38BDF8] disabled:cursor-wait disabled:opacity-70"
          >
            {rangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {isPending ? (
        <div className="fixed inset-x-0 bottom-0 top-[6.5rem] z-[25] flex items-center justify-center bg-[#F8FCFF]/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-[#BAE6FD] bg-white px-5 py-4 shadow-lg">
            <span className="inline-flex size-8 animate-spin rounded-full border-2 border-[#BAE6FD] border-t-[#38BDF8]" />
            <span className="text-sm text-[#7B6A55]">Loading request data...</span>
          </div>
        </div>
      ) : null}
    </>
  );
}

function buildLinePath(points: Array<{ x: number; y: number }>) {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");
}

function formatValue(value: number, valueKind: "count" | "currency") {
  if (valueKind === "currency") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: value > 0 && value < 0.1 ? 4 : 2,
    }).format(value);
  }

  return new Intl.NumberFormat("en-US").format(value);
}

export function InteractiveTrendChartCard({
  title,
  points,
  labels,
  valueLabel,
  valueKind,
}: {
  title: string;
  points: number[];
  labels: string[];
  valueLabel: string;
  valueKind: "count" | "currency";
}) {
  const width = 560;
  const height = 180;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const maxValue = Math.max(...points, 1);
  const chartPoints = points.map((value, index) => ({
    value,
    x: points.length === 1 ? width / 2 : (index / (points.length - 1)) * width,
    y: height - (value / maxValue) * height,
  }));
  const activePoint = hoverIndex !== null ? chartPoints[hoverIndex] : null;
  const activeLabel = hoverIndex !== null ? labels[hoverIndex] : null;

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || chartPoints.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const nearestIndex = chartPoints.reduce((nearest, point, index) => {
      return Math.abs(point.x - x) < Math.abs(chartPoints[nearest].x - x) ? index : nearest;
    }, 0);
    setHoverIndex(nearestIndex);
  };

  return (
    <div className="rounded-2xl border border-[#BAE6FD] bg-white p-4 shadow-sm">
      <div>
        <div>
          <p className="text-sm font-medium text-black">{title}</p>
          <p className="mt-1 text-xs text-black/45">{valueLabel}</p>
        </div>
      </div>

      <div className="relative mt-4 rounded-xl border border-black/[0.06] bg-[#F8FCFF] p-3">
        {activePoint && activeLabel ? (
          <div
            className="pointer-events-none absolute top-4 z-10 min-w-28 rounded-lg border border-[#BAE6FD] bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              transform: activePoint.x > width * 0.75 ? "translateX(-100%)" : "translateX(8px)",
            }}
          >
            <p className="font-medium text-[#111827]">{activeLabel}</p>
            <p className="mt-1 text-[#0369A1]">{formatValue(activePoint.value, valueKind)}</p>
          </div>
        ) : null}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full touch-none"
          role="img"
          aria-label={title}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={height - height * ratio}
              y2={height - height * ratio}
              stroke="rgba(17,17,17,0.08)"
              strokeDasharray="4 6"
            />
          ))}
          <path
            d={buildLinePath(chartPoints)}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {chartPoints.map((point, index) => {
            const isActive = index === hoverIndex;
            return (
              <circle
                key={`${point.x}-${index}`}
                cx={point.x}
                cy={point.y}
                r={isActive ? 5 : 3}
                fill={isActive ? "#0369A1" : "#38BDF8"}
                stroke="#F8FCFF"
                strokeWidth="2"
              />
            );
          })}
          {activePoint ? (
            <line
              x1={activePoint.x}
              x2={activePoint.x}
              y1="0"
              y2={height}
              stroke="rgba(154,79,24,0.22)"
              strokeDasharray="4 6"
            />
          ) : null}
        </svg>
        <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-black/45">
          <span>{labels[0] ?? ""}</span>
          <span>{labels[Math.floor(labels.length / 2)] ?? ""}</span>
          <span>{labels[labels.length - 1] ?? ""}</span>
        </div>
      </div>
    </div>
  );
}
