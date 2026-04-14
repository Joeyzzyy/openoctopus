"use client";

import { useCallback, useState } from "react";
import { X } from "lucide-react";

export function Banner() {
  const [isVisible, setIsVisible] = useState(true);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    document.documentElement.style.setProperty("--banner-h", "0px");
  }, []);

  return (
    <div
      className="fixed top-0 z-[60] w-full overflow-hidden transition-all duration-300"
      style={{
        background: "linear-gradient(90deg, #9A4E2C 0%, #C27B3B 100%)",
        height: isVisible ? "36px" : "0px",
      }}
    >
      <div className="relative mx-auto flex h-[36px] max-w-7xl items-center justify-center gap-1.5 px-4 text-center text-[11px] font-medium text-white sm:gap-2 sm:text-xs cursor-pointer">
        <span className="uppercase tracking-[0.6px] opacity-90">
          Nano Banana 2 & Pro Sale —{" "}
          <span className="font-semibold">15% OFF</span> | Apr 1–15
        </span>
        <button
          onClick={dismiss}
          className="absolute right-2 rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white sm:right-4"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
