import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CircleAlert,
  KeyRound,
  LineChart,
  LogOut,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Toaster } from "sonner";
import { getDashboardData } from "@/lib/dashboard-server";
import { cn } from "@/lib/utils";
import { CreateKeyButton } from "./dashboard-actions";
import { DashboardMobileNav, DashboardSidebar } from "./dashboard-sidebar";
import { ApiKeysTable } from "./api-keys-table";
import { ApiQuickstartCard } from "./api-quickstart-card";
import { ModelCatalogTable } from "./model-catalog-table";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type DashboardView = "dashboard" | "models" | "api-keys";
type RequestInterval = "minute" | "hour" | "day";
type RequestRange = "60m" | "6h" | "24h" | "7d" | "30d" | "90d";

const pageNav = [
  { label: "Dashboard", view: "dashboard" },
  { label: "Models", view: "models" },
  { label: "API Keys", view: "api-keys" },
] as const;

const requestStatusStyles = {
  queued: "bg-[#f4efe3] text-[#7b6226]",
  processing: "bg-[#e8f0ff] text-[#355fb4]",
  succeeded: "bg-[#e4f7e8] text-[#1b7a41]",
  failed: "bg-[#ffe7e3] text-[#b54432]",
  cancelled: "bg-[#ececec] text-[#666666]",
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

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function parseDashboardView(value: string | undefined): DashboardView {
  return pageNav.some((item) => item.view === value)
    ? (value as DashboardView)
    : "dashboard";
}

function parseRequestInterval(value: string | undefined): RequestInterval {
  return requestIntervalOptions.some((option) => option.value === value)
    ? (value as RequestInterval)
    : "hour";
}

function parseRequestRange(value: string | undefined, interval: RequestInterval): RequestRange {
  const validValues = getRequestRangeOptions(interval).map((option) => option.value);
  return validValues.includes(value as RequestRange) ? (value as RequestRange) : validValues[0];
}

function parseRangeMs(value: RequestRange) {
  if (value.endsWith("m")) {
    return Number(value.replace("m", "")) * 60 * 1000;
  }

  if (value.endsWith("h")) {
    return Number(value.replace("h", "")) * 60 * 60 * 1000;
  }

  return Number(value.replace("d", "")) * 24 * 60 * 60 * 1000;
}

function getBucketMs(interval: RequestInterval) {
  if (interval === "minute") {
    return 60 * 1000;
  }

  if (interval === "hour") {
    return 60 * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000;
}

function formatBucketLabel(date: Date, interval: RequestInterval) {
  if (interval === "minute") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (interval === "hour") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildDashboardHref(input: {
  view: DashboardView;
  requestsPage?: number;
  apiKeyId?: string | null;
  analyticsInterval: RequestInterval;
  analyticsRange: RequestRange;
}) {
  const params = new URLSearchParams();
  params.set("view", input.view);
  params.set("requestsPage", String(input.requestsPage ?? 1));
  params.set("analyticsInterval", input.analyticsInterval);
  params.set("analyticsRange", input.analyticsRange);
  if (input.apiKeyId) {
    params.set("apiKey", input.apiKeyId);
  }
  return `/dashboard?${params.toString()}`;
}

function buildVisibleRequestPages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildLinePath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return "";
  }

  const maxValue = Math.max(...points, 1);
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point / maxValue) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function buildRequestTrendSeries(
  rows: Array<{ createdAt: string; costValue: number }>,
  interval: RequestInterval,
  range: RequestRange
) {
  const bucketMs = getBucketMs(interval);
  const rangeMs = parseRangeMs(range);
  const now = Date.now();
  const end = Math.floor(now / bucketMs) * bucketMs;
  const start = end - rangeMs + bucketMs;
  const bucketCount = Math.max(1, Math.floor(rangeMs / bucketMs));
  const buckets = Array.from({ length: bucketCount }, (_, index) => start + index * bucketMs);
  const requestPoints = Array.from({ length: bucketCount }, () => 0);
  const spendPoints = Array.from({ length: bucketCount }, () => 0);

  for (const row of rows) {
    const timestamp = new Date(row.createdAt).getTime();
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp > end + bucketMs - 1) {
      continue;
    }

    const bucketIndex = Math.floor((timestamp - start) / bucketMs);
    if (bucketIndex < 0 || bucketIndex >= bucketCount) {
      continue;
    }

    requestPoints[bucketIndex] += 1;
    spendPoints[bucketIndex] += row.costValue;
  }

  return {
    labels: buckets.map((bucket) => formatBucketLabel(new Date(bucket), interval)),
    requestPoints,
    spendPoints,
  };
}

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-black/55">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.35px] text-black/60">{title}</p>
          <p className="mt-1 text-2xl font-medium tracking-tight text-black">{value}</p>
          <p className="mt-2 text-xs leading-5 text-black/50">{note}</p>
        </div>
      </div>
    </div>
  );
}

