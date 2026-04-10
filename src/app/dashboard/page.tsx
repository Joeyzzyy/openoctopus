import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  CircleAlert,
  Download,
  Grid2x2,
  ImageIcon,
  KeyRound,
  LogOut,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Toaster } from "sonner";
import { getDashboardData } from "@/lib/dashboard-server";
import { cn } from "@/lib/utils";
import { CreateKeyButton } from "./dashboard-actions";
import { ApiKeysTable } from "./api-keys-table";

const topNav = [
  { label: "Dashboard", href: "/dashboard", active: true },
  { label: "Explore", href: "#latest-models" },
  { label: "History", href: "#requests" },
  { label: "AI Generator", href: "#latest-models", badge: "hot" },
  { label: "API Keys", href: "#keys" },
  { label: "Billing", href: "#overview" },
  { label: "Settings", href: "#overview", dropdown: true },
];

const buildApiSteps = [
  { index: "01", label: "Get an API key", href: "#keys", cta: "Get" },
  { index: "02", label: "Quickstart guide", href: "#quickstart", cta: "Check" },
  { index: "03", label: "First image request", href: "#quickstart", cta: "Try" },
  { index: "04", label: "Task polling", href: "#requests", cta: "View" },
];

const requestStatusStyles = {
  queued: "bg-[#f4efe3] text-[#7b6226]",
  processing: "bg-[#e8f0ff] text-[#355fb4]",
  succeeded: "bg-[#e4f7e8] text-[#1b7a41]",
  failed: "bg-[#ffe7e3] text-[#b54432]",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect("/login");
  }

  const {
    apiKeys,
    metrics,
    modelSpend,
    requestQueueRows,
    routingRules,
    usageRows,
    user,
    workspace,
  } = data;

  const walletMetric = metrics.find((metric) => metric.label === "Wallet Balance");
  const spendMetric = metrics.find((metric) => metric.label === "Month Spend");
  const requestsLast7Days = usageRows.length;
  const modelsUsed = new Set(
    [...requestQueueRows.map((row) => row.model), ...usageRows.map((row) => row.model)].filter(Boolean)
  ).size;
  const latestModels = routingRules.slice(0, 8).map((rule, index) => ({
    id: rule.publicModel,
    name: rule.publicModel.split("/").at(-1) ?? rule.publicModel,
    slug: rule.publicModel,
    capability: rule.capability,
    tone: index % 4,
  }));

  return (
    <main className="min-h-screen bg-[#fafaf8] text-[#111111]">
      <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_top_left,rgba(202,232,207,0.35),transparent_38%),radial-gradient(circle_at_top_right,rgba(255,224,194,0.28),transparent_28%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 xl:px-0">
        <div className="sticky top-[96px] z-30 w-full overflow-x-auto border-b border-black/10 bg-white/95 backdrop-blur">
          <div className="flex min-w-max items-center gap-4 px-4 xl:px-0">
            <div className="flex items-center gap-8">
              {topNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 whitespace-nowrap border-b-2 py-3 text-sm transition-colors",
                    item.active
                      ? "border-black font-semibold text-black"
                      : "border-transparent text-black/55 hover:text-black"
                  )}
                >
                  <span className="relative">
                    {item.label}
                    {item.badge ? (
                      <span className="absolute -right-4 -top-2 text-[10px]">🔥</span>
                    ) : null}
                  </span>
                  {item.dropdown ? <ChevronDown className="h-4 w-4" /> : null}
                </Link>
              ))}
            </div>

            <button className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm border border-transparent bg-[#f4f4f1] px-2.5 text-sm text-black/80">
              {user.name}
              <span className="rounded-sm bg-black/8 px-1.5 py-0.5 text-xs font-medium">
                personal
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <section className="mt-[108px] min-h-[calc(100vh-108px)] px-0">
          <div className="mb-3 mt-4 flex flex-col gap-3 md:mb-6 md:mt-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold leading-none text-[#111111]">
                Dashboard
              </h1>
              <p className="mt-2 text-sm text-black/55">
                {workspace?.name ?? "OpenOctopus Production"} workspace
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80">
                Build app with API
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
              <button className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80">
                Hide Getting Started
              </button>
              <CreateKeyButton />
              <form action="/auth/sign-out" method="post">
                <button
                  type="submit"
                  className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>

          <div className="mb-4 rounded-sm border border-black/10 bg-white shadow-none">
            <div className="grid divide-y divide-black/10 md:grid-cols-3 md:divide-x md:divide-y-0">
              <section className="flex min-h-[260px] flex-col justify-between px-4 py-4 md:px-5 md:py-5">
                <div>
                  <h3 className="mb-3 text-lg font-bold text-[#111111]">
                    Welcome to OpenOctopus
                  </h3>
                  <p className="mb-6 text-sm text-black/55">
                    Follow these steps to get productive quickly. If anything
                    blocks you, we can keep the path focused on key creation,
                    first request, and task verification.
                  </p>
                </div>
                <ul className="mt-auto divide-y divide-black/10">
                  <li className="flex h-11 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-4 items-center justify-center rounded-full bg-[#16a34a] text-white">
                        <svg
                          viewBox="0 0 24 24"
                          className="size-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="text-sm text-black/50">Create an account</span>
                    </div>
                  </li>
                  <li className="flex h-11 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-4 items-center justify-center rounded-full border border-black/20 bg-black/10 text-transparent" />
                      <span className="text-sm text-black">Add credits</span>
                    </div>
                    <button className="inline-flex h-8 items-center rounded-sm bg-black px-3 text-xs font-medium text-white">
                      Add credits
                    </button>
                  </li>
                  <li className="flex h-11 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-4 items-center justify-center rounded-full border border-black/20 bg-black/10 text-transparent" />
                      <span className="text-sm text-black">Generate your first media</span>
                    </div>
                    <Link
                      href="#latest-models"
                      className="inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium"
                    >
                      Explore
                    </Link>
                  </li>
                </ul>
              </section>

              <section
                id="quickstart"
                className="flex min-h-[260px] flex-col justify-between px-4 py-4 md:px-5 md:py-5"
              >
                <div>
                  <h3 className="mb-3 text-lg font-bold text-[#111111]">
                    Create something with API
                  </h3>
                  <p className="text-sm text-black/55">
                    Follow these steps to ship the first request with the least
                    amount of setup friction.
                  </p>
                </div>
                <ul className="mt-6 divide-y divide-black/5">
                  {buildApiSteps.map((step) => (
                    <li
                      key={step.index}
                      className="group flex h-11 items-center justify-between gap-2 rounded-sm px-1 transition-colors hover:bg-black/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-5 shrink-0 text-[10px] tracking-[1px] text-black/45">
                          {step.index}
                        </span>
                        <span className="text-sm text-black">{step.label}</span>
                      </div>
                      <Link
                        href={step.href}
                        className="inline-flex shrink-0 items-center gap-1 text-xs text-black/60 group-hover:text-black"
                      >
                        {step.cta} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                id="latest-models"
                className="flex min-h-[260px] flex-col justify-between px-4 py-4 md:px-5 md:py-5"
              >
                <div>
                  <h3 className="mb-3 text-lg font-bold text-[#111111]">
                    Explore models
                  </h3>
                  <p className="text-sm text-black/55">
                    Browse your public model surface and use one slug as the
                    input contract for your client apps.
                  </p>
                </div>
                <ul className="mt-6 divide-y divide-black/5">
                  {latestModels.slice(0, 5).map((model) => (
                    <li key={model.id}>
                      <Link
                        href="#quickstart"
                        className="group -mx-2 flex min-h-11 items-center justify-between gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-black/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-sm text-[11px] font-semibold text-white",
                              model.tone === 0 && "bg-[#1f5f39]",
                              model.tone === 1 && "bg-[#355fb4]",
                              model.tone === 2 && "bg-[#8d5cf6]",
                              model.tone === 3 && "bg-[#d07a1d]"
                            )}
                          >
                            {model.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="line-clamp-1 text-sm text-black">
                              {model.slug}
                            </p>
                            <p className="mt-0.5 text-[11px] text-black/50">
                              {model.capability}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <button
                      type="button"
                      className="group -mx-2 flex h-11 w-[calc(100%+1rem)] items-center justify-between rounded-sm px-2 transition-colors hover:bg-black/[0.04]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex size-8 items-center justify-center rounded-sm bg-[#f4f5f0] text-black/60">
                          <Grid2x2 className="size-3.5" />
                        </span>
                        <span className="text-sm text-black">View all models</span>
                      </div>
                      <ArrowRight className="size-3.5 text-black/50 group-hover:text-black" />
                    </button>
                  </li>
                </ul>
              </section>
            </div>
          </div>

          <article className="mb-6 space-y-3 md:mb-8">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-sm bg-[#f7f7f4] px-4 py-4">
                <div className="flex min-h-[144px] flex-col">
                  <div>
                    <p className="text-xs tracking-[0.3px] text-black/60">
                      Current credit balance
                    </p>
                    <p className="mt-2 text-2xl font-medium tracking-tight text-black">
                      {walletMetric?.value ?? "$0.00"}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <button className="inline-flex h-8 items-center rounded-sm bg-black px-3 text-xs font-medium text-white">
                      Manage credits
                    </button>
                    <button className="inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs">
                      Billing
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-sm bg-[#f7f7f4] px-4 py-4">
                <div className="flex min-h-[144px] flex-col">
                  <div>
                    <p className="text-xs tracking-[0.3px] text-black/60">
                      Requests in last 7 days
                    </p>
                    <p className="mt-2 text-2xl font-medium tracking-tight text-black">
                      {requestsLast7Days}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      href="#requests"
                      className="inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs"
                    >
                      Check history
                    </Link>
                  </div>
                </div>
              </div>

              <div className="rounded-sm bg-[#f7f7f4] px-4 py-4">
                <div className="flex min-h-[144px] flex-col">
                  <div>
                    <p className="text-xs tracking-[0.3px] text-black/60">
                      Models used
                    </p>
                    <p className="mt-2 text-2xl font-medium tracking-tight text-black">
                      {modelsUsed}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                    <Link
                      href="#latest-models"
                      className="inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs"
                    >
                      Check usage
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <div className="rounded-sm border border-black/10 bg-white">
            <div className="flex items-center justify-between gap-3 px-4 pt-4">
              <div className="inline-flex items-center gap-6">
                <button className="border-b-2 border-black py-1 text-sm font-semibold text-black">
                  Latest Models
                </button>
                <button className="py-1 text-sm text-black/55">Favourite</button>
              </div>
              <button className="inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs">
                View all models
              </button>
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
              {latestModels.map((model) => (
                <Link
                  key={model.id}
                  href="#quickstart"
                  className="flex gap-2.5 rounded-sm border border-black/10 p-2 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-sm text-sm font-semibold text-white",
                      model.tone === 0 && "bg-[#1f5f39]",
                      model.tone === 1 && "bg-[#355fb4]",
                      model.tone === 2 && "bg-[#8d5cf6]",
                      model.tone === 3 && "bg-[#d07a1d]"
                    )}
                  >
                    {model.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex flex-col justify-center">
                    <p className="line-clamp-1 text-sm text-black">{model.name}</p>
                    <p className="mt-0.5 text-xs leading-tight text-black/50">
                      {model.capability}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

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
                <span className="text-xs text-black/55">{apiKeys.length} keys</span>
              </div>
            </div>

            <ApiKeysTable apiKeys={apiKeys} />
          </section>

          <section id="requests" className="mt-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-black">Requests</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-black">
                  <span>Show API requests</span>
                  <button
                    type="button"
                    className="inline-flex h-5 w-9 items-center rounded-full bg-black p-0.5"
                  >
                    <span className="block h-4 w-4 translate-x-4 rounded-full bg-white" />
                  </button>
                </label>
                <button className="inline-flex h-8 items-center gap-1 rounded-sm border border-black/10 bg-white px-2.5 text-xs text-black/80">
                  All models
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
                <button className="inline-flex h-8 items-center gap-1 rounded-sm border border-black/10 bg-white px-2.5 text-xs text-black/80">
                  All
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </button>
                <button className="inline-flex h-8 items-center gap-1 rounded-sm border border-black/10 bg-white px-2.5 text-xs text-black/80">
                  <SlidersHorizontal className="size-3.5" />
                  Filters
                </button>
                <button className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-black/10 bg-white text-black/70">
                  <Search className="size-3.5" />
                </button>
              </div>
            </div>

            <div className="rounded-sm border border-black/10 bg-white">
              <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-2.5">
                <CircleAlert className="size-3.5 shrink-0 text-amber-600" />
                <p className="text-xs leading-[1.35] text-amber-900/70">
                  Your outputs are stored for 7 days only. Make sure to download
                  and save them before they expire.
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
                  <table className="min-w-[680px] w-full text-sm">
                    <thead>
                      <tr className="border-b border-black/10 text-left">
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Output
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          ID
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Model
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Status
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Latency
                        </th>
                        <th className="h-10 px-2 text-[10px] tracking-[1px] text-black/50">
                          Action
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
                                  <ImageIcon className="size-4" />
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
                            <td className="px-2 py-3">
                              <button className="inline-flex h-8 items-center gap-1 rounded-sm border border-black/10 bg-white px-3 text-xs">
                                <Download className="size-3.5" />
                                Download
                              </button>
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
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="inline-flex h-9 items-center gap-1 rounded-md px-4 text-xs text-black/50">
                  <ArrowRight className="size-4 rotate-180" />
                  Previous
                </button>
                <button className="hidden h-[34px] items-center rounded-sm border border-black/10 bg-white px-3 text-xs sm:inline-flex">
                  10/page
                  <ChevronDown className="ml-1 h-4 w-4 opacity-50" />
                </button>
              </div>
              <button className="inline-flex h-9 items-center gap-1 rounded-md px-4 text-xs text-black/50">
                Next
                <ArrowRight className="size-4" />
              </button>
            </div>
          </section>
        </section>
      </div>
      <Toaster position="top-right" richColors />
    </main>
  );
}
