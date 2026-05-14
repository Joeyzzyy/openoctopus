"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type ProductTopTabsProps = {
  dashboardHref?: string;
  modelsHref?: string;
  apiKeysHref?: string;
  requestDetailsHref?: string;
  accountHref?: string;
};
type ProductTopTabKey = "dashboard" | "models" | "api-keys" | "request-details" | "account";

export function ProductTopTabs({
  dashboardHref = "/dashboard",
  modelsHref = "/models",
  apiKeysHref = "/dashboard?view=api-keys",
  requestDetailsHref = "/dashboard?view=request-details&requestsPage=1&billingPage=1&analyticsInterval=hour&analyticsRange=24h",
  accountHref = "/dashboard?view=account",
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
        {
          key: "account",
          label: "Account",
          href: accountHref,
          active: pathname === "/dashboard" && dashboardView === "account",
        },
      ] as const,
    [
      accountHref,
      apiKeysHref,
      dashboardHref,
      dashboardView,
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

  useEffect(() => {
    if (!isPending) {
      return;
    }

    const scrollY = window.scrollY;
    const { style } = document.body;
    const previousPosition = style.position;
    const previousTop = style.top;
    const previousWidth = style.width;
    const previousOverflow = style.overflow;

    style.position = "fixed";
    style.top = `-${scrollY}px`;
    style.width = "100%";
    style.overflow = "hidden";

    return () => {
      style.position = previousPosition;
      style.top = previousTop;
      style.width = previousWidth;
      style.overflow = previousOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [isPending]);

  const handleTabClick = (key: ProductTopTabKey, href: string) => {
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
      <div className="sticky top-16 z-30 mb-3 border-b border-[#E7E0D3] bg-[#FCFCFA]/95 backdrop-blur-xl">
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
                    ? "border-[#E58A35] text-[#9A4F18]"
                    : "border-transparent text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {showSpinner ? (
        <div className="fixed inset-x-0 bottom-0 top-16 z-[20] flex items-center justify-center bg-[#FCFCFA]">
          <div className="flex flex-col items-center gap-3">
            <span className="inline-flex size-8 animate-spin rounded-full border-2 border-[#E7E0D3] border-t-[#E58A35]" />
            <span className="text-sm text-[#7B6A55]">Loading...</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
