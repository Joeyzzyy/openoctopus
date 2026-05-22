"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

const CYCLE_DURATION_MS = 8400;

const HERO_ORBIT_POSITIONS = [
  { x: "7%", y: "11%", delay: "0s" },
  { x: "31%", y: "4%", delay: "0.04s" },
  { x: "70%", y: "8%", delay: "0.08s" },
  { x: "86%", y: "28%", delay: "0.12s" },
  { x: "78%", y: "68%", delay: "0.16s" },
  { x: "58%", y: "84%", delay: "0.2s" },
  { x: "26%", y: "80%", delay: "0.24s" },
  { x: "6%", y: "66%", delay: "0.28s" },
  { x: "16%", y: "38%", delay: "0.32s" },
  { x: "65%", y: "31%", delay: "0.36s" },
  { x: "43%", y: "17%", delay: "0.4s" },
  { x: "41%", y: "67%", delay: "0.44s" },
];

const LOGO_BUBBLES = [
  {
    name: "OpenAI",
    image:
      "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/light/openai.png",
  },
  {
    name: "Gemini",
    image:
      "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/gemini-color.png",
  },
  {
    name: "Claude",
    image:
      "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/claude-color.png",
  },
  {
    name: "Flux",
    image: "https://www.mindvideo.ai/images/ai-models/flux.webp",
  },
  {
    name: "Kling",
    image:
      "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/kling-color.png",
  },
  {
    name: "Runway",
    image: "https://www.mindvideo.ai/images/ai-models/runway.webp",
  },
  {
    name: "Veo",
    image:
      "https://registry.npmmirror.com/@lobehub/icons-static-png/1.24.0/files/dark/google-color.png",
  },
  {
    name: "Vidu",
    image: "https://www.mindvideo.ai/images/ai-models/vidu.webp",
  },
];

const BUBBLE_ORBS = [
  { size: 14, x: "42%", y: "35%", delay: "0s" },
  { size: 20, x: "67%", y: "16%", delay: "0.05s" },
  { size: 11, x: "80%", y: "42%", delay: "0.1s" },
  { size: 16, x: "24%", y: "22%", delay: "0.15s" },
  { size: 10, x: "18%", y: "54%", delay: "0.22s" },
  { size: 18, x: "58%", y: "78%", delay: "0.28s" },
];

const TENTACLES = [
  { d: "M190 238C154 258 116 314 112 384C108 444 140 478 184 476", delay: "0s" },
  { d: "M212 248C192 280 170 346 178 408C184 456 212 480 246 478", delay: "0.14s" },
  { d: "M238 252C232 298 234 364 252 420C266 462 298 480 328 472", delay: "0.22s" },
  { d: "M322 252C330 296 354 362 382 410C406 450 438 468 470 460", delay: "0.1s" },
  { d: "M348 246C374 280 404 336 416 394C428 444 454 470 494 468", delay: "0.26s" },
  { d: "M370 236C410 258 456 308 474 370C490 426 474 460 438 474", delay: "0.18s" },
];

