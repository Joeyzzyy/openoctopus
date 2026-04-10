import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
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
  const coreMetrics = metrics.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f3f2ed] text-[#111111]">
      <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          <section className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-[#f5f4ef] px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-black/50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  OpenOctopus API
                </div>
                <h1 className="mt-3 font-mono text-[24px] leading-[1] font-bold tracking-[-0.04em] text-[#111111] sm:text-[34px] lg:text-[42px]">
                  Create a key, send a request, check the task.
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-black/56 sm:text-[15px]">
                  This dashboard is intentionally minimal for MVP. It only keeps
                  the information users need to start calling the API and see
                  recent task status.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div className="rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 py-2 font-mono text-[11px] text-[#111111]">
                    Workspace: {workspace?.name ?? "OpenOctopus Production"}
                  </div>
                  <div className="rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 py-2 font-mono text-[11px] text-[#111111]">
                    User: {user.name}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <CreateKeyButton />
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
          </section>

          <section className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {coreMetrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-[18px] border border-black/8 bg-white p-4 shadow-[0_20px_50px_rgba(0,0,0,0.05)] sm:rounded-[24px] sm:p-5"
              >
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  {metric.label}
                </p>
                <p className="mt-3 font-mono text-[24px] leading-none font-bold tracking-[-0.05em] text-[#111111] sm:text-[30px]">
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
          </section>

          <ApiQuickstartCard />

          <section className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  API Keys
                </p>
                <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:text-xl">
                  Create and manage the keys your apps actually use
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
          </section>

          <section className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                  Recent Requests
                </p>
                <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:text-xl">
                  The last tasks submitted through your API gateway
                </h2>
              </div>
              <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
                <Send className="h-4 w-4" />
                task ledger
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-[18px] border border-black/8 sm:mt-6">
              <div className="hidden grid-cols-[1.35fr_0.95fr_1fr_0.8fr_0.7fr_0.6fr] gap-3 border-b border-black/8 bg-[#f7f5ef] px-4 py-3 font-mono text-[10px] uppercase tracking-[1px] text-black/45 md:grid">
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
                      className="grid gap-3 px-4 py-4 md:grid-cols-[1.35fr_0.95fr_1fr_0.8fr_0.7fr_0.6fr] md:items-center"
                    >
                      <div>
                        <p className="font-mono text-[12px] font-semibold text-[#111111]">
                          {row.requestId}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[1px] text-black/40">
                          {row.capability}
                        </p>
                      </div>
                      <p className="text-[13px] leading-5 text-[#111111]">
                        {row.model}
                      </p>
                      <p className="text-[13px] leading-5 text-[#111111]">
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
                      <p className="font-mono text-[12px] text-[#111111]">
                        {row.latency}
                      </p>
                      <p className="font-mono text-[12px] text-[#111111]">
                        {row.cost}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-sm text-black/50">
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
              className="inline-flex h-10 items-center gap-2 rounded-[14px] border border-black/8 bg-white px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-[#111111]"
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
