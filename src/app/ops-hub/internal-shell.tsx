"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type InternalTabKey =
  | "public-models"
  | "model-vendors"
  | "economics"
  | "worker-templates"
  | "model-type-options"
  | "gateway-error-definitions"
  | "image-response-contracts"
  | "api-smoke"
  | "providers"
  | "monitoring"
  | "monitoring-overview"
  | "monitoring-problems"
  | "monitoring-requests"
  | "internal-model-ai-usage-logs";

type TabItem = {
  key: InternalTabKey;
  label: string;
  group: "static" | "dynamic" | "overview";
};

function buildHref(tab: InternalTabKey, selectedTemplateKey?: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (selectedTemplateKey) {
    params.set("template", selectedTemplateKey);
  }
  return `/ops-hub?${params.toString()}`;
}

export function InternalShell({
  activeTab,
  selectedTemplateKey,
  tabs,
  labels = {
    staticConfig: "静态配置",
    dynamicConfig: "动态配置",
    overviewData: "总览数据",
    loading: "正在加载当前分区...",
  },
  children,
}: {
  activeTab: InternalTabKey;
  selectedTemplateKey?: string;
  tabs: readonly TabItem[];
  labels?: {
    staticConfig: string;
    dynamicConfig: string;
    overviewData: string;
    loading: string;
  };
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
                ? "border-[#0284C7] bg-[#0284C7] text-white"
                : "border-[#BAE6FD] bg-[#F8FCFF] text-[#075985] hover:bg-[#E0F2FE]"
            }`}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium leading-5">{tab.label}</p>
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
          <div className="rounded-xl border border-[#BAE6FD] bg-white p-2.5 shadow-sm">
            <p className="mb-1.5 px-1 text-[11px] tracking-[0.3px] text-[#64748B]">{labels.staticConfig}</p>
            {renderTabs(staticTabs)}
          </div>
          <div className="rounded-xl border border-[#BAE6FD] bg-white p-2.5 shadow-sm">
            <p className="mb-1.5 px-1 text-[11px] tracking-[0.3px] text-[#64748B]">{labels.dynamicConfig}</p>
            {renderTabs(dynamicTabs)}
          </div>
          <div className="rounded-xl border border-[#BAE6FD] bg-white p-2.5 shadow-sm">
            <p className="mb-1.5 px-1 text-[11px] tracking-[0.3px] text-[#64748B]">{labels.overviewData}</p>
            {renderTabs(overviewTabs)}
          </div>
        </div>
      </aside>

      <div className="relative min-w-0">
        {isPending ? (
          <div className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl border border-[#BAE6FD] bg-[rgba(248,252,255,0.78)] px-6 py-24 backdrop-blur-[2px]">
            <div className="rounded-xl border border-[#BAE6FD] bg-white px-4 py-3 shadow-[0_18px_40px_rgba(14,165,233,0.08)]">
              <div className="flex items-center gap-3 text-sm text-black/70">
                <span className="inline-flex size-4 animate-spin rounded-full border-2 border-sky-200 border-t-[#0284C7]" />
                {labels.loading}
              </div>
            </div>
          </div>
        ) : null}

        <div className={isPending ? "pointer-events-none opacity-60" : ""}>{children}</div>
      </div>
    </div>
  );
}
