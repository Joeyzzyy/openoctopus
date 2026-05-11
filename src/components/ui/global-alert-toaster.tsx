"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Toaster, toast } from "sonner";

export function GlobalAlertToaster() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const lastShownRef = useRef<string | null>(null);

  useEffect(() => {
    const alertMessage = searchParams.get("alert");
    const alertLevel = searchParams.get("alertLevel");
    const alertDurationRaw = searchParams.get("alertDurationMs");
    if (!alertMessage) {
      return;
    }

    const dedupeKey = `${alertLevel ?? "default"}::${alertMessage}`;
    if (lastShownRef.current === dedupeKey) {
      return;
    }

    lastShownRef.current = dedupeKey;
    const parsedDuration = alertDurationRaw ? Number(alertDurationRaw) : NaN;
    const duration =
      Number.isFinite(parsedDuration) && parsedDuration >= 1000 && parsedDuration <= 60000
        ? parsedDuration
        : undefined;

    if (alertLevel === "success") {
      toast.success(alertMessage, { duration });
    } else if (alertLevel === "warning") {
      toast.warning(alertMessage, { duration });
    } else if (alertLevel === "info") {
      toast.info(alertMessage, { duration });
    } else {
      toast.error(alertMessage, { duration });
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("alert");
    nextParams.delete("alertLevel");
    nextParams.delete("alertDurationMs");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return <Toaster position="top-right" richColors />;
}
