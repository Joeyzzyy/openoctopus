import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  CreditCard,
  KeyRound,
  LogOut,
  Plus,
  Settings2,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { dashboardNav } from "@/lib/dashboard-data";
import { getDashboardData } from "@/lib/dashboard-server";
import { cn } from "@/lib/utils";

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

const keyToneStyles = {
  active: "bg-[#dff6e6] text-[#167a3d]",
  warning: "bg-[#fff2d9] text-[#9b6a00]",
  paused: "bg-[#ececec] text-[#666666]",
};

const ledgerToneStyles = {
  positive: "text-[#168a42]",
  negative: "text-[#b43828]",
  neutral: "text-black/50",
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
  } = data;

  const maxSpend = Math.max(...spendTrend.map((item) => item.spend), 1);

  return (
    <main className="min-h-screen bg-[#f3f2ed] text-[#111111]">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-4 md:px-6 lg:px-8">
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

        <div className="min-w-0 flex-1 space-y-6">
          <section className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f5f4ef] px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-black/50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Billing Control Center
                </div>
                <h1 className="mt-3 font-mono text-[34px] leading-[0.95] font-bold tracking-[-0.05em] text-[#111111] md:text-[48px]">
                  Model budgets, keys, and spend oversight in one white-pane dashboard.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-black/56 md:text-[15px]">
                  Track wallet balance, enforce monthly limits, see which key is
                  burning budget, and audit every model request across production,
                  batch jobs, and partner traffic.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111]">
                  <Bell className="h-4 w-4" />
                  Alerts
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111]">
                  <Settings2 className="h-4 w-4" />
                  Budget Rules
                </button>
                <button className="inline-flex h-10 items-center gap-2 rounded-[14px] bg-[#111111] px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white">
                  <Plus className="h-4 w-4" />
                  Create Key
                </button>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111]"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <div className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3">
                <span className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  Workspace
                </span>
                <span className="font-mono text-xs font-semibold text-[#111111]">
                  {workspace?.name ?? "OpenOctopus Production"}
                </span>
                <ChevronDown className="h-4 w-4 text-black/35" />
              </div>
              <div className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3">
                <span className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  User
                </span>
                <span className="font-mono text-xs font-semibold text-[#111111]">
                  {user.name}
                </span>
                <ChevronDown className="h-4 w-4 text-black/35" />
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.05)]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  {metric.label}
                </p>
                <p className="mt-4 font-mono text-[30px] leading-none font-bold tracking-[-0.05em] text-[#111111]">
                  {metric.value}
                </p>
                <p className={cn("mt-3 font-mono text-[11px] uppercase tracking-[0.9px]", toneStyles[metric.tone])}>
                  {metric.change}
                </p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1.3fr_0.85fr]">
            <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Spend Trend
                  </p>
                  <h2 className="mt-2 font-mono text-xl font-semibold text-[#111111]">
                    Daily spend and budget velocity
                  </h2>
                </div>
                <div className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3">
                  <ChartNoAxesCombined className="h-4 w-4 text-black/45" />
                  <span className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    synced hourly
                  </span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-7 items-end gap-3">
                {spendTrend.map((point) => (
                  <div key={point.day} className="flex flex-col items-center gap-3">
                    <div className="flex h-44 w-full items-end rounded-[18px] bg-[#f3f2ed] p-2">
                      <div
                        className="w-full rounded-[12px] bg-[linear-gradient(180deg,#111111,#3e3e3e)]"
                        style={{ height: `${(point.spend / maxSpend) * 100}%` }}
                      />
                    </div>
                    <div className="text-center">
                      <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                        {point.day}
                      </p>
                      <p className="mt-1 font-mono text-xs font-semibold text-[#111111]">
                        ${point.spend}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Model Mix
              </p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-[#111111]">
                Where the budget goes
              </h2>

              <div className="mt-6 space-y-4">
                {modelSpend.length > 0 ? (
                  modelSpend.map((item) => (
                    <div key={item.model} className="rounded-[18px] border border-black/8 bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm font-semibold text-[#111111]">
                            {item.model}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                            {item.provider} · {item.requests}
                          </p>
                        </div>
                        <p className="font-mono text-sm font-semibold text-[#111111]">
                          {item.spend}
                        </p>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-black/6">
                        <div
                          className="h-full rounded-full bg-[#111111]"
                          style={{ width: `${item.share}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-black/10 bg-[#faf9f6] p-6 text-sm text-black/50">
                    No model usage has been recorded yet.
                  </div>
                )}
              </div>
            </article>
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1.3fr_0.85fr]">
            <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    API Keys
                  </p>
                  <h2 className="mt-2 font-mono text-xl font-semibold text-[#111111]">
                    Per-key cost, quota, and activity
                  </h2>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111]">
                  <KeyRound className="h-4 w-4" />
                  Rotate selected
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left">
                      {["Key", "Environment", "Monthly Budget", "Spent", "Requests", "Last Used", "State"].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-2 font-mono text-[10px] uppercase tracking-[1px] text-black/40"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apiKeys.length > 0 ? (
                      apiKeys.map((key) => (
                        <tr key={key.prefix} className="rounded-[18px] bg-[#faf9f6]">
                          <td className="rounded-l-[16px] px-3 py-3">
                            <p className="font-mono text-sm font-semibold text-[#111111]">
                              {key.name}
                            </p>
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                              {key.prefix}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-sm text-black/60">{key.environment}</td>
                          <td className="px-3 py-3 font-mono text-sm text-[#111111]">{key.budget}</td>
                          <td className="px-3 py-3 font-mono text-sm text-[#111111]">{key.spent}</td>
                          <td className="px-3 py-3 text-sm text-black/60">{key.requests}</td>
                          <td className="px-3 py-3 text-sm text-black/60">{key.lastUsed}</td>
                          <td className="rounded-r-[16px] px-3 py-3">
                            <span className={cn("inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]", keyToneStyles[key.status])}>
                              {key.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="rounded-[16px] bg-[#faf9f6] px-3 py-6 text-center text-sm text-black/50">
                          No API keys have been created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Budget Policies
              </p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-[#111111]">
                Hard caps and alert thresholds
              </h2>

              <div className="mt-6 space-y-4">
                {budgetRules.length > 0 ? (
                  budgetRules.map((rule) => (
                    <div key={rule.scope} className="rounded-[18px] border border-black/8 bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm font-semibold text-[#111111]">
                            {rule.scope}
                          </p>
                          <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                            {rule.used} of {rule.limit}
                          </p>
                        </div>
                        <span className={cn("inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]", budgetToneStyles[rule.state])}>
                          {rule.state}
                        </span>
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-black/6">
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
                  <div className="rounded-[18px] border border-dashed border-black/10 bg-[#faf9f6] p-6 text-sm text-black/50">
                    No budget rules exist yet.
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-[18px] border border-black/8 bg-[#111111] p-4 text-white">
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-white/45">
                  Suggested next step
                </p>
                <p className="mt-2 text-sm leading-6 text-white/78">
                  Split high-volume usage into separate keys so each workload gets
                  its own budget cap and alert stream.
                </p>
              </div>
            </article>
          </section>

          <section className="grid gap-6 2xl:grid-cols-[1.35fr_0.8fr]">
            <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Usage Details
                  </p>
                  <h2 className="mt-2 font-mono text-xl font-semibold text-[#111111]">
                    Request-level cost audit
                  </h2>
                </div>
                <button className="inline-flex h-9 items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111]">
                  <Clock3 className="h-4 w-4" />
                  Export CSV
                </button>
              </div>

              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left">
                      {["Timestamp", "API Key", "Model", "Endpoint", "Units", "Cost", "Status"].map((heading) => (
                        <th
                          key={heading}
                          className="px-3 py-2 font-mono text-[10px] uppercase tracking-[1px] text-black/40"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {usageRows.length > 0 ? (
                      usageRows.map((row) => (
                        <tr key={`${row.time}-${row.apiKey}`} className="bg-[#faf9f6]">
                          <td className="rounded-l-[16px] px-3 py-3 text-sm text-black/60">{row.time}</td>
                          <td className="px-3 py-3 font-mono text-sm font-semibold text-[#111111]">{row.apiKey}</td>
                          <td className="px-3 py-3 text-sm text-black/60">{row.model}</td>
                          <td className="px-3 py-3 font-mono text-[11px] text-black/55">{row.endpoint}</td>
                          <td className="px-3 py-3 text-sm text-black/60">{row.units}</td>
                          <td className="px-3 py-3 font-mono text-sm text-[#111111]">{row.cost}</td>
                          <td className="rounded-r-[16px] px-3 py-3">
                            <span className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="rounded-[16px] bg-[#faf9f6] px-3 py-6 text-center text-sm text-black/50">
                          No usage events have been recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.06)] md:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Wallet Ledger
              </p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-[#111111]">
                Recharge and settlement trail
              </h2>

              <div className="mt-6 space-y-4">
                {ledgerRows.length > 0 ? (
                  ledgerRows.map((row) => (
                    <div key={`${row.title}-${row.detail}`} className="rounded-[18px] border border-black/8 bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-mono text-sm font-semibold text-[#111111]">
                            {row.title}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-black/55">
                            {row.detail}
                          </p>
                        </div>
                        <span className={cn("font-mono text-sm font-semibold", ledgerToneStyles[row.tone])}>
                          {row.amount}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-black/10 bg-[#faf9f6] p-6 text-sm text-black/50">
                    No wallet transactions have been recorded yet.
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-black/8 bg-[#f7f5ef] p-4">
                  <CircleDollarSign className="h-5 w-5 text-black/45" />
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Auto Recharge
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/55">
                    Disabled until workspace balance drops below your configured threshold.
                  </p>
                </div>
                <div className="rounded-[18px] border border-black/8 bg-[#f7f5ef] p-4">
                  <CreditCard className="h-5 w-5 text-black/45" />
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                    Payment Method
                  </p>
                  <p className="mt-2 text-sm leading-6 text-black/55">
                    No payment method attached yet. Once recharge goes live, this card area will populate.
                  </p>
                </div>
              </div>
            </article>
          </section>

          <div className="pb-6">
            <Link
              href="/"
              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111]"
            >
              Back To Landing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
