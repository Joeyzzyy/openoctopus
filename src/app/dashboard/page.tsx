import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CircleAlert,
  KeyRound,
  LogOut,
  ReceiptText,
  Wallet,
} from "lucide-react";
import { Toaster } from "sonner";
import { getDashboardData } from "@/lib/dashboard-server";
import { cn } from "@/lib/utils";
import { CreateKeyButton } from "./dashboard-actions";
import { DashboardSidebar } from "./dashboard-sidebar";
import { ApiKeysTable } from "./api-keys-table";
import { ApiQuickstartCard } from "./api-quickstart-card";

const topNav = [
  { label: "Dashboard", href: "#overview", active: true },
  { label: "Models", href: "#models" },
  { label: "API Keys", href: "#keys" },
  { label: "Requests", href: "#requests" },
] as const;

const requestStatusStyles = {
  queued: "bg-[#f4efe3] text-[#7b6226]",
  processing: "bg-[#e8f0ff] text-[#355fb4]",
  succeeded: "bg-[#e4f7e8] text-[#1b7a41]",
  failed: "bg-[#ffe7e3] text-[#b54432]",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function buildRequestsPageHref(page: number) {
  const params = new URLSearchParams();
  params.set("requestsPage", String(page));
  return `/dashboard?${params.toString()}#requests`;
}

function buildVisibleRequestPages(currentPage: number, totalPages: number) {
  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);

  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

function ProviderLogo({
  name,
  kind,
}: {
  name: string;
  kind: string;
}) {
  const isGoogle = name.toLowerCase().includes("google") || name.toLowerCase().includes("gemini");
  const label = isGoogle ? "G" : name.slice(0, 2).toUpperCase();

  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-sm border text-sm font-semibold",
        isGoogle
          ? "border-[#4285f4]/25 bg-white text-[#4285f4]"
          : kind === "wavespeed"
            ? "border-[#1f5f39]/20 bg-[#edf6ef] text-[#1f5f39]"
            : "border-black/10 bg-[#f4f5f0] text-black/65"
      )}
      aria-label={`${name} provider`}
    >
      {label}
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const requestsPage = Number(getSearchValue(resolvedSearchParams, "requestsPage") ?? "1");
  const data = await getDashboardData({
    requestsPage: Number.isFinite(requestsPage) ? requestsPage : 1,
  });

  if (!data) {
    redirect("/login");
  }

  const { apiKeys, metrics, requestPagination, requestQueueRows, routingRules, usageRows, user } = data;

  const walletMetric = metrics.find((metric) => metric.label === "Wallet Balance");
  const topupMetric = metrics.find((metric) => metric.label === "Total Top-Ups");
  const spendMetric = metrics.find((metric) => metric.label === "Month Spend");
  const keyMetric = metrics.find((metric) => metric.label === "Active API Keys");

  const modelsUsed = new Set(
    [...requestQueueRows.map((row) => row.model), ...usageRows.map((row) => row.model)].filter(Boolean)
  ).size;

  const latestModels = routingRules.slice(0, 8).map((rule, index) => ({
    id: `${rule.publicModel}-${rule.upstreamModelSlug}`,
    name: rule.upstreamModelSlug,
    slug: rule.publicModel,
    providerName: rule.providerName,
    providerKind: rule.providerKind,
    capability: rule.capability,
    tone: index % 4,
  }));

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
      title: "Month spend",
      value: spendMetric?.value ?? "$0.00",
      note: spendMetric?.change ?? "No usage recorded",
      icon: KeyRound,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f6f1] text-[#111111]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(202,232,207,0.52),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,224,194,0.4),transparent_26%),linear-gradient(180deg,#fbfaf5_0%,#f4f3ee_46%,#efeee7_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,rgba(221,229,215,0.55),transparent_56%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 xl:px-0">
        <div className="mt-8 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="hidden xl:block">
            <DashboardSidebar items={topNav} userLabel={user.email ?? user.name} />
          </aside>

          <section className="min-h-[calc(100vh-108px)]">
          <div
            id="overview"
            className="mb-4 mt-4 flex flex-col gap-3 md:mb-6 md:mt-8 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h1 className="text-3xl font-semibold leading-none text-[#111111]">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-black/55">Usage, keys, and recent requests.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <CreateKeyButton />
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80 transition-colors hover:bg-black/[0.03]"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <article className="mb-6 space-y-3 md:mb-8">
            <div className="grid gap-3 md:grid-cols-3">
              {overviewCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.title}
                    className="rounded-sm border border-black/8 bg-[#f7f7f4] px-4 py-4 shadow-[0_18px_40px_rgba(17,17,17,0.03)]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-white text-black/55">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] tracking-[0.35px] text-black/60">
                          {card.title}
                        </p>
                        <p className="mt-1 text-2xl font-medium tracking-tight text-black">
                          {card.value}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-black/50">
                          {card.note}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <section
            id="models"
            className="rounded-sm border border-black/10 bg-white"
            aria-labelledby="latest-models-heading"
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <div>
                <h2 id="latest-models-heading" className="text-xl font-semibold text-black">
                  Model catalog
                </h2>
                <p className="mt-1 text-sm text-black/55">
                  Provider models currently enabled by your routing layer.
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 p-4 md:grid-cols-2">
              {latestModels.map((model) => (
                <div
                  key={model.id}
                  className="flex cursor-pointer gap-3 rounded-sm border border-black/10 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-black/15 hover:shadow-md"
                >
                  <ProviderLogo name={model.providerName} kind={model.providerKind} />
                  <div className="min-w-0 flex flex-col justify-center">
                    <p className="break-all font-mono text-sm text-black">{model.name}</p>
                    <p className="mt-0.5 text-xs leading-tight text-black/50">
                      {model.providerName} · {model.capability}
                    </p>
                    <p className="mt-1 break-all text-[11px] leading-tight text-black/38">
                      public: {model.slug}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="quickstart" className="mt-6">
            <ApiQuickstartCard />
          </section>

          <section id="keys" className="mt-6 rounded-sm border border-black/10 bg-white p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-black">API Keys</h2>
                <p className="mt-1 text-sm text-black/55">
                  Create keys, control budgets, and manage active environments.
                </p>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <KeyRound className="size-4 text-black/45" />
                <span className="text-xs text-black/55">{keyMetric?.value ?? apiKeys.length} active</span>
              </div>
            </div>

            <ApiKeysTable apiKeys={apiKeys} />
          </section>

          <section id="requests" className="mt-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-black">Requests</h2>
                <p className="mt-1 text-sm text-black/55">
                  All routed requests and task states, 10 per page.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex h-8 items-center gap-2 rounded-sm border border-black/10 bg-white px-2.5 text-xs text-black/80">
                  <span>{requestPagination.total} total</span>
                </div>
                <div className="inline-flex h-8 items-center gap-2 rounded-sm border border-black/10 bg-white px-2.5 text-xs text-black/80">
                  <span>10 per page</span>
                </div>
                <div className="inline-flex h-8 items-center gap-2 rounded-sm border border-black/10 bg-white px-2.5 text-xs text-black/80">
                  <span>{modelsUsed} models used</span>
                </div>
              </div>
            </div>

            <div className="rounded-sm border border-black/10 bg-white">
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-2.5">
                <CircleAlert className="size-3.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-[1.35] text-amber-900/70">
                  Your outputs are stored for 7 days only. Download anything you
                  need to keep.
                </p>
              </div>

              <div className="space-y-2 p-2 md:hidden">
                {requestQueueRows.length > 0 ? (
                  requestQueueRows.map((row) => (
                    <article
                      key={row.requestId}
                      className="rounded-sm border border-black/10 bg-[#fafaf8] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-black">
                            {row.model}
                          </p>
                          <p className="mt-1 text-xs text-black/50">
                            {row.requestId}
                          </p>
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
                        <div>Provider: {row.provider}</div>
                        <div>Latency: {row.latency}</div>
                        <div>Cost: {row.cost}</div>
                        <div>Type: {row.capability}</div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-sm border border-black/10 bg-[#fafaf8] px-4 py-10 text-center text-sm text-black/50">
                    No predictions found
                  </div>
                )}
              </div>

              <div className="hidden md:block">
                <div className="relative w-full overflow-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-left">
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Output
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          ID
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Provider
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Status
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Latency
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestQueueRows.length > 0 ? (
                        requestQueueRows.map((row) => (
                          <tr
                            key={row.requestId}
                            className="border-b border-black/10 transition-colors hover:bg-black/[0.02]"
                          >
                            <td className="px-2 py-3 align-middle">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex size-10 items-center justify-center rounded-sm bg-[#f4f5f0] text-black/60">
                                  <ReceiptText className="size-4" />
                                </span>
                                <div>
                                  <p className="text-sm text-black">{row.model}</p>
                                  <p className="text-xs text-black/45">{row.capability}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-2 py-3 text-xs text-black/60">
                              {row.requestId}
                            </td>
                            <td className="px-2 py-3 text-sm text-black">
                              {row.provider}
                            </td>
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
                            <td className="px-2 py-3 text-sm text-black/70">
                              {row.latency}
                            </td>
                            <td className="px-2 py-3 text-sm text-black/70">
                              {row.cost}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="px-2 py-20 text-center text-sm text-black/50"
                            colSpan={6}
                          >
                            No predictions found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {requestPagination.totalPages > 1 ? (
                <div className="flex flex-col gap-3 border-t border-black/10 px-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Link
                      href={buildRequestsPageHref(Math.max(1, requestPagination.page - 1))}
                      aria-disabled={requestPagination.page <= 1}
                      className={cn(
                        "inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/70 transition-colors hover:bg-black/[0.03]",
                        requestPagination.page <= 1 && "pointer-events-none opacity-40"
                      )}
                    >
                      Previous
                    </Link>
                    <div className="flex items-center gap-2">
                      {buildVisibleRequestPages(requestPagination.page, requestPagination.totalPages).map((page, index, pages) => (
                        <div key={page} className="flex items-center gap-2">
                          {index > 0 && page - pages[index - 1] > 1 ? (
                            <span className="text-xs text-black/35">…</span>
                          ) : null}
                          <Link
                            href={buildRequestsPageHref(page)}
                            className={cn(
                              "inline-flex h-8 min-w-8 items-center justify-center rounded-sm border px-2 text-xs font-medium transition-colors",
                              page === requestPagination.page
                                ? "border-black bg-black text-white"
                                : "border-black/10 bg-white text-black/70 hover:bg-black/[0.03]"
                            )}
                          >
                            {page}
                          </Link>
                        </div>
                      ))}
                    </div>
                    <Link
                      href={buildRequestsPageHref(Math.min(requestPagination.totalPages, requestPagination.page + 1))}
                      aria-disabled={requestPagination.page >= requestPagination.totalPages}
                      className={cn(
                        "inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/70 transition-colors hover:bg-black/[0.03]",
                        requestPagination.page >= requestPagination.totalPages && "pointer-events-none opacity-40"
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
            </div>
          </section>
          </section>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}
