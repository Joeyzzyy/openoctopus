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
    if (!alertMessage) {
      return;
    }

    const dedupeKey = `${alertLevel ?? "default"}::${alertMessage}`;
    if (lastShownRef.current === dedupeKey) {
      return;
    }

    lastShownRef.current = dedupeKey;
    if (alertLevel === "success") {
      toast.success(alertMessage);
    } else if (alertLevel === "warning") {
      toast.warning(alertMessage);
    } else if (alertLevel === "info") {
      toast.info(alertMessage);
    } else {
      toast.error(alertMessage);
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("alert");
    nextParams.delete("alertLevel");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  return <Toaster position="top-right" richColors />;
}