function TrendChartCard({
  title,
  points,
  labels,
  valueLabel,
}: {
  title: string;
  points: number[];
  labels: string[];
  valueLabel: string;
}) {
  const width = 560;
  const height = 180;

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-black">{title}</p>
          <p className="mt-1 text-xs text-black/45">{valueLabel}</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-[#FCFCFA] px-2.5 py-1 text-[11px] text-black/60">
          <LineChart className="size-3.5" />
          <span>Trend</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full"
          role="img"
          aria-label={title}
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
            d={buildLinePath(points, width, height)}
            fill="none"
            stroke="#111111"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
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

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-8">
      <p className="text-sm font-medium text-black">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">{detail}</p>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const view = parseDashboardView(getSearchValue(resolvedSearchParams, "view"));
  const analyticsInterval = parseRequestInterval(
    getSearchValue(resolvedSearchParams, "analyticsInterval")
  );
  const analyticsRange = parseRequestRange(
    getSearchValue(resolvedSearchParams, "analyticsRange"),
    analyticsInterval
  );
  const rawRequestsPage = Number(getSearchValue(resolvedSearchParams, "requestsPage") ?? "1");
  const requestsPage = Number.isFinite(rawRequestsPage) ? rawRequestsPage : 1;
  const selectedApiKeyId = getSearchValue(resolvedSearchParams, "apiKey") ?? null;

  const data = await getDashboardData({
    requestsPage,
    requestsApiKeyId: selectedApiKeyId,
    analyticsApiKeyId: selectedApiKeyId,
    analyticsLookbackMs: parseRangeMs(analyticsRange),
  });

  if (!data) {
    redirect("/login");
  }

  const sidebarItems = pageNav.map((item) => ({
    label: item.label,
    href: buildDashboardHref({
      view: item.view,
      requestsPage: 1,
      apiKeyId: selectedApiKeyId,
      analyticsInterval,
      analyticsRange,
    }),
  }));
  const activeHref = buildDashboardHref({
    view,
    requestsPage: 1,
    apiKeyId: selectedApiKeyId,
    analyticsInterval,
    analyticsRange,
  });

  const { apiKeys, metrics, modelCatalogRows, requestFilters, requestPagination, requestQueueRows, analyticsRequests, user } =
    data;

  const walletMetric = metrics.find((metric) => metric.label === "Wallet Balance");
  const topupMetric = metrics.find((metric) => metric.label === "Total Top-Ups");
  const keyMetric = metrics.find((metric) => metric.label === "Active API Keys");
  const selectedApiKey =
    selectedApiKeyId !== null
      ? requestFilters.apiKeys.find((item) => item.id === selectedApiKeyId) ?? null
      : null;

  const trendSeries = buildRequestTrendSeries(analyticsRequests, analyticsInterval, analyticsRange);
  const filteredSpend = analyticsRequests.reduce((sum, row) => sum + row.costValue, 0);
  const filteredRequests = analyticsRequests.length;
  const successfulRequests = analyticsRequests.filter((row) => row.status === "succeeded").length;

  const overviewCards = [
    {
      title: "Wallet balance",
      value: walletMetric?.value ?? "$0.00",
      note: walletMetric?.change ?? "No wallet top-ups yet",
      icon: Wallet,
    },
    {
      title: "Total top-ups",
      value: topupMetric?.value ?? "$0.00",
      note: topupMetric?.change ?? "No recharge recorded",
      icon: ReceiptText,
    },
    {
      title: "Filtered spend",
      value: formatCurrency(filteredSpend),
      note: selectedApiKey ? `${selectedApiKey.name} in ${analyticsRange}` : `All keys in ${analyticsRange}`,
      icon: LineChart,
    },
    {
      title: "Filtered requests",
      value: filteredRequests,
      note: `${successfulRequests} succeeded in the selected window`,
      icon: KeyRound,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FCFCFA] text-[#111111]">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(243, 226, 201, 0.52), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,252,250,1) 46%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[360px] opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,24,39,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 sm:px-5 xl:px-0">
        <div className="mt-6 grid gap-5 xl:mt-8 xl:grid-cols-[220px_minmax(0,1fr)] xl:gap-6">
          <aside className="hidden xl:block">
            <DashboardSidebar items={sidebarItems} userLabel={user.email ?? user.name} activeHref={activeHref} />
          </aside>

          <aside className="xl:hidden">
            <DashboardMobileNav
              items={sidebarItems}
              userLabel={user.email ?? user.name}
              activeHref={activeHref}
            />
          </aside>

          <section className="min-h-[calc(100vh-108px)] min-w-0">
            <div className="mb-4 flex flex-col gap-3 md:mb-6 md:mt-2 md:flex-row md:items-center md:justify-between xl:mt-8">
              <div>
                <h1 className="text-3xl font-semibold leading-none tracking-[-0.05em] text-[#111111]">
                  {view === "dashboard" ? "Dashboard" : view === "models" ? "Models" : "API Keys"}
                </h1>
                <p className="mt-2 text-sm text-black/55">
                  {view === "dashboard"
                    ? "Overview, request analytics, and filtered request history."
                    : view === "models"
                      ? "Provider models currently enabled by your routing layer."
                      : "Create keys, control budgets, and manage active environments."}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
                <CreateKeyButton className="w-full justify-center sm:w-auto" />
                <form action="/auth/sign-out" method="post" className="w-full sm:w-auto">
                  <button
                    type="submit"
                    className="inline-flex h-9 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/80 transition-colors hover:bg-black/[0.03] sm:w-auto"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </div>

            {view === "dashboard" ? (
              <>
                <article className="mb-6 space-y-3 md:mb-8">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {overviewCards.map((card) => (
                      <MetricCard
                        key={card.title}
                        title={card.title}
                        value={card.value}
                        note={card.note}
                        icon={card.icon}
                      />
                    ))}
                  </div>
                </article>

                <section className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h2 className="text-xl font-semibold text-black">Request analytics</h2>
                        <p className="mt-1 text-sm text-black/55">
                          Requests and spend are combined here so you can inspect one API key at a time.
                        </p>
                      </div>
                      <div className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-2.5 text-xs text-black/80">
                        <span>{keyMetric?.value ?? apiKeys.length} active keys</span>
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                        <p className="text-[11px] tracking-[0.35px] text-black/45">API key filter</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link
                            href={buildDashboardHref({
                              view: "dashboard",
                              requestsPage: 1,
                              apiKeyId: null,
                              analyticsInterval,
                              analyticsRange,
                            })}
                            className={cn(
                              "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors",
                              selectedApiKeyId === null
                                ? "border-black bg-black text-white"
                                : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                            )}
                          >
                            All keys
                          </Link>
                          {requestFilters.apiKeys.map((item) => (
                            <Link
                              key={item.id}
                              href={buildDashboardHref({
                                view: "dashboard",
                                requestsPage: 1,
                                apiKeyId: item.id,
                                analyticsInterval,
                                analyticsRange,
                              })}
                              className={cn(
                                "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors",
                                selectedApiKeyId === item.id
                                  ? "border-black bg-black text-white"
                                  : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                              )}
                            >
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                        <p className="text-[11px] tracking-[0.35px] text-black/45">Time granularity</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {requestIntervalOptions.map((option) => (
                            <Link
                              key={option.value}
                              href={buildDashboardHref({
                                view: "dashboard",
                                requestsPage: 1,
                                apiKeyId: selectedApiKeyId,
                                analyticsInterval: option.value,
                                analyticsRange: parseRequestRange(undefined, option.value),
                              })}
                              className={cn(
                                "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors",
                                analyticsInterval === option.value
                                  ? "border-black bg-black text-white"
                                  : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                              )}
                            >
                              {option.label}
                            </Link>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                        <p className="text-[11px] tracking-[0.35px] text-black/45">Time range</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getRequestRangeOptions(analyticsInterval).map((option) => (
                            <Link
                              key={option.value}
                              href={buildDashboardHref({
                                view: "dashboard",
                                requestsPage: 1,
                                apiKeyId: selectedApiKeyId,
                                analyticsInterval,
                                analyticsRange: option.value,
                              })}
                              className={cn(
                                "inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors",
                                analyticsRange === option.value
                                  ? "border-black bg-black text-white"
                                  : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                              )}
                            >
                              {option.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                    <CircleAlert className="size-3.5 shrink-0 text-amber-600" />
                    <p className="text-xs leading-[1.35] text-amber-900/70">
                      Your outputs are stored for 7 days only. Download anything you need to keep.
                    </p>
                  </div>

                  {analyticsRequests.length > 0 ? (
                    <div className="grid gap-4 xl:grid-cols-2">
                      <TrendChartCard
                        title="Request count"
                        points={trendSeries.requestPoints}
                        labels={trendSeries.labels}
                        valueLabel={`${filteredRequests} requests in the selected window`}
                      />
                      <TrendChartCard
                        title="Spend"
                        points={trendSeries.spendPoints}
                        labels={trendSeries.labels}
                        valueLabel={`${formatCurrency(filteredSpend)} billed in the selected window`}
                      />
                    </div>
                  ) : (
                    <EmptyState
                      title="No requests in the selected window"
                      detail="Try a broader time range or switch back to all API keys."
                    />
                  )}

                  <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-black">Request list</h3>
                      <p className="mt-1 text-sm text-black/55">
                        Filtered request history with pagination and API key context.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-2.5 text-xs text-black/80">
                        <span>{requestPagination.total} total</span>
                      </div>
                      <div className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-2.5 text-xs text-black/80">
                        <span>10 per page</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 md:hidden">
                    {requestQueueRows.length > 0 ? (
                      requestQueueRows.map((row) => (
                        <article
                          key={row.requestId}
                          className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-black">{row.model}</p>
                              <p className="mt-1 text-xs text-black/45">{row.apiKeyName}</p>
                              <p className="mt-1 text-xs text-black/50">{row.requestId}</p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2 py-1 text-[10px] font-medium uppercase",
                                requestStatusStyles[row.status]
                              )}
                            >
                              {row.status}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-black/70">
                            <div>Time: {row.createdAtLabel}</div>
                            <div>Provider: {row.provider}</div>
                            <div>Latency: {row.latency}</div>
                            <div>Cost: {row.cost}</div>
                          </div>
                        </article>
                      ))
                    ) : (
                      <EmptyState
                        title="No requests found"
                        detail="No routed requests match the current API key filter."
                      />
                    )}
                  </div>

                  <div className="mt-4 hidden md:block">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead>
                          <tr className="border-b border-black/10 text-left">
                            {["Time", "Output", "API Key", "ID", "Provider", "Status", "Latency", "Cost"].map(
                              (heading) => (
                                <th
                                  key={heading}
                                  className="h-10 px-2 text-[10px] tracking-[1px] text-black/50"
                                >
                                  {heading}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {requestQueueRows.length > 0 ? (
                            requestQueueRows.map((row) => (
                              <tr
                                key={row.requestId}
                                className="border-b border-black/10 transition-colors hover:bg-black/[0.02]"
                              >
                                <td className="px-2 py-3 text-xs text-black/60">{row.createdAtLabel}</td>
                                <td className="px-2 py-3 align-middle">
                                  <div>
                                    <p className="text-sm text-black">{row.model}</p>
                                    <p className="text-xs text-black/45">{row.capability}</p>
                                  </div>
                                </td>
                                <td className="px-2 py-3 text-sm text-black">{row.apiKeyName}</td>
                                <td className="px-2 py-3 text-xs text-black/60">{row.requestId}</td>
                                <td className="px-2 py-3 text-sm text-black">{row.provider}</td>
                                <td className="px-2 py-3">
                                  <span
                                    className={cn(
                                      "rounded-full px-2 py-1 text-[10px] font-medium uppercase",
                                      requestStatusStyles[row.status]
                                    )}
                                  >
                                    {row.status}
                                  </span>
                                </td>
                                <td className="px-2 py-3 text-sm text-black/70">{row.latency}</td>
                                <td className="px-2 py-3 text-sm text-black/70">{row.cost}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="px-2 py-20 text-center text-sm text-black/50" colSpan={8}>
                                No requests found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {requestPagination.totalPages > 1 ? (
                    <div className="mt-4 flex flex-col gap-3 border-t border-black/10 px-1 py-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-2">
                        <Link
                          href={buildDashboardHref({
                            view: "dashboard",
                            requestsPage: Math.max(1, requestPagination.page - 1),
                            apiKeyId: selectedApiKeyId,
                            analyticsInterval,
                            analyticsRange,
                          })}
                          aria-disabled={requestPagination.page <= 1}
                          className={cn(
                            "inline-flex h-8 items-center rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/70 transition-colors hover:bg-black/[0.03]",
                            requestPagination.page <= 1 && "pointer-events-none opacity-40"
                          )}
                        >
                          Previous
                        </Link>
                        <div className="flex items-center gap-2">
                          {buildVisibleRequestPages(requestPagination.page, requestPagination.totalPages).map(
                            (page, index, pages) => (
                              <div key={page} className="flex items-center gap-2">
                                {index > 0 && page - pages[index - 1] > 1 ? (
                                  <span className="text-xs text-black/35">…</span>
                                ) : null}
                                <Link
                                  href={buildDashboardHref({
                                    view: "dashboard",
                                    requestsPage: page,
                                    apiKeyId: selectedApiKeyId,
                                    analyticsInterval,
                                    analyticsRange,
                                  })}
                                  className={cn(
                                    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors",
                                    page === requestPagination.page
                                      ? "border-black bg-black text-white"
                                      : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]"
                                  )}
                                >
                                  {page}
                                </Link>
                              </div>
                            )
                          )}
                        </div>
                        <Link
                          href={buildDashboardHref({
                            view: "dashboard",
                            requestsPage: Math.min(requestPagination.totalPages, requestPagination.page + 1),
                            apiKeyId: selectedApiKeyId,
                            analyticsInterval,
                            analyticsRange,
                          })}
                          aria-disabled={requestPagination.page >= requestPagination.totalPages}
                          className={cn(
                            "inline-flex h-8 items-center rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/70 transition-colors hover:bg-black/[0.03]",
                            requestPagination.page >= requestPagination.totalPages &&
                              "pointer-events-none opacity-40"
                          )}
                        >
                          Next
                        </Link>
                      </div>
                      <span className="text-xs text-black/50">
                        Page {requestPagination.page} of {requestPagination.totalPages}
                      </span>
                    </div>
                  ) : null}
                </section>
              </>
            ) : null}

            {view === "models" ? (
              <section className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h2 className="text-xl font-semibold text-black">Model catalog</h2>
                  <div className="max-w-2xl">
                    <p className="text-sm text-black/55">
                      One compact row per routed model. Expand a row to inspect primary and fallback routing details.
                    </p>
                    <p className="mt-2 text-xs text-black/40 md:hidden">
                      Mobile view switches to stacked cards for easier scanning.
                    </p>
                  </div>
                </div>
                <ModelCatalogTable rows={modelCatalogRows} />
              </section>
            ) : null}

            {view === "api-keys" ? (
              <>
                <section className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-black">API Keys</h2>
                      <p className="mt-1 text-sm text-black/55">
                        Create keys, control budgets, and manage active environments.
                      </p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-black/[0.08] bg-[#FCFCFA] px-3 py-1.5 text-xs text-black/55 md:hidden">
                      <KeyRound className="size-4 text-black/45" />
                      <span>{keyMetric?.value ?? apiKeys.length} active</span>
                    </div>
                    <div className="hidden items-center gap-2 md:flex">
                      <KeyRound className="size-4 text-black/45" />
                      <span className="text-xs text-black/55">
                        {keyMetric?.value ?? apiKeys.length} active
                      </span>
                    </div>
                  </div>

                  <ApiKeysTable apiKeys={apiKeys} />
                </section>

                <section className="mt-6">
                  <ApiQuickstartCard />
                </section>
              </>
            ) : null}
          </section>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}
