"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AutoRefreshOnReturn() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const shouldRefresh = searchParams.get("refreshWallet") === "1";
    if (!shouldRefresh) {
      return;
    }

    const timer = window.setTimeout(() => {
      router.refresh();
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("refreshWallet");
      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [pathname, router, searchParams]);

  return null;
}
