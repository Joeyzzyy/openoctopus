import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  KeyRound,
  LogOut,
  Send,
  ShieldCheck,
} from "lucide-react";
import { Toaster } from "sonner";
import { getDashboardData } from "@/lib/dashboard-server";
import { cn } from "@/lib/utils";
import { CreateKeyButton } from "./dashboard-actions";
import { ApiKeysTable } from "./api-keys-table";
import { ApiQuickstartCard } from "./api-quickstart-card";

const sectionLinks = [
  { label: "Overview", href: "#overview" },
  { label: "Quickstart", href: "#quickstart" },
  { label: "API Keys", href: "#keys" },
  { label: "Requests", href: "#requests" },
];

const gettingStartedSteps = [
  {
    title: "Create an API key",
    detail: "Generate a workspace key and copy the secret once.",
    href: "#keys",
    cta: "Go to keys",
  },
  {
    title: "Send your first request",
    detail: "Use the quickstart example with one model slug and one prompt.",
    href: "#quickstart",
    cta: "Open quickstart",
  },
  {
    title: "Check task status",
    detail: "Track recent jobs and verify the response format you will build against.",
    href: "#requests",
    cta: "View requests",
  },
];

const toneStyles = {
  neutral: "text-black/55",
  positive: "text-[#168a42]",
  warning: "text-[#b66a00]",
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

  const { apiKeys, metrics, requestQueueRows, user, workspace } = data;
  const coreMetrics = metrics.slice(0, 4);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(255,241,214,0.9),_transparent_30%),linear-gradient(180deg,#fffdf8_0%,#f6f7f1_48%,#eef3ef_100%)] text-[#111111]">
      <div className="mx-auto max-w-[1180px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          <section
            id="overview"
            className="overflow-hidden rounded-[24px] border border-[#d9dfd2] bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(245,249,241,0.96))] p-5 shadow-[0_24px_80px_rgba(68,85,56,0.08)] sm:rounded-[32px] sm:p-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#d9dfd2] bg-white/90 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-[#5d6857]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  OpenOctopus API
                </div>
                <h1 className="mt-4 max-w-3xl font-mono text-[28px] leading-[0.95] font-bold tracking-[-0.05em] text-[#142018] sm:text-[38px] lg:text-[48px]">
                  Clean, minimal access to your API.
                </h1>
                <p className="mt-4 max-w-2xl text-[14px] leading-7 text-[#4f5d50] sm:text-[15px]">
                  Create a key, copy the example request, and monitor recent
                  tasks. Everything else stays out of the way until the MVP
                  actually needs it.
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <div className="rounded-[14px] border border-[#dde5d8] bg-white/90 px-3.5 py-2.5 font-mono text-[11px] text-[#233125]">
                    Workspace: {workspace?.name ?? "OpenOctopus Production"}
                  </div>
                  <div className="rounded-[14px] border border-[#dde5d8] bg-white/90 px-3.5 py-2.5 font-mono text-[11px] text-[#233125]">
                    User: {user.name}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                <CreateKeyButton />
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[#dde5d8] bg-white/95 px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#233125] sm:w-auto"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </section>

          <nav className="sticky top-3 z-20 overflow-x-auto rounded-[18px] border border-[#dde5d8] bg-white/90 p-2 shadow-[0_14px_40px_rgba(68,85,56,0.08)] backdrop-blur">
            <div className="flex min-w-max items-center gap-2">
              {sectionLinks.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex h-9 items-center rounded-[12px] px-3.5 font-mono text-[11px] font-semibold uppercase tracking-[0.9px] transition-colors",
                    index === 0
                      ? "bg-[#1f5f39] text-white"
                      : "text-[#556153] hover:bg-[#f4f8f1] hover:text-[#1f5f39]"
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>

          <section className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <article className="rounded-[24px] border border-[#dde5d8] bg-white/95 p-5 shadow-[0_20px_60px_rgba(68,85,56,0.06)] sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                Getting Started
              </p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-[#162319]">
                Three things every new user should do
              </h2>
              <div className="mt-5 space-y-3">
                {gettingStartedSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="flex items-start justify-between gap-3 rounded-[18px] border border-[#e3e8de] bg-[#f9fcf7] px-4 py-4"
                  >
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[11px] font-semibold text-[#1f5f39] shadow-[0_8px_20px_rgba(39,65,46,0.08)]">
                        {index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.8px] text-[#162319]">
                          {step.title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-[#4f5d50]">
                          {step.detail}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={step.href}
                      className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-[0.8px] text-[#1f5f39]"
                    >
                      {step.cta}
                    </Link>
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-[24px] border border-[#dde5d8] bg-white/95 p-5 shadow-[0_20px_60px_rgba(68,85,56,0.06)] sm:p-6">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                Workspace Snapshot
              </p>
              <h2 className="mt-2 font-mono text-xl font-semibold text-[#162319]">
                Core numbers, nothing extra
              </h2>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {coreMetrics.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-[20px] border border-[#e3e8de] bg-[#f9fcf7] p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                      {metric.label}
                    </p>
                    <p className="mt-3 font-mono text-[24px] leading-none font-bold tracking-[-0.05em] text-[#162319] sm:text-[28px]">
                      {metric.value}
                    </p>
                    <p
                      className={cn(
                        "mt-3 font-mono text-[10px] uppercase tracking-[0.9px]",
                        toneStyles[metric.tone]
                      )}
                    >
                      {metric.change}
                    </p>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <div id="quickstart">
            <ApiQuickstartCard />
          </div>

          <section
            id="keys"
            className="rounded-[24px] border border-[#dde5d8] bg-white/95 p-4 shadow-[0_24px_70px_rgba(68,85,56,0.06)] sm:rounded-[30px] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                  API Keys
                </p>
                <h2 className="mt-1 font-mono text-lg font-semibold text-[#162319] sm:text-xl">
                  Create and manage the keys your apps actually use
                </h2>
              </div>
              <div className="hidden items-center gap-2 rounded-[12px] border border-[#dde5d8] bg-[#f7faf3] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#233125] sm:inline-flex sm:h-9">
                <KeyRound className="h-4 w-4" />
                {apiKeys.length} key(s)
              </div>
            </div>

            <div className="mt-4 sm:mt-6">
              <ApiKeysTable apiKeys={apiKeys} />
            </div>
          </section>

          <section
            id="requests"
            className="rounded-[24px] border border-[#dde5d8] bg-white/95 p-4 shadow-[0_24px_70px_rgba(68,85,56,0.06)] sm:rounded-[30px] sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                  Recent Requests
                </p>
                <h2 className="mt-1 font-mono text-lg font-semibold text-[#162319] sm:text-xl">
                  The last tasks submitted through your API gateway
                </h2>
              </div>
              <div className="hidden items-center gap-2 rounded-[12px] border border-[#dde5d8] bg-[#f7faf3] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#233125] sm:inline-flex sm:h-9">
                <Send className="h-4 w-4" />
                task ledger
              </div>
            </div>

            <div className="mt-4 space-y-3 md:hidden">
              {requestQueueRows.length > 0 ? (
                requestQueueRows.map((row) => (
                  <article
                    key={row.requestId}
                    className="rounded-[18px] border border-[#e3e8de] bg-white p-4 shadow-[0_12px_30px_rgba(68,85,56,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12px] font-semibold text-[#162319]">
                          {row.requestId}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-[#7b8778]">
                          {row.capability}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[1px]",
                          requestStatusStyles[row.status]
                        )}
                      >
                        {row.status}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-[14px] border border-[#e3e8de] bg-[#f9fcf7] px-3 py-2.5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.8px] text-[#7b8778]">
                          Model
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-[#162319]">
                          {row.model}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-[#e3e8de] bg-[#f9fcf7] px-3 py-2.5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.8px] text-[#7b8778]">
                          Provider
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-[#162319]">
                          {row.provider}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-[#e3e8de] bg-[#f9fcf7] px-3 py-2.5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.8px] text-[#7b8778]">
                          Latency
                        </p>
                        <p className="mt-1 font-mono text-[12px] text-[#162319]">
                          {row.latency}
                        </p>
                      </div>
                      <div className="rounded-[14px] border border-[#e3e8de] bg-[#f9fcf7] px-3 py-2.5">
                        <p className="font-mono text-[9px] uppercase tracking-[0.8px] text-[#7b8778]">
                          Cost
                        </p>
                        <p className="mt-1 font-mono text-[12px] text-[#162319]">
                          {row.cost}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[18px] border border-[#e3e8de] bg-white px-4 py-6 text-sm text-[#697567]">
                  No requests yet. Create a key above and send your first API
                  call.
                </div>
              )}
            </div>

            <div className="mt-4 hidden overflow-hidden rounded-[18px] border border-[#e3e8de] sm:mt-6 md:block">
              <div className="hidden grid-cols-[1.35fr_0.95fr_1fr_0.8fr_0.7fr_0.6fr] gap-3 border-b border-[#e3e8de] bg-[#f7faf3] px-4 py-3 font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868] md:grid">
                <span>Request</span>
                <span>Model</span>
                <span>Provider</span>
                <span>Status</span>
                <span>Latency</span>
                <span>Cost</span>
              </div>

              <div className="divide-y divide-[#e6ebe1]">
                {requestQueueRows.length > 0 ? (
                  requestQueueRows.map((row) => (
                    <div
                      key={row.requestId}
                      className="grid gap-3 bg-white px-4 py-4 md:grid-cols-[1.35fr_0.95fr_1fr_0.8fr_0.7fr_0.6fr] md:items-center"
                    >
                      <div>
                        <p className="font-mono text-[12px] font-semibold text-[#162319]">
                          {row.requestId}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-[#7b8778]">
                          {row.capability}
                        </p>
                      </div>
                      <p className="text-[13px] leading-5 text-[#162319]">
                        {row.model}
                      </p>
                      <p className="text-[13px] leading-5 text-[#162319]">
                        {row.provider}
                      </p>
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
                      <p className="font-mono text-[12px] text-[#162319]">
                        {row.latency}
                      </p>
                      <p className="font-mono text-[12px] text-[#162319]">
                        {row.cost}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="bg-white px-4 py-6 text-sm text-[#697567]">
                    No requests yet. Create a key above and send your first API
                    call.
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="pb-4 sm:pb-6">
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-[14px] border border-[#dde5d8] bg-white/95 px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#233125]"
            >
              Back To Landing
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}