export function ThreeOctopusHero() {
  const autoplayRef = useRef<number | null>(null);
  const cycleTimerRef = useRef<number | null>(null);
  const [cycleVersion, setCycleVersion] = useState(0);
  const [showCycle, setShowCycle] = useState(false);

  useEffect(() => {
    const triggerCycle = () => {
      setShowCycle(false);
      setCycleVersion((current) => current + 1);
      window.setTimeout(() => setShowCycle(true), 0);

      if (cycleTimerRef.current) {
        window.clearTimeout(cycleTimerRef.current);
      }

      cycleTimerRef.current = window.setTimeout(() => {
        setShowCycle(false);
        cycleTimerRef.current = null;
      }, CYCLE_DURATION_MS);
    };

    const initial = window.setTimeout(() => {
      triggerCycle();
    }, 700);

    autoplayRef.current = window.setInterval(() => {
      triggerCycle();
    }, 9800);

    return () => {
      window.clearTimeout(initial);
      if (autoplayRef.current) {
        window.clearInterval(autoplayRef.current);
      }
      if (cycleTimerRef.current) {
        window.clearTimeout(cycleTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-sky-950/[0.06] bg-[radial-gradient(circle_at_top,_rgba(186,230,253,0.45),_rgba(255,255,255,0.98)_54%,_rgba(240,249,255,0.94)_100%)]">
      <div className="mx-auto max-w-7xl px-6 pb-4 pt-6 md:px-8 md:pb-6 md:pt-8">
        <div className="relative overflow-hidden rounded-[34px] border border-sky-950/[0.08] bg-white/80 shadow-[0_18px_64px_rgba(14,165,233,0.08)] backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(56,189,248,0.16),transparent_26%),radial-gradient(circle_at_50%_85%,rgba(125,211,252,0.18),transparent_24%)]" />
          <button
            type="button"
            onClick={() => {
              setShowCycle(false);
              setCycleVersion((current) => current + 1);
              window.setTimeout(() => setShowCycle(true), 0);

              if (cycleTimerRef.current) {
                window.clearTimeout(cycleTimerRef.current);
              }

              cycleTimerRef.current = window.setTimeout(() => {
                setShowCycle(false);
                cycleTimerRef.current = null;
              }, CYCLE_DURATION_MS);
            }}
            className="relative block h-[320px] w-full cursor-pointer bg-transparent p-0 text-left sm:h-[360px] md:h-[400px]"
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-[52%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#38BDF8]/8 blur-2xl" />

              {BUBBLE_ORBS.map((bubble, index) =>
                showCycle ? (
                  <span
                    key={`${cycleVersion}-${index}`}
                    className="absolute left-1/2 top-[52%] rounded-full border border-sky-300/65 bg-white/70 shadow-[0_10px_24px_rgba(56,189,248,0.14)]"
                    style={
                      {
                        width: `${bubble.size}px`,
                        height: `${bubble.size}px`,
                        "--orbit-x": bubble.x,
                        "--orbit-y": bubble.y,
                        "--orbit-delay": bubble.delay,
                        animation: "hero-orbit-logo-cycle 8.4s cubic-bezier(0.65, 0, 0.35, 1) 1",
                        animationFillMode: "both",
                      } as CSSProperties
                    }
                  />
                ) : null
              )}

              {LOGO_BUBBLES.map((model, index) =>
                showCycle ? (
                  <div
                    key={`${cycleVersion}-${model.name}`}
                    className="hero-orbit-logo absolute z-20 flex size-12 items-center justify-center rounded-2xl border border-black/[0.08] bg-white/94 p-2.5 shadow-[0_14px_34px_rgba(28,25,23,0.10)] backdrop-blur md:size-14 md:p-3"
                    style={
                      {
                        "--orbit-x": HERO_ORBIT_POSITIONS[index % HERO_ORBIT_POSITIONS.length].x,
                        "--orbit-y": HERO_ORBIT_POSITIONS[index % HERO_ORBIT_POSITIONS.length].y,
                        "--orbit-delay": HERO_ORBIT_POSITIONS[index % HERO_ORBIT_POSITIONS.length].delay,
                        animationIterationCount: "1",
                        animationFillMode: "both",
                      } as CSSProperties
                    }
                    title={model.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={model.image}
                      alt={model.name}
                      className="h-full w-full object-contain"
                      loading="lazy"
                    />
                  </div>
                ) : null
              )}
            </div>

            <div className="absolute inset-0 flex items-center justify-center">
              <div
                key={cycleVersion}
                className="hero-svg-octopus relative h-[250px] w-[300px] md:h-[300px] md:w-[360px]"
              >
                <svg
                  viewBox="0 0 640 560"
                  className="h-full w-full overflow-visible"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="octoBody" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0b1220" />
                      <stop offset="100%" stopColor="#020617" />
                    </linearGradient>
                    <linearGradient id="octoFace" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#111827" />
                      <stop offset="100%" stopColor="#1f2937" />
                    </linearGradient>
                  </defs>

                  {TENTACLES.map((tentacle, index) => (
                    <path
                      key={index}
                      d={tentacle.d}
                      className="hero-svg-tentacle"
                      style={{ animationDelay: tentacle.delay } as CSSProperties}
                      fill="none"
                      stroke="url(#octoBody)"
                      strokeWidth="30"
                      strokeLinecap="round"
                    />
                  ))}

                  <ellipse
                    className="hero-svg-shadow"
                    cx="320"
                    cy="480"
                    rx="170"
                    ry="28"
                    fill="rgba(14,165,233,0.12)"
                  />

                  <g className="hero-svg-head">
                    <path
                      d="M194 224C194 142 250 82 320 82C390 82 446 142 446 224C446 314 392 382 320 382C248 382 194 314 194 224Z"
                      fill="url(#octoBody)"
                    />
                    <path
                      d="M232 216C232 160 270 118 320 118C370 118 408 160 408 216C408 280 366 326 320 326C274 326 232 280 232 216Z"
                      fill="url(#octoFace)"
                    />

                    <path
                      d="M252 180C280 148 360 146 388 180"
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth="16"
                      strokeLinecap="round"
                    />

                    <path
                      className="hero-svg-eye-left"
                      d="M246 204C274 172 322 170 344 196C322 220 278 228 246 204Z"
                      fill="#f8fafc"
                    />
                    <path
                      className="hero-svg-eye-right"
                      d="M394 204C366 172 318 170 296 196C318 220 362 228 394 204Z"
                      fill="#f8fafc"
                    />

                    <ellipse
                      className="hero-svg-mouth"
                      cx="320"
                      cy="258"
                      rx="20"
                      ry="13"
                      fill="none"
                      stroke="#cbd5e1"
                      strokeWidth="10"
                    />
                  </g>
                </svg>
              </div>
            </div>
          </button>
        </div>
      </div>
    </section>
  );
}
