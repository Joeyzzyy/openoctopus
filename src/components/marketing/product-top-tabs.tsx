"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductTopTabsProps = {
  dashboardHref?: string;
  modelsHref?: string;
  apiKeysHref?: string;
  requestDetailsHref?: string;
};

export function ProductTopTabs({
  dashboardHref = "/dashboard",
  modelsHref = "/models",
  apiKeysHref = "/dashboard?view=api-keys",
  requestDetailsHref = "/dashboard?view=request-details",
}: ProductTopTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dashboardView = searchParams.get("view") ?? "dashboard";
  const [isPending, startTransition] = useTransition();

  const tabItems = useMemo(
    () =>
      [
        {
          key: "dashboard",
          label: "Dashboard",
          href: dashboardHref,
          active: pathname === "/dashboard" && dashboardView === "dashboard",
        },
        {
          key: "models",
          label: "Models",
          href: modelsHref,
          active: pathname === modelsHref || pathname.startsWith(`${modelsHref}/`),
        },
        {
          key: "api-keys",
          label: "API Keys",
          href: apiKeysHref,
          active: pathname === "/dashboard" && dashboardView === "api-keys",
        },
        {
          key: "request-details",
          label: "Request Details",
          href: requestDetailsHref,
          active: pathname === "/dashboard" && dashboardView === "request-details",
        },
      ] as const,
    [
      apiKeysHref,
      dashboardHref,
      dashboardView,
      modelsHref,
      pathname,
      requestDetailsHref,
    ]
  );
  const currentActiveKey = tabItems.find((item) => item.active)?.key ?? "dashboard";
  const [optimisticActiveKey, setOptimisticActiveKey] = useState(currentActiveKey);

  useEffect(() => {
    setOptimisticActiveKey(currentActiveKey);
  }, [currentActiveKey]);

  const handleTabClick = (key: string, href: string) => {
    if (href === `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`) {
      return;
    }
    setOptimisticActiveKey(key);
    startTransition(() => {
      router.push(href);
    });
  };

  const showSpinner = isPending;

  return (
    <>
      <div className="sticky top-16 z-30 mb-3 border-b border-black/[0.08] bg-[#FCFCFA]/95 backdrop-blur-xl">
        <div className="flex items-center gap-1">
          {tabItems.map((item) => {
            const active = optimisticActiveKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTabClick(item.key, item.href)}
                className={`inline-flex h-10 items-center border-b-2 px-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-black text-black"
                    : "border-transparent text-black/55 hover:text-black"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {showSpinner ? (
        <div className="fixed inset-x-0 bottom-0 top-[6.5rem] z-[20] flex items-center justify-center bg-[#FCFCFA]">
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex size-8 animate-spin rounded-full border-2 border-black/20 border-t-black" />
            <span className="text-sm text-black/60">Loading...</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
