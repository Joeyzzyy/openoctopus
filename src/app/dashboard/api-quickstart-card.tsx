"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  buildImageGenerationCurl,
  buildTaskStatusCurl,
  PUBLIC_API_BASE_URL,
} from "@/lib/api-docs";

export function ApiQuickstartCard() {
  const createExample = buildImageGenerationCurl();
  const taskExample = buildTaskStatusCurl();
  const [copiedBlock, setCopiedBlock] = useState<
    "base" | "auth" | "request" | "task" | null
  >(null);

  const maskedAuthHeader = "Authorization: Bearer ooq_••••••••••••••••";

  const copyText = async (
    value: string,
    block: "base" | "auth" | "request" | "task"
  ) => {
    await navigator.clipboard.writeText(value);
    setCopiedBlock(block);
    toast.success(
      block === "base"
        ? "Base URL copied"
        : block === "auth"
          ? "Authorization header copied"
          : block === "request"
            ? "First request copied"
            : "Task status request copied"
    );
    window.setTimeout(() => setCopiedBlock(null), 1600);
  };

  return (
    <section className="rounded-[24px] border border-[#dce4d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,243,0.96))] p-4 shadow-[0_24px_70px_rgba(68,85,56,0.06)] sm:rounded-[30px] sm:p-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
          API Quickstart
        </p>
        <h2 className="mt-1 font-mono text-lg font-semibold text-[#162319] sm:mt-2 sm:text-xl">
          The shortest path to a working API call
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4f5d50]">
          These are example request templates. Save the real API key when it appears in the create-key dialog, then replace the placeholder in your own request.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-[18px] border border-[#dde5d8] bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                1. Base URL
              </p>
              <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#162319]">
                {PUBLIC_API_BASE_URL}
              </code>
            </div>
            <button
              type="button"
              onClick={() => copyText(PUBLIC_API_BASE_URL, "base")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[12px] border border-[#dde5d8] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.8px] text-[#233125] transition-colors hover:bg-[#f4f8f1]"
            >
              {copiedBlock === "base" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#dde5d8] bg-white px-4 py-3.5">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
              2. Authorization Header
            </p>
            <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#162319]">
              {maskedAuthHeader}
            </code>
            <p className="mt-2 text-sm leading-6 text-[#4f5d50]">
              Example only. Replace the placeholder with the API key you saved when creating the key.
            </p>
          </div>
        </div>

        <div className="rounded-[18px] border border-[#dde5d8] bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-[#6b7868]" />
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                  3. First Request
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4f5d50]">
                Replace the prompt and API key, then submit the request.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(createExample, "request")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[12px] border border-[#dde5d8] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.8px] text-[#233125] transition-colors hover:bg-[#f4f8f1]"
            >
              {copiedBlock === "request" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-[16px] bg-[#17211b] p-4 font-mono text-[11px] leading-6 text-[#f6fbf4]">
            <code>{createExample}</code>
          </pre>
        </div>

        <div className="rounded-[18px] border border-[#dde5d8] bg-white px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-[#6b7868]" />
                <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
                  4. Check Task Status
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#4f5d50]">
                Poll the task endpoint with the returned task id until the result is ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(taskExample, "task")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-[12px] border border-[#dde5d8] bg-white px-3 font-mono text-[10px] uppercase tracking-[0.8px] text-[#233125] transition-colors hover:bg-[#f4f8f1]"
            >
              {copiedBlock === "task" ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </>
              )}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-[16px] bg-[#17211b] p-4 font-mono text-[11px] leading-6 text-[#f6fbf4]">
            <code>{taskExample}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
