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
  const flowItems = [
    "Create a key and copy the secret once.",
    "Send a generation request with your OpenOctopus model slug.",
    "Poll the task endpoint until the result is ready.",
  ];

  return (
    <section className="rounded-[24px] border border-[#dce4d8] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,243,0.96))] p-4 shadow-[0_24px_70px_rgba(68,85,56,0.06)] sm:rounded-[30px] sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
            API Quickstart
          </p>
          <h2 className="mt-1 font-mono text-lg font-semibold text-[#162319] sm:mt-2 sm:text-xl">
            The shortest path to a working API call
          </h2>
        </div>
        <div className="hidden items-center gap-2 rounded-[12px] border border-[#dde5d8] bg-white px-3 font-mono text-[10px] uppercase tracking-[1px] text-[#233125] sm:inline-flex sm:h-9">
          <Send className="h-4 w-4" />
          ready to call
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:mt-6 md:grid-cols-3">
        <div className="rounded-[16px] border border-[#dde5d8] bg-white p-3.5 sm:rounded-[18px] sm:p-4">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
            Base URL
          </p>
          <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#162319]">
            {PUBLIC_API_BASE_URL}
          </code>
        </div>
        <div className="rounded-[16px] border border-[#dde5d8] bg-white p-3.5 sm:rounded-[18px] sm:p-4">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
            Auth Header
          </p>
          <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#162319]">
            Authorization: Bearer ooq_...
          </code>
        </div>
        <div className="rounded-[16px] border border-[#dde5d8] bg-white p-3.5 sm:rounded-[18px] sm:p-4">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
            Starter Model
          </p>
          <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#162319]">
            {DEFAULT_QUICKSTART_MODEL}
          </code>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-[#dbe5d7] bg-[linear-gradient(180deg,#f7fbf4,#eef5ea)] p-4 sm:mt-6 sm:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
          Flow
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {flowItems.map((item, index) => (
            <div
              key={item}
              className="flex items-start gap-3 rounded-[16px] border border-[#dbe5d7] bg-white/80 px-3.5 py-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white font-mono text-[11px] font-semibold text-[#27412e] shadow-[0_8px_20px_rgba(39,65,46,0.08)]">
                {index + 1}
              </div>
              <p className="text-sm leading-6 text-[#4f5d50]">{item}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm leading-6 text-[#4f5d50]">
          Users only call your OpenOctopus domain. Upstream providers stay
          behind the gateway worker.
        </p>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <div className="rounded-[20px] border border-[#dde5d8] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#6b7868]" />
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
              First Request
            </p>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-[16px] bg-[#17211b] p-4 font-mono text-[11px] leading-6 text-[#f6fbf4]">
            <code>{createExample}</code>
          </pre>
        </div>

        <div className="rounded-[20px] border border-[#dde5d8] bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-[#6b7868]" />
            <p className="font-mono text-[10px] uppercase tracking-[1px] text-[#6b7868]">
              Check Task Status
            </p>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-[16px] bg-[#17211b] p-4 font-mono text-[11px] leading-6 text-[#f6fbf4]">
            <code>{taskExample}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
