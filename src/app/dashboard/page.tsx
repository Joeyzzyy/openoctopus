import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  Blocks,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  GitBranchPlus,
  KeyRound,
  Router,
  LogOut,
  Send,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { Toaster } from "sonner";
import { dashboardNav } from "@/lib/dashboard-data";
import { getDashboardData } from "@/lib/dashboard-server";
import { cn } from "@/lib/utils";
import { CreateKeyButton } from "./dashboard-actions";
import { ApiKeysTable } from "./api-keys-table";
import { UsageTable } from "./usage-filters";

const toneStyles = {
  neutral: "text-black/55",
  positive: "text-[#168a42]",
  warning: "text-[#b66a00]",
};

const budgetToneStyles = {
  healthy: "bg-[#dff6e6] text-[#167a3d]",
  watch: "bg-[#fff2d9] text-[#9b6a00]",
  critical: "bg-[#ffe0db] text-[#b43828]",
};


const ledgerToneStyles = {
  positive: "text-[#168a42]",
  negative: "text-[#b43828]",
  neutral: "text-black/50",
};

const providerToneStyles = {
  healthy: "bg-[#dff6e6] text-[#167a3d]",
  degraded: "bg-[#fff2d9] text-[#9b6a00]",
  offline: "bg-[#ffe0db] text-[#b43828]",
};

