"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type InternalTabKey =
  | "overview"
  | "public-models"
  | "providers"
  | "credentials"
  | "models"
  | "routes"
  | "requests"
  | "audit";

type TabItem = {
  key: InternalTabKey;
  label: string;
  description: string;
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

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-sm border border-black/10 bg-white p-3">
          <nav className="space-y-2">
            {tabs.map((tab) => {
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
                  className={`block rounded-sm border px-3 py-3 transition-colors ${
                    active
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-[#faf9f6] text-black/75 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{tab.label}</p>
                      <p className={`mt-1 text-xs leading-5 ${active ? "text-white/72" : "text-black/45"}`}>
                        {tab.description}
                      </p>
                    </div>
                    {typeof tab.count === "number" ? (
                      <span
                        className={`inline-flex min-w-8 items-center justify-center rounded-sm px-2 py-1 text-[11px] ${
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
        </div>
      </aside>

      <div className="relative min-w-0">
        {isPending ? (
          <div className="absolute inset-0 z-20 flex items-start justify-center rounded-sm border border-black/10 bg-[rgba(247,246,241,0.72)] px-6 py-24 backdrop-blur-[2px]">
            <div className="rounded-sm border border-black/10 bg-white px-4 py-3 shadow-[0_18px_40px_rgba(17,17,17,0.06)]">
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
