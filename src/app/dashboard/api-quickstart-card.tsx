import { ArrowRight, KeyRound, Send } from "lucide-react";
import {
  buildImageGenerationCurl,
  buildTaskStatusCurl,
  DEFAULT_QUICKSTART_MODEL,
  PUBLIC_API_BASE_URL,
} from "@/lib/api-docs";

export function ApiQuickstartCard() {
  const createExample = buildImageGenerationCurl();
  const taskExample = buildTaskStatusCurl();

  return (
    <section className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.06)] sm:rounded-[28px] sm:p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
            API Quickstart
          </p>
          <h2 className="mt-1 font-mono text-base font-semibold text-[#111111] sm:mt-2 sm:text-xl">
            Everything a user needs to ship the first request
          </h2>
        </div>
        <div className="hidden items-center gap-2 rounded-[12px] border border-black/8 bg-[#f7f5ef] px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#111111] sm:inline-flex sm:h-9">
          <Send className="h-4 w-4" />
          ready to call
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-3">
        <div className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
            Base URL
          </p>
          <code className="mt-2 block break-all font-mono text-[12px] text-[#111111]">
            {PUBLIC_API_BASE_URL}
          </code>
        </div>
        <div className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
            Auth Header
          </p>
          <code className="mt-2 block break-all font-mono text-[12px] text-[#111111]">
            Authorization: Bearer ooq_...
          </code>
        </div>
        <div className="rounded-[14px] border border-black/8 bg-[#faf9f6] p-3 sm:rounded-[18px] sm:p-4">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
            Starter Model
          </p>
          <code className="mt-2 block break-all font-mono text-[12px] text-[#111111]">
            {DEFAULT_QUICKSTART_MODEL}
          </code>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[16px] border border-black/8 bg-[#111111] p-4 text-white sm:rounded-[20px]">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-white/45">
            Flow
          </p>
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] font-semibold">
                1
              </div>
              <div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.8px]">
                  Create key
                </p>
                <p className="mt-1 text-sm leading-6 text-white/72">
                  Create an API key in this dashboard and copy the secret once.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] font-semibold">
                2
              </div>
              <div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.8px]">
                  Submit request
                </p>
                <p className="mt-1 text-sm leading-6 text-white/72">
                  Call the OpenOctopus API endpoint with your model and prompt.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-mono text-[11px] font-semibold">
                3
              </div>
              <div>
                <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.8px]">
                  Poll task status
                </p>
                <p className="mt-1 text-sm leading-6 text-white/72">
                  Use the returned task ID to check progress and fetch results.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[14px] border border-white/10 bg-white/5 p-3">
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-white/45">
              Important
            </p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Users should only call your OpenOctopus domain. Upstream vendors
              stay hidden behind the gateway worker.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[16px] border border-black/8 bg-[#faf9f6] p-4 sm:rounded-[20px]">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-black/45" />
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                First Request
              </p>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-[14px] bg-[#111111] p-4 font-mono text-[11px] leading-6 text-white">
              <code>{createExample}</code>
            </pre>
          </div>

          <div className="rounded-[16px] border border-black/8 bg-[#faf9f6] p-4 sm:rounded-[20px]">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-black/45" />
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Check Task Status
              </p>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-[14px] bg-[#111111] p-4 font-mono text-[11px] leading-6 text-white">
              <code>{taskExample}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
