import { redirect } from "next/navigation";
import Link from "next/link";
import {
  LineChart,
  ReceiptText,
  UserRound,
} from "lucide-react";
import { MarketingHeader } from "@/components/marketing/site-chrome";
import { ProductTopTabs } from "@/components/marketing/product-top-tabs";
import { getDashboardData } from "@/lib/dashboard-server";
import { formatI18n, getI18n } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { cn } from "@/lib/utils";
import { CreateKeyButton } from "./dashboard-actions";
import { ApiKeysTable } from "./api-keys-table";
import { TopUpForm } from "./top-up-form";
import { AutoRefreshOnReturn } from "./auto-refresh-on-return";
import { TopUpCelebration } from "./top-up-celebration";
import { AccountPasswordForm } from "./account-password-form";
import { ExplorePanel } from "./explore-panel";
import { buildModelCanonicalPath, loadModelsPageData } from "@/app/(marketing)/models/data";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type DashboardView =
  | "dashboard"
  | "explore"
  | "request-details"
  | "api-keys"
  | "account";
type RequestInterval = "minute" | "hour" | "day";
type RequestRange = "60m" | "6h" | "24h" | "7d" | "30d" | "90d";
type ModelType = "image" | "video" | "text-coding";
const pageNav = [
  { view: "dashboard" },
  { view: "explore" },
  { view: "api-keys" },
  { view: "request-details" },
  { view: "account" },
] as const;

const requestStatusStyles = {
  queued: "bg-[#f4efe3] text-[#7b6226]",
  processing: "bg-[#e8f0ff] text-[#355fb4]",
  succeeded: "bg-[#e4f7e8] text-[#1b7a41]",
  failed: "bg-[#ffe7e3] text-[#b54432]",
  cancelled: "bg-[#ececec] text-[#666666]",
};

const activePillClassName = "border-[#38BDF8] bg-[#E0F2FE] text-[#0369A1]";
const inactivePillClassName =
  "border-[#BAE6FD] bg-white text-[#075985] hover:bg-[#E0F2FE] hover:text-[#111827]";

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
    : "minute";
}

function parseRequestRange(value: string | undefined, interval: RequestInterval): RequestRange {
  const validValues = getRequestRangeOptions(interval).map((option) => option.value);
  return validValues.includes(value as RequestRange) ? (value as RequestRange) : validValues[0];
}

function parseModelType(value: string | undefined): ModelType {
  const allowed: ModelType[] = ["image", "video", "text-coding"];
  return allowed.includes(value as ModelType) ? (value as ModelType) : "image";
}