const requestStatusStyles = {
  queued: "bg-[#f2eee4] text-[#6d5b2e]",
  processing: "bg-[#e6f0ff] text-[#2f5fb8]",
  succeeded: "bg-[#dff6e6] text-[#167a3d]",
  failed: "bg-[#ffe0db] text-[#b43828]",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  const {
    apiKeys,
    budgetRules,
    ledgerRows,
    metrics,
    modelSpend,
    spendTrend,
    usageRows,
    user,
    workspace,
    providerSummaries,
    requestQueueRows,
    routingRules,
  } = data;

  const maxSpend = Math.max(...spendTrend.map((item) => item.spend), 1);

  return (
    <main className="min-h-screen bg-[#f3f2ed] text-[#111111]">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-3 py-4 sm:px-4 md:px-6 lg:px-8">
        {/* Sidebar - desktop only */}
        <aside className="hidden w-[248px] shrink-0 xl:block">
          <div className="sticky top-4 rounded-[24px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
            <div className="border-b border-black/8 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#111111] text-white">
                  <Wallet className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1.1px] text-black/45">
                    Workspace
                  </p>
                  <p className="font-mono text-sm font-semibold text-[#111111]">
                    {workspace?.slug ?? "OpenOctopus"}
                  </p>
                </div>
              </div>
            </div>

            <nav className="mt-4 space-y-1.5">
              {dashboardNav.map((item) => (
                <button
                  key={item.value}
                  className={cn(
                    "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left transition-colors",
                    item.active
                      ? "bg-[#111111] text-white"
                      : "text-black/60 hover:bg-black/[0.04] hover:text-black"
                  )}
                >
                  <span className="font-mono text-[12px] uppercase tracking-[1px]">
                    {item.label}
                  </span>
                  {item.active ? <ArrowRight className="h-4 w-4" /> : null}
                </button>
              ))}
            </nav>

            <div className="mt-6 rounded-[18px] border border-black/8 bg-[#f7f5ef] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[1.1px] text-black/45">
                Governance
              </p>
              <h3 className="mt-2 font-mono text-sm font-semibold text-[#111111]">
                Budget guardrails are active.
              </h3>
              <p className="mt-2 text-sm leading-6 text-black/55">
                Auto alerts fire at 50%, 80%, and 100%. Hard caps can pause keys
                before overspend.
              </p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-4 sm:space-y-6">
          {/* Hero header */}
          <section className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f5f4ef] px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-black/50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Billing Control Center
                </div>
                <h1 className="mt-3 font-mono text-[22px] leading-[1] font-bold tracking-[-0.04em] text-[#111111] sm:text-[30px] md:text-[38px] lg:text-[48px] lg:leading-[0.95]">
                  Model budgets, keys, and spend oversight.
                </h1>
                <p className="mt-2 max-w-3xl text-[13px] leading-6 text-black/56 sm:mt-3 sm:text-sm md:text-[15px]">
                  Track wallet balance, enforce monthly limits, see which key is
                  burning budget, and audit every model request.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <button className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111] sm:h-10 sm:px-4">
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Alerts</span>
                </button>
                <button className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111] sm:h-10 sm:px-4">
                  <Settings2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Budget Rules</span>
                </button>
                <CreateKeyButton />
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111] sm:h-10 sm:px-4"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-6">
              <div className="inline-flex h-8 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-2.5 sm:h-9 sm:px-3">
                <span className="font-mono text-[9px] uppercase tracking-[1px] text-black/45 sm:text-[10px]">
                  Workspace
                </span>
                <span className="max-w-[120px] truncate font-mono text-[11px] font-semibold text-[#111111] sm:max-w-none sm:text-xs">
                  {workspace?.name ?? "OpenOctopus Production"}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-black/35 sm:h-4 sm:w-4" />
              </div>
              <div className="inline-flex h-8 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-2.5 sm:h-9 sm:px-3">
                <span className="font-mono text-[9px] uppercase tracking-[1px] text-black/45 sm:text-[10px]">
                  User
                </span>
                <span className="max-w-[100px] truncate font-mono text-[11px] font-semibold text-[#111111] sm:max-w-none sm:text-xs">
                  {user.name}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-black/35 sm:h-4 sm:w-4" />
              </div>
            </div>
          </section>

          {/* Metrics */}
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-[18px] border border-black/8 bg-white p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.05)] sm:rounded-[24px] sm:p-5"
              >
                <p className="font-mono text-[9px] uppercase tracking-[1px] text-black/45 sm:text-[10px]">
                  {metric.label}
                </p>
                <p className="mt-2 font-mono text-[20px] leading-none font-bold tracking-[-0.05em] text-[#111111] sm:mt-4 sm:text-[30px]">
                  {metric.value}
                </p>
                <p className={cn("mt-2 font-mono text-[10px] uppercase tracking-[0.9px] sm:mt-3 sm:text-[11px]", toneStyles[metric.tone])}>
                  {metric.change}
                </p>
              </article>
            ))}
          </section>

          {/* Spend Trend + Model Mix */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_0.85fr]">
            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Spend Trend
                  </p>
                  <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                    Daily spend and budget velocity
                  </h2>
                </div>
                <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 sm:inline-flex sm:h-9">
                  <ChartNoAxesCombined className="h-4 w-4 text-black/45" />
                  <span className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    synced hourly
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-7 items-end gap-1.5 sm:mt-8 sm:gap-3">
                {spendTrend.map((point) => (
                  <div key={point.day} className="flex flex-col items-center gap-2 sm:gap-3">
                    <div className="flex h-24 w-full items-end rounded-[12px] bg-[#f3f2ed] p-1.5 sm:h-44 sm:rounded-[18px] sm:p-2">
                      <div
                        className="w-full rounded-[8px] bg-[linear-gradient(180deg,#111111,#3e3e3e)] sm:rounded-[12px]"
                        style={{ height: `${(point.spend / maxSpend) * 100}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[8px] uppercase tracking-[0.5px] text-black/40 sm:text-[10px] sm:tracking-[1px]">
                        {point.day}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] font-semibold text-[#111111] sm:mt-1 sm:text-xs">
                        ${point.spend}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Model Mix
              </p>
              <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                Where the budget goes
              </h2>

              <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                {modelSpend.length > 0 ? (
                  modelSpend.map((item) => (
                    <div key={item.model} className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[13px] font-semibold text-[#111111] sm:text-sm">
                            {item.model}
                          </p>
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[1px] text-black/40 sm:text-[10px]">
                            {item.provider} · {item.requests}
                          </p>
                        </div>
                        <p className="shrink-0 font-mono text-[13px] font-semibold text-[#111111] sm:text-sm">
                          {item.spend}
                        </p>
                      </div>
                      <div className="mt-2.5 h-1.5 rounded-full bg-black/6 sm:mt-3 sm:h-2">
                        <div
                          className="h-full rounded-full bg-[#111111]"
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-black/10 bg-[#faf9f6] p-5 text-sm text-black/50 sm:rounded-[18px] sm:p-6">
                    No model usage has been recorded yet.
                  </div>
                )}
              </div>
            </article>
          </section>

          {/* API Keys + Budget Policies */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.3fr_0.85fr]">
            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    API Keys
                  </p>
                  <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                    Per-key cost, quota, and activity
                  </h2>
                </div>
                <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
                  <KeyRound className="h-4 w-4" />
                  {apiKeys.length} key(s)
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <ApiKeysTable apiKeys={apiKeys} />
              </div>
            </article>

            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Budget Policies
              </p>
              <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                Hard caps and alert thresholds
              </h2>

              <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                {budgetRules.length > 0 ? (
                  budgetRules.map((rule) => (
                    <div key={rule.scope} className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[13px] font-semibold text-[#111111] sm:text-sm">
                            {rule.scope}
                          </p>
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[1px] text-black/40 sm:text-[10px]">
                            {rule.used} of {rule.limit}
                          </p>
                        </div>
                        <span className={cn("shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]", budgetToneStyles[rule.state])}>
                          {rule.state}
                        </span>
                      </div>
                      <div className="mt-3 h-1.5 rounded-full bg-black/6 sm:mt-4 sm:h-2">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            rule.state === "critical"
                              ? "bg-[#cf503a]"
                              : rule.state === "watch"
                                ? "bg-[#d28b17]"
                                : "bg-[#1d8d46]"
                          )}
                          style={{ width: `${rule.progress}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-black/10 bg-[#faf9f6] p-5 text-sm text-black/50 sm:rounded-[18px] sm:p-6">
                    No budget rules exist yet.
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-[14px] border border-black/8 bg-[#111111] p-3.5 text-white sm:mt-6 sm:rounded-[18px] sm:p-4">
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-white/45">
                  Suggested next step
                </p>
                <p className="mt-2 text-[13px] leading-6 text-white/78 sm:text-sm">
                  Split high-volume usage into separate keys so each workload gets
                  its own budget cap and alert stream.
                </p>
              </div>
            </article>
          </section>

          {/* Usage Details + Wallet Ledger */}
          <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.35fr_0.8fr]">
            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Usage Details
                  </p>
                  <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                    Request-level cost audit
                  </h2>
                </div>
                <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
                  <Clock3 className="h-4 w-4" />
                  {usageRows.length} event(s)
                </div>
              </div>

              <div className="mt-4 sm:mt-6">
                <UsageTable usageRows={usageRows} />
              </div>
            </article>

            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Wallet Ledger
              </p>
              <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                Recharge and settlement trail
              </h2>

              <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                {ledgerRows.length > 0 ? (
                  ledgerRows.map((row) => (
                    <div key={`${row.title}-${row.detail}`} className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[13px] font-semibold text-[#111111] sm:text-sm">
                            {row.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-6 text-black/55 sm:text-sm">
                            {row.detail}
                          </p>
                        </div>
                        <span className={cn("shrink-0 font-mono text-[13px] font-semibold sm:text-sm", ledgerToneStyles[row.tone])}>
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-black/10 bg-[#faf9f6] p-5 text-sm text-black/50 sm:rounded-[18px] sm:p-6">
                    No wallet transactions have been recorded yet.
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2">
                <div className="rounded-[14px] border border-black/8 bg-[#f7f5ef] p-3.5 sm:rounded-[18px] sm:p-4">
                  <CircleDollarSign className="h-5 w-5 text-black/45" />
                  <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[1px] text-black/45 sm:mt-3">
                    Auto Recharge
                  </p>
                  <p className="mt-1.5 text-[13px] leading-6 text-black/55 sm:mt-2 sm:text-sm">
                    Disabled until workspace balance drops below your configured threshold.
                  </p>
                </div>
                <div className="rounded-[14px] border border-black/8 bg-[#f7f5ef] p-3.5 sm:rounded-[18px] sm:p-4">
                  <CreditCard className="h-5 w-5 text-black/45" />
                  <p className="mt-2.5 font-mono text-[10px] uppercase tracking-[1px] text-black/45 sm:mt-3">
                    Payment Method
                  </p>
                  <p className="mt-1.5 text-[13px] leading-6 text-black/55 sm:mt-2 sm:text-sm">
                    No payment method attached yet. Once recharge goes live, this card area will populate.
                  </p>
                </div>
              </div>
            </article>
          </section>

          {/* Orchestration Control Plane */}
          <section className="grid gap-4 sm:gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Provider Control
                  </p>
                  <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                    Upstream health and queue posture
                  </h2>
                </div>
                <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
                  <Blocks className="h-4 w-4" />
                  {providerSummaries.length} upstreams
                </div>
              </div>

              <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                {providerSummaries.length > 0 ? (
                  providerSummaries.map((provider) => (
                    <div
                      key={provider.name}
                      className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-[13px] font-semibold text-[#111111] sm:text-sm">
                            {provider.name}
                          </p>
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[1px] text-black/40 sm:text-[10px]">
                            {provider.kind} · {provider.regions}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]",
                            providerToneStyles[provider.status]
                          )}
                        >
                          {provider.status}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4">
                        <div className="rounded-[12px] border border-black/8 bg-white px-3 py-2.5">
                          <p className="font-mono text-[9px] uppercase tracking-[1px] text-black/40">
                            Bound models
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-[#111111]">
                            {provider.models}
                          </p>
                        </div>
                        <div className="rounded-[12px] border border-black/8 bg-white px-3 py-2.5">
                          <p className="font-mono text-[9px] uppercase tracking-[1px] text-black/40">
                            Queue
                          </p>
                          <p className="mt-1 font-mono text-sm font-semibold text-[#111111]">
                            {provider.queue}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-black/10 bg-[#faf9f6] p-5 text-sm text-black/50 sm:rounded-[18px] sm:p-6">
                    No providers have been configured yet.
                  </div>
                )}
              </div>
            </article>

            <article className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Routing Rules
                  </p>
                  <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                    Public models mapped to upstream adapters
                  </h2>
                </div>
                <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
                  <GitBranchPlus className="h-4 w-4" />
                  unified routing
                </div>
              </div>

              <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">
                {routingRules.length > 0 ? (
                  routingRules.map((rule) => (
                    <div
                      key={rule.publicModel}
                      className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-[13px] font-semibold text-[#111111] sm:text-sm">
                            {rule.publicModel}
                          </p>
                          <p className="mt-1 font-mono text-[9px] uppercase tracking-[1px] text-black/40 sm:text-[10px]">
                            {rule.capability}
                          </p>
                        </div>
                        <Router className="h-4 w-4 shrink-0 text-black/35" />
                      </div>

                      <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2">
                        <div className="rounded-[12px] border border-black/8 bg-white px-3 py-2.5">
                          <p className="font-mono text-[9px] uppercase tracking-[1px] text-black/40">
                            Primary
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-[#111111]">
                            {rule.primary}
                          </p>
                        </div>
                        <div className="rounded-[12px] border border-black/8 bg-white px-3 py-2.5">
                          <p className="font-mono text-[9px] uppercase tracking-[1px] text-black/40">
                            Fallback
                          </p>
                          <p className="mt-1 text-[13px] leading-5 text-[#111111]">
                            {rule.fallback}
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 text-[13px] leading-6 text-black/55 sm:mt-4">
                        {rule.strategy}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[14px] border border-dashed border-black/10 bg-[#faf9f6] p-5 text-sm text-black/50 sm:rounded-[18px] sm:p-6">
                    No routing rules exist yet.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  Request Queue
                </p>
                <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
                  Unified task ledger for the gateway worker
                </h2>
              </div>
              <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
                <Send className="h-4 w-4" />
                orchestration events
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[18px] border border-black/8 sm:mt-6">
              <div className="hidden grid-cols-[1.35fr_0.8fr_0.9fr_0.8fr_0.65fr_0.55fr] gap-3 border-b border-black/8 bg-[#f7f5ef] px-4 py-3 font-mono text-[10px] uppercase tracking-[1px] text-black/45 md:grid">
                <span>Request</span>
                <span>Model</span>
                <span>Provider</span>
                <span>Status</span>
                <span>Latency</span>
                <span>Cost</span>
              </div>

              <div className="divide-y divide-black/8">
                {requestQueueRows.length > 0 ? (
                  requestQueueRows.map((row) => (
                    <div
                      key={row.requestId}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[1.35fr_0.8fr_0.9fr_0.8fr_0.65fr_0.55fr] md:items-center"
                    >
                      <div>
                        <p className="font-mono text-[12px] font-semibold text-[#111111]">
                          {row.requestId}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                          {row.capability}
                        </p>
                      </div>
                      <p className="text-[13px] leading-5 text-[#111111]">{row.model}</p>
                      <p className="text-[13px] leading-5 text-[#111111]">{row.provider}</p>
                      <div>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]",
                            requestStatusStyles[row.status]
                          )}
                        >
                          {row.status}
                        </span>
                      </div>
                      <p className="font-mono text-[12px] text-[#111111]">{row.latency}</p>
                      <p className="font-mono text-[12px] text-[#111111]">{row.cost}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-black/50">
                    No orchestration requests have been recorded yet.
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="pb-4 sm:pb-6">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-3 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111] sm:h-10 sm:px-4"
            >
              Back To Landing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}
