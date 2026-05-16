"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type InternalTabKey =
  | "public-models"
  | "model-vendors"
  | "economics"
  | "worker-templates"
  | "gateway-error-definitions"
  | "image-response-contracts"
  | "providers"
  | "monitoring"
  | "monitoring-overview"
  | "monitoring-requests"
  | "internal-model-ai-usage-logs";

type TabItem = {
  key: InternalTabKey;
  label: string;
  group: "static" | "dynamic" | "overview";
  count?: number;
};

function buildHref(tab: InternalTabKey, selectedTemplateKey?: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (selectedTemplateKey) {
    params.set("template", selectedTemplateKey);
  }
  return `/internal?${params.toString()}`;
}

export function InternalShell({
  activeTab,
  selectedTemplateKey,
  tabs,
  children,
}: {
  activeTab: InternalTabKey;
  selectedTemplateKey?: string;
  tabs: TabItem[];
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const staticTabs = tabs.filter((tab) => tab.group === "static");
  const dynamicTabs = tabs.filter((tab) => tab.group === "dynamic");
  const overviewTabs = tabs.filter((tab) => tab.group === "overview");

  const renderTabs = (items: TabItem[]) => (
    <nav className="space-y-1.5">
      {items.map((tab) => {
        const active = tab.key === activeTab;
        const href = buildHref(tab.key, selectedTemplateKey);

        return (
          <Link
            key={tab.key}
            href={href}
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => {
                router.push(href);
              });
            }}
            className={`block rounded-lg border px-2.5 py-2 transition-colors ${
              active
                ? "border-[#111827] bg-[#111827] text-white"
                : "border-black/[0.08] bg-[#FCFCFA] text-black/75 hover:bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium leading-5">{tab.label}</p>
              </div>
              {typeof tab.count === "number" ? (
                <span
                  className={`inline-flex min-w-7 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] ${
                    active ? "bg-white/12 text-white" : "bg-white text-black/55"
                  }`}
                >
                  {tab.count}
                </span>
              ) : null}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[244px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-5 lg:self-start">
        <div className="space-y-2.5">
          <div className="rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-sm">
            <p className="mb-1.5 px-1 text-[11px] tracking-[0.3px] text-black/45">静态配置</p>
            {renderTabs(staticTabs)}
          </div>
          <div className="rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-sm">
            <p className="mb-1.5 px-1 text-[11px] tracking-[0.3px] text-black/45">动态配置</p>
            {renderTabs(dynamicTabs)}
          </div>
          <div className="rounded-xl border border-black/[0.08] bg-white p-2.5 shadow-sm">
            <p className="mb-1.5 px-1 text-[11px] tracking-[0.3px] text-black/45">总览数据</p>
            {renderTabs(overviewTabs)}
          </div>
        </div>
      </aside>

      <div className="relative min-w-0">
        {isPending ? (
          <div className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl border border-black/[0.08] bg-[rgba(252,252,250,0.72)] px-6 py-24 backdrop-blur-[2px]">
            <div className="rounded-xl border border-black/[0.08] bg-white px-4 py-3 shadow-[0_18px_40px_rgba(17,24,39,0.06)]">
              <div className="flex items-center gap-3 text-sm text-black/70">
                <span className="inline-flex size-4 animate-spin rounded-full border-2 border-black/15 border-t-black" />
                正在加载当前分区...
              </div>
            </div>
          </div>
        ) : null}

        <div className={isPending ? "pointer-events-none opacity-60" : ""}>{children}</div>
      </div>
    </div>
  );
}
