"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductTopTabsProps = {
  dashboardHref?: string;
  exploreHref?: string;
  modelsHref?: string;
  apiKeysHref?: string;
  requestDetailsHref?: string;
  accountHref?: string;
  isLoggedIn?: boolean;
  labels?: {
    dashboard: string;
    explore: string;
    models: string;
    apiKeys: string;
    requestDetails: string;
    account: string;
  };
};
type ProductTopTabKey =
  | "dashboard"
  | "explore"
  | "models"
  | "api-keys"
  | "request-details"
  | "account";

export function ProductTopTabs({
  dashboardHref = "/dashboard",
  exploreHref = "/dashboard?view=explore",
  modelsHref = "/models",
  apiKeysHref = "/dashboard?view=api-keys",
  requestDetailsHref = "/dashboard?view=request-details&requestsPage=1&billingPage=1&analyticsInterval=minute&analyticsRange=24h",
  accountHref = "/dashboard?view=account",
  isLoggedIn = true,
  labels = {
    dashboard: "Dashboard",
    explore: "Explore",
    models: "Models",
    apiKeys: "API Keys",
    requestDetails: "Request Details",
    account: "Account",
  },
}: ProductTopTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardView = searchParams.get("view") ?? "dashboard";
  const [, startTransition] = useTransition();

  const tabItems = useMemo(
    () =>
      [
        {
          key: "dashboard",
          label: labels.dashboard,
          href: dashboardHref,
          active: pathname === "/dashboard" && dashboardView === "dashboard",
        },
        {
          key: "explore",
          label: labels.explore,
          href: exploreHref,
          active: pathname === "/dashboard" && dashboardView === "explore",
        },
        {
          key: "models",
          label: labels.models,
          href: modelsHref,
          active: pathname === modelsHref || pathname.startsWith(`${modelsHref}/`),
        },
        {
          key: "api-keys",
          label: labels.apiKeys,
          href: apiKeysHref,
          active: pathname === "/dashboard" && dashboardView === "api-keys",
        },
        {
          key: "request-details",
          label: labels.requestDetails,
          href: requestDetailsHref,
          active: pathname === "/dashboard" && dashboardView === "request-details",
        },
        {
          key: "account",
          label: labels.account,
          href: accountHref,
          active: pathname === "/dashboard" && dashboardView === "account",
        },
      ] as const,
    [
      accountHref,
      apiKeysHref,
      dashboardHref,
      dashboardView,
      exploreHref,
      labels,
      modelsHref,
      pathname,
      requestDetailsHref,
    ]
  );
  const currentActiveKey = (tabItems.find((item) => item.active)?.key ?? "dashboard") as ProductTopTabKey;
  const [optimisticActiveKey, setOptimisticActiveKey] = useState(currentActiveKey);

  useEffect(() => {
    setOptimisticActiveKey(currentActiveKey);
  }, [currentActiveKey]);

  const handleTabClick = (key: ProductTopTabKey, href: string) => {
    if (!isLoggedIn && key !== "explore") {
      router.push(`/login?next=${encodeURIComponent(href)}`);
      return;
    }
    if (href === `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`) {
      return;
    }
    setOptimisticActiveKey(key);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <>
      <div className="sticky top-16 z-30 mb-3 border-b border-[#BAE6FD] bg-[#FCFCFA]/95 backdrop-blur-xl">
        <div className="flex items-center gap-1 overflow-x-auto">
          {tabItems.map((item) => {
            const active = optimisticActiveKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabClick(item.key, item.href)}
                className={`inline-flex h-10 shrink-0 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-[#38BDF8] text-[#0369A1]"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
