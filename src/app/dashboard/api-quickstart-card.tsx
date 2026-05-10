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
  const imageResultShape = `{
  "id": "task_id",
  "status": "succeeded",
  "capability": "image_generation",
  "output_payload": {
    "format": "openoctopus.image.output.v1",
    "raw": { "...": "provider payload" },
    "assets": [
      {
        "id": "0",
        "index": 0,
        "type": "image",
        "url": "data:image/...;base64,... | /v1/files/:requestId/assets/:assetIndex | https://...",
        "sourceUrl": "optional",
        "mimeType": "image/png"
      }
    ]
  }
}`;
  const imageResultHandlingExample = `const task = await fetch("/v1/tasks/{id}", {
  headers: { Authorization: "Bearer " + process.env.OPENOCTOPUS_API_KEY }
}).then((res) => res.json());

if (task.status !== "succeeded") throw new Error("Task not completed");
if (task.output_payload?.format !== "openoctopus.image.output.v1") {
  throw new Error("Unexpected output format");
}

const imageAsset = task.output_payload?.assets?.find(
  (asset) => asset?.type === "image" && typeof asset?.url === "string"
);
if (!imageAsset) throw new Error("No image asset returned");

// Browser: <img src={imageAsset.url} />
console.log("image url:", imageAsset.url);`;
  const videoResultShape = `{
  "id": "task_id",
  "status": "succeeded",
  "capability": "video_generation",
  "output_payload": {
    "format": "openoctopus.video.output.v1",
    "raw": { "...": "provider payload" },
    "assets": [
      {
        "id": "0",
        "index": 0,
        "type": "video",
        "url": "https://... | /v1/files/:requestId/assets/:assetIndex",
        "mimeType": "video/mp4",
        "durationSeconds": 5
      }
    ]
  }
}`;
  const [copiedBlock, setCopiedBlock] = useState<
    "base" | "auth" | "request" | "task" | "result-shape" | "result-handling" | "video-result-shape" | null
  >(null);

  const maskedAuthHeader = "Authorization: Bearer ooq_••••••••••••••••";

  const copyText = async (
    value: string,
    block: "base" | "auth" | "request" | "task" | "result-shape" | "result-handling" | "video-result-shape"
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
            : block === "task"
              ? "Task status request copied"
              : block === "result-shape"
                ? "Result shape copied"
                : block === "result-handling"
                  ? "Result handling snippet copied"
                  : "Video result shape copied"
    );
    window.setTimeout(() => setCopiedBlock(null), 1600);
  };

  return (
    <section className="rounded-[28px] border border-black/[0.08] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.08)] sm:p-6">
      <div>
        <p className="text-[10px] uppercase tracking-[1px] text-black/45">
          API Quickstart
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#111827] sm:mt-2 sm:text-xl">
          The shortest path to a working API call
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
          These are example request templates. Save the real API key when it appears in the create-key dialog, then replace the placeholder in your own request.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                1. Base URL
              </p>
              <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#111827]">
                {PUBLIC_API_BASE_URL}
              </code>
            </div>
            <button
              type="button"
              onClick={() => copyText(PUBLIC_API_BASE_URL, "base")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
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

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[1px] text-black/45">
              2. Authorization Header
            </p>
            <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#111827]">
              {maskedAuthHeader}
            </code>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Example only. Replace the placeholder with the API key you saved when creating the key.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-black/45" />
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  3. First Request
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-black/60">
                Replace the prompt and API key, then submit the request.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(createExample, "request")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
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
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{createExample}</code>
          </pre>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-black/45" />
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  4. Check Task Status
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-black/60">
                Poll the task endpoint with the returned task id until the result is ready.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(taskExample, "task")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
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
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{taskExample}</code>
          </pre>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                5. Image Result Contract
              </p>
              <p className="mt-2 text-sm leading-6 text-black/60">
                For image tasks, always read <code>output_payload.assets</code>. Do not parse provider-specific fields from <code>output_payload.raw</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(imageResultShape, "result-shape")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "result-shape" ? (
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
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{imageResultShape}</code>
          </pre>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                6. Image Result Handling
              </p>
              <p className="mt-2 text-sm leading-6 text-black/60">
                Use a single parsing path for all image providers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(imageResultHandlingExample, "result-handling")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "result-handling" ? (
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
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{imageResultHandlingExample}</code>
          </pre>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                7. Video Result Contract
              </p>
              <p className="mt-2 text-sm leading-6 text-black/60">
                For video tasks, parse <code>output_payload.format</code> and <code>output_payload.assets[0].url</code> the same way.
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyText(videoResultShape, "video-result-shape")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "video-result-shape" ? (
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
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{videoResultShape}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