function parseModelSlug(value: string | undefined): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function buildDashboardHref(input: {
  view: DashboardView;
  requestsPage?: number;
  billingPage?: number;
  apiKeyId?: string | null;
  analyticsInterval: RequestInterval;
  analyticsRange: RequestRange;
  modelType?: ModelType;
  modelSlug?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("view", input.view);
  params.set("requestsPage", String(input.requestsPage ?? 1));
  params.set("billingPage", String(input.billingPage ?? 1));
  params.set("analyticsInterval", input.analyticsInterval);
  params.set("analyticsRange", input.analyticsRange);
  if (input.modelType) {
    params.set("modelType", input.modelType);
  }
  if (input.modelSlug) {
    params.set("modelSlug", input.modelSlug);
  }
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

function MetricCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-[#BAE6FD] bg-white px-4 py-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0284C7]">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.35px] text-black/60">{title}</p>
          <p className="mt-1 text-2xl font-medium tracking-tight text-black">{value}</p>
          {note ? <p className="mt-2 text-xs leading-5 text-black/50">{note}</p> : null}
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
    <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#F8FCFF] px-4 py-8">
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
  const locale = await getLocale();
  const copy = getI18n(locale);
  const dashboardCopy = copy.dashboard;
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
  const rawBillingPage = Number(getSearchValue(resolvedSearchParams, "billingPage") ?? "1");
  const billingPage = Number.isFinite(rawBillingPage) ? Math.max(1, Math.floor(rawBillingPage)) : 1;
  const selectedApiKeyId = null;
  const selectedModelType = parseModelType(getSearchValue(resolvedSearchParams, "modelType"));
  const selectedModelSlug = parseModelSlug(getSearchValue(resolvedSearchParams, "modelSlug"));
  const data = await getDashboardData({
    requestsPage,
    billingPage,
    analyticsLookbackMs: parseRangeMs(analyticsRange),
  });

  if (!data && view !== "explore") {
    redirect(`/login?next=${encodeURIComponent(`/dashboard?view=${view}`)}`);
  }

  const { apiKeys, metrics, requestPagination, billingPagination, requestQueueRows, analyticsRequests, billingRows, user } =
    data ?? {
      apiKeys: [],
      metrics: [],
      requestPagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      billingPagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      requestQueueRows: [],
      analyticsRequests: [],
      billingRows: [],
      user: {
        id: "",
        email: null,
        name: "OpenOctopus User",
        avatarUrl: null,
        authProviders: [],
        hasPasswordSignIn: false,
      },
    };
  const exploreData = await loadModelsPageData().catch(() => ({
    modelDocRows: [],
    vendorOptions: [],
  }));

  const walletMetric = metrics.find((metric) => metric.label === "Wallet Balance");
  const topupMetric = metrics.find((metric) => metric.label === "Total Top-Ups");
  const filteredSpend = analyticsRequests.reduce((sum, row) => sum + row.costValue, 0);
  const billingRowsPage = billingRows;
  const billingTotalPages = billingPagination.totalPages;
  const normalizedBillingPage = Math.min(billingPagination.page, billingTotalPages);

  const overviewCards = [
    {
      title: dashboardCopy.overview.totalTopups,
      value: topupMetric?.value ?? "$0.00",
      note: topupMetric?.change ?? dashboardCopy.overview.noRecharge,
      icon: ReceiptText,
    },
    {
      title: dashboardCopy.overview.spendInView,
      value: formatCurrency(filteredSpend),
      icon: LineChart,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F8FCFF] text-[#111111]">
      <AutoRefreshOnReturn />
      <TopUpCelebration labels={dashboardCopy.topUpCelebration} />
      <MarketingHeader
        isLoggedIn={!!data}
        userLabel={user.email ?? user.name}
        userAvatarUrl={user.avatarUrl ?? null}
        walletBalanceLabel={walletMetric?.value ?? "$0.00"}
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-5 xl:px-0">
        <ProductTopTabs
          isLoggedIn={!!data}
          dashboardHref={buildDashboardHref({
            view: "dashboard",
            requestsPage: 1,
            apiKeyId: selectedApiKeyId,
          analyticsInterval,
          analyticsRange,
          modelType: selectedModelType,
          modelSlug: selectedModelSlug,
        })}
          exploreHref={buildDashboardHref({
            view: "explore",
            requestsPage: 1,
            apiKeyId: selectedApiKeyId,
            analyticsInterval,
            analyticsRange,
            modelType: selectedModelType,
            modelSlug: selectedModelSlug,
          })}
          modelsHref="/models"
          apiKeysHref={buildDashboardHref({
            view: "api-keys",
            requestsPage: 1,
            apiKeyId: selectedApiKeyId,
          analyticsInterval,
          analyticsRange,
          modelType: selectedModelType,
          modelSlug: selectedModelSlug,
        })}
          requestDetailsHref={buildDashboardHref({
            view: "request-details",
            requestsPage: 1,
            apiKeyId: selectedApiKeyId,
          analyticsInterval,
          analyticsRange,
          modelType: selectedModelType,
          modelSlug: selectedModelSlug,
        })}
          accountHref={buildDashboardHref({
            view: "account",
            requestsPage: 1,
            apiKeyId: selectedApiKeyId,
          analyticsInterval,
          analyticsRange,
          modelType: selectedModelType,
            modelSlug: selectedModelSlug,
          })}
          labels={{
            dashboard: copy.nav.dashboard,
            explore: copy.nav.explore,
            models: copy.nav.models,
            apiKeys: dashboardCopy.tabs.apiKeys,
            requestDetails: dashboardCopy.tabs.requestDetails,
            account: dashboardCopy.tabs.account,
          }}
        />
        <div className="mt-2 xl:mt-4">
          <section className="min-h-[calc(100vh-108px)] min-w-0">
            {view === "dashboard" ? (
              <>
                <article className="mb-6 space-y-3 md:mb-8">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div>
                      <TopUpForm balanceLabel={walletMetric?.value ?? "$0.00"} labels={dashboardCopy.wallet} />
                    </div>
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
              </>
            ) : null}

            {view === "request-details" ? (
              <section className="p-0">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-black">{dashboardCopy.requests.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-2.5 text-xs text-black/80">
                        <span>{formatI18n(dashboardCopy.requests.total, { count: requestPagination.total })}</span>
                      </div>
                      <div className="inline-flex h-8 items-center gap-2 rounded-md border border-black/[0.08] bg-white px-2.5 text-xs text-black/80">
                        <span>{formatI18n(dashboardCopy.requests.perPage, { count: requestPagination.pageSize })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 md:hidden">
                    {requestQueueRows.length > 0 ? (
                      requestQueueRows.map((row) => (
                        <article
                          key={row.requestId}
                          className="rounded-2xl border border-black/[0.08] bg-[#F8FCFF] p-3 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-black">{row.model}</p>
                              <p className="mt-1 text-xs text-black/45">{row.requestSourceLabel}</p>
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
                            <div>{dashboardCopy.requests.time}: {row.createdAtLabel}</div>
                            <div>{dashboardCopy.requests.vendor}: {row.vendor}</div>
                            <div>{dashboardCopy.requests.latency}: {row.latency}</div>
                            <div>{dashboardCopy.requests.cost}: {row.cost}</div>
                          </div>
                          {row.outputAssets.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {row.outputAssets.slice(0, 3).map((asset, index) => (
                                <a
                                  key={`${row.requestId}-${index}`}
                                  href={asset.url}
                                  download
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group block overflow-hidden rounded-md border border-black/[0.08] bg-white"
                                >
                                  {asset.type === "image" ? (
                                    <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={asset.url}
                                      alt={`Generated output ${index + 1}`}
                                      className="size-20 object-cover transition-opacity group-hover:opacity-85"
                                    />
                                    </>
                                  ) : (
                                    <div className="flex size-20 items-center justify-center text-[11px] text-black/50">
                                      {dashboardCopy.requests.download}
                                    </div>
                                  )}
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      ))
                    ) : (
                      <EmptyState
                        title={dashboardCopy.requests.emptyTitle}
                        detail={dashboardCopy.requests.emptyDetail}
                      />
                    )}
                  </div>

                  <div className="mt-4 hidden md:block">
                    <div className="relative w-full overflow-auto">
                      <table className="w-full min-w-[860px] text-sm">
                        <thead>
                          <tr className="border-b border-black/10 text-left">
                            {[
                              dashboardCopy.requests.time,
                              dashboardCopy.requests.output,
                              dashboardCopy.requests.source,
                              dashboardCopy.requests.id,
                              dashboardCopy.requests.vendor,
                              dashboardCopy.requests.status,
                              dashboardCopy.requests.latency,
                              dashboardCopy.requests.cost,
                            ].map(
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
                                  <div className="flex items-center gap-3">
                                    {row.outputAssets.length > 0 ? (
                                      <div className="flex shrink-0 gap-1">
                                        {row.outputAssets.slice(0, 2).map((asset, index) => (
                                          <a
                                            key={`${row.requestId}-${index}`}
                                            href={asset.url}
                                            download
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group block overflow-hidden rounded-md border border-black/[0.08] bg-white"
                                            title={dashboardCopy.requests.openAsset}
                                          >
                                            {asset.type === "image" ? (
                                              <>
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={asset.url}
                                                alt={`Generated output ${index + 1}`}
                                                className="size-12 object-cover transition-opacity group-hover:opacity-85"
                                              />
                                              </>
                                            ) : (
                                              <div className="flex size-12 items-center justify-center text-[10px] text-black/45">
                                                {dashboardCopy.requests.file}
                                              </div>
                                            )}
                                          </a>
                                        ))}
                                      </div>
                                    ) : null}
                                  <div className="min-w-0">
                                    <p className="text-sm text-black">{row.model}</p>
                                    <p className="text-xs text-black/45">{row.capability}</p>
                                  </div>
                                  </div>
                                </td>
                                <td className="px-2 py-3 text-sm text-black">{row.requestSourceLabel}</td>
                                <td className="px-2 py-3 text-xs text-black/60">{row.requestId}</td>
                                <td className="px-2 py-3 text-sm text-black">{row.vendor}</td>
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
                                {dashboardCopy.requests.emptyTitle}
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
                            view: "request-details",
                            requestsPage: Math.max(1, requestPagination.page - 1),
                            apiKeyId: selectedApiKeyId,
                            analyticsInterval,
                            analyticsRange,
                          })}
                          aria-disabled={requestPagination.page <= 1}
                          className={cn(
                            "inline-flex h-8 items-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]",
                            requestPagination.page <= 1 && "pointer-events-none opacity-40"
                          )}
                        >
                          {dashboardCopy.requests.previous}
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
                                    view: "request-details",
                                    requestsPage: page,
                                    apiKeyId: selectedApiKeyId,
                                    analyticsInterval,
                                    analyticsRange,
                                  })}
                                  className={cn(
                                    "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors",
                                    page === requestPagination.page
                                      ? activePillClassName
                                      : inactivePillClassName
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
                            view: "request-details",
                            requestsPage: Math.min(requestPagination.totalPages, requestPagination.page + 1),
                            apiKeyId: selectedApiKeyId,
                            analyticsInterval,
                            analyticsRange,
                          })}
                          aria-disabled={requestPagination.page >= requestPagination.totalPages}
                          className={cn(
                            "inline-flex h-8 items-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]",
                            requestPagination.page >= requestPagination.totalPages &&
                              "pointer-events-none opacity-40"
                          )}
                        >
                          {dashboardCopy.requests.next}
                        </Link>
                      </div>
                      <span className="text-xs text-black/50">
                        {formatI18n(dashboardCopy.requests.page, {
                          page: requestPagination.page,
                          total: requestPagination.totalPages,
                        })}
                      </span>
                    </div>
                  ) : null}
                </section>
            ) : null}

            {view === "explore" ? (
              <ExplorePanel
                isLoggedIn={!!data}
                labels={dashboardCopy.explore}
                models={exploreData.modelDocRows.map((model) => ({
                  id: model.id,
                  displayName: model.displayName,
                  providerName: model.providerName,
                  capability: model.capability,
                  modelTypeLabel: model.modelTypeLabel,
                  modelDescription: model.modelDescription,
                  priceLabel: model.priceLabel,
                  coverImageUrl: model.coverImageUrl,
                  modelHref: buildModelCanonicalPath(model),
                }))}
              />
            ) : null}

            {view === "dashboard" ? (
              <section className="p-0">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-black">{dashboardCopy.billing.title}</h2>
                  <p className="mt-1 text-sm text-black/55">
                    {dashboardCopy.billing.description}
                  </p>
                </div>
                <div className="relative w-full overflow-auto">
                  <table className="w-full min-w-[860px] text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-left">
                        {[
                          dashboardCopy.requests.time,
                          dashboardCopy.billing.type,
                          dashboardCopy.billing.amount,
                          dashboardCopy.billing.descriptionColumn,
                          dashboardCopy.billing.operation,
                        ].map(
                          (heading) => (
                            <th
                              key={heading}
                              className={cn(
                                "h-10 px-2 text-[10px] tracking-[1px] text-black/50",
                                heading === dashboardCopy.billing.operation
                                  ? "sticky right-0 z-20 bg-white text-right"
                                  : ""
                              )}
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {billingRowsPage.length > 0 ? (
                        billingRowsPage.map((row) => (
                          <tr
                            key={row.id}
                            className="border-b border-black/10 transition-colors hover:bg-black/[0.02]"
                          >
                            <td className="whitespace-nowrap px-2 py-3 text-xs text-black/60">
                              {row.createdAtLabel}
                            </td>
                            <td className="px-2 py-3 text-sm text-black">{row.typeLabel}</td>
                            <td className="px-2 py-3 text-sm text-black/70">{row.amountLabel}</td>
                            <td className="max-w-[360px] whitespace-normal break-words px-2 py-3 text-sm text-black/70">
                              {row.description}
                            </td>
                            <td className="sticky right-0 z-10 bg-white px-2 py-3 text-right text-sm">
                              <div className="flex items-center justify-end gap-2">
                                {row.invoiceUrl || row.receiptUrl ? (
                                  <a
                                    href={row.invoiceUrl ?? row.receiptUrl ?? "#"}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 items-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]"
                                  >
                                    {dashboardCopy.billing.openDocument}
                                  </a>
                                ) : (
                                  <span
                                    title={dashboardCopy.billing.unavailableTitle}
                                    className="inline-flex h-8 items-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#64748B]"
                                  >
                                    {dashboardCopy.billing.unavailable}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-2 py-20 text-center text-sm text-black/50" colSpan={5}>
                            {dashboardCopy.billing.empty}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {billingTotalPages > 1 ? (
                  <div className="mt-4 flex flex-col gap-3 border-t border-black/10 px-1 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-2">
                      <Link
                        href={buildDashboardHref({
                          view: "dashboard",
                          requestsPage: 1,
                          billingPage: Math.max(1, normalizedBillingPage - 1),
                          apiKeyId: selectedApiKeyId,
                          analyticsInterval,
                          analyticsRange,
                          modelType: selectedModelType,
                          modelSlug: selectedModelSlug,
                        })}
                        aria-disabled={normalizedBillingPage <= 1}
                        className={cn(
                          "inline-flex h-8 items-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]",
                          normalizedBillingPage <= 1 && "pointer-events-none opacity-40"
                        )}
                      >
                        {dashboardCopy.requests.previous}
                      </Link>
                      <div className="flex items-center gap-2">
                        {buildVisibleRequestPages(normalizedBillingPage, billingTotalPages).map(
                          (page, index, pages) => (
                            <div key={page} className="flex items-center gap-2">
                              {index > 0 && page - pages[index - 1] > 1 ? (
                                <span className="text-xs text-black/35">…</span>
                              ) : null}
                              <Link
                                href={buildDashboardHref({
                                  view: "dashboard",
                                  requestsPage: 1,
                                  billingPage: page,
                                  apiKeyId: selectedApiKeyId,
                                  analyticsInterval,
                                  analyticsRange,
                                  modelType: selectedModelType,
                                  modelSlug: selectedModelSlug,
                                })}
                                className={cn(
                                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors",
                                  page === normalizedBillingPage
                                    ? activePillClassName
                                    : inactivePillClassName
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
                          requestsPage: 1,
                          billingPage: Math.min(billingTotalPages, normalizedBillingPage + 1),
                          apiKeyId: selectedApiKeyId,
                          analyticsInterval,
                          analyticsRange,
                          modelType: selectedModelType,
                          modelSlug: selectedModelSlug,
                        })}
                        aria-disabled={normalizedBillingPage >= billingTotalPages}
                        className={cn(
                          "inline-flex h-8 items-center rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-[#075985] transition-colors hover:bg-[#E0F2FE]",
                          normalizedBillingPage >= billingTotalPages &&
                            "pointer-events-none opacity-40"
                        )}
                      >
                        {dashboardCopy.requests.next}
                      </Link>
                    </div>
                    <span className="text-xs text-black/50">
                      {formatI18n(dashboardCopy.requests.page, {
                        page: normalizedBillingPage,
                        total: billingTotalPages,
                      })}
                    </span>
                  </div>
                ) : null}
              </section>
            ) : null}

            {view === "api-keys" ? (
              <>
                <section className="p-0">
                  <div className="mb-4 flex items-center">
                    <CreateKeyButton
                      className="w-full justify-center sm:w-auto"
                      labels={{
                        unavailable: dashboardCopy.createKey.unavailable,
                        button: dashboardCopy.createKey.button,
                      }}
                      sheetLabels={dashboardCopy.createKey}
                    />
                  </div>

                  <ApiKeysTable apiKeys={apiKeys} labels={dashboardCopy.apiKeys} />
                </section>
              </>
            ) : null}

            {view === "account" ? (
              <section className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                <div className="rounded-xl border border-black/[0.08] bg-white p-5">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full border border-black/[0.08] bg-[#E0F2FE] text-[#0369A1]">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                      ) : (
                        <UserRound className="size-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-black">{user.name}</p>
                      <p className="truncate text-sm text-black/55">{user.email ?? dashboardCopy.account.noEmail}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="rounded-lg border border-black/[0.06] bg-[#F8FCFF] px-3 py-2">
                      <p className="text-xs text-black/45">{dashboardCopy.account.signInMethods}</p>
                      <p className="mt-1 text-black">
                        {Array.from(new Set([...user.authProviders, ...(user.hasPasswordSignIn ? ["email"] : [])])).length > 0
                          ? Array.from(new Set([...user.authProviders, ...(user.hasPasswordSignIn ? ["email"] : [])]))
                              .map((provider) => provider === "email" ? dashboardCopy.account.emailPassword : provider)
                              .join(", ")
                          : dashboardCopy.account.google}
                      </p>
                    </div>
                    <div className="rounded-lg border border-black/[0.06] bg-[#F8FCFF] px-3 py-2">
                      <p className="text-xs text-black/45">{dashboardCopy.account.passwordSignIn}</p>
                      <p className="mt-1 text-black">
                        {user.hasPasswordSignIn ? dashboardCopy.account.enabled : dashboardCopy.account.notSet}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-black/[0.08] bg-white p-5">
                  <div className="mb-4">
                    <h2 className="text-base font-semibold text-black">
                      {user.hasPasswordSignIn ? dashboardCopy.account.updatePassword : dashboardCopy.account.setPassword}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-black/55">
                      {user.hasPasswordSignIn
                        ? dashboardCopy.account.updatePasswordHelp
                        : dashboardCopy.account.setPasswordHelp}
                    </p>
                  </div>
                  <AccountPasswordForm hasPassword={user.hasPasswordSignIn} labels={dashboardCopy.account} />
                </div>
              </section>
            ) : null}

          </section>
        </div>
      </div>
    </main>
  );
}
