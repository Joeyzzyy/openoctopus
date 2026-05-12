"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { buildTaskStatusCurl, PUBLIC_API_BASE_URL } from "@/lib/api-docs";

type ModelDocItem = {
  publicModel: string;
  displayName: string;
  capability: string;
  inputSchemaText: string;
  outputSchemaText: string;
  officialDocUrl: string | null;
};

function buildRequestExample(model: string, capability: string) {
  const endpoint = capability.includes("video")
    ? "/v1/videos/generations"
    : "/v1/images/generations";

  const payload = capability.includes("video")
    ? `{
    "model": "${model}",
    "prompt": "a cinematic octopus swimming through a neon underwater city",
    "input": {
      "duration": 5,
      "resolution": "720p"
    }
  }`
    : `{
    "model": "${model}",
    "prompt": "a premium octopus mascot, orange and black, clean background"
  }`;

  return [
    `curl -X POST ${PUBLIC_API_BASE_URL}${endpoint} \\\\`,
    '  -H "Content-Type: application/json" \\\\',
    '  -H "Authorization: Bearer ooq_your_api_key" \\\\',
    `  -d '${payload}'`,
  ].join("\n");
}

export function ApiQuickstartCard({
  models,
  initialModel,
}: {
  models?: ModelDocItem[];
  initialModel?: string | null;
}) {
  const safeModels =
    models && models.length > 0
      ? models
      : [
          {
            publicModel: "openoctopus/seedream-4.5",
            displayName: "Seedream 4.5",
            capability: "image generation",
            inputSchemaText: "{}",
            outputSchemaText: "{}",
            officialDocUrl: null,
          },
        ];

  const fallbackModel = safeModels[0]?.publicModel ?? "openoctopus/seedream-4.5";
  const [selectedModelSlug, setSelectedModelSlug] = useState(
    initialModel && safeModels.some((item) => item.publicModel === initialModel)
      ? initialModel
      : fallbackModel
  );
  const selectedModel =
    safeModels.find((item) => item.publicModel === selectedModelSlug) ?? safeModels[0] ?? null;

  const createExample = buildRequestExample(
    selectedModel?.publicModel ?? fallbackModel,
    selectedModel?.capability ?? "image generation"
  );
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
    | "base"
    | "request"
    | "task"
    | "result-shape"
    | "result-handling"
    | "video-result-shape"
    | "input-schema"
    | "output-schema"
    | null
  >(null);

  const copyText = async (
    value: string,
    block:
      | "base"
      | "request"
      | "task"
      | "result-shape"
      | "result-handling"
      | "video-result-shape"
      | "input-schema"
      | "output-schema"
  ) => {
    await navigator.clipboard.writeText(value);
    setCopiedBlock(block);
    toast.success("Copied");
    window.setTimeout(() => setCopiedBlock(null), 1600);
  };

  const isVideo = Boolean(selectedModel?.capability?.includes("video"));

  return (
    <section className="rounded-[28px] border border-black/[0.08] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.08)] sm:p-6">
      <div>
        <p className="text-[10px] uppercase tracking-[1px] text-black/45">API Quickstart</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#111827] sm:mt-2 sm:text-xl">
          Model-aware API doc from internal configuration
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">
          Select a model. Request examples, official schema notes, and output structure update automatically.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3">
          <p className="text-[10px] uppercase tracking-[1px] text-black/45">Model</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={selectedModelSlug}
              onChange={(event) => setSelectedModelSlug(event.target.value)}
              className="h-9 min-w-[260px] rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/75"
            >
              {safeModels.map((item) => (
                <option key={item.publicModel} value={item.publicModel}>
                  {item.displayName} ({item.publicModel})
                </option>
              ))}
            </select>
            {selectedModel?.officialDocUrl ? (
              <a
                href={selectedModel.officialDocUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/75 transition-colors hover:bg-black/[0.03]"
              >
                Official Upstream Docs
              </a>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">1. Base URL</p>
              <code className="mt-2 block break-all font-mono text-[12px] leading-6 text-[#111827]">
                {PUBLIC_API_BASE_URL}
              </code>
            </div>
            <button
              type="button"
              onClick={() => copyText(PUBLIC_API_BASE_URL, "base")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "base" ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-black/45" />
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">2. First Request</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyText(createExample, "request")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "request" ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
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
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">3. Check Task Status</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyText(taskExample, "task")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "task" ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{taskExample}</code>
          </pre>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <p className="text-[10px] uppercase tracking-[1px] text-black/45">4. Unified Result Contract</p>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{isVideo ? videoResultShape : imageResultShape}</code>
          </pre>
          {!isVideo ? (
            <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
              <code>{imageResultHandlingExample}</code>
            </pre>
          ) : null}
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[1px] text-black/45">5. Model Input Schema (Internal)</p>
            <button
              type="button"
              onClick={() => copyText(selectedModel?.inputSchemaText ?? "{}", "input-schema")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "input-schema" ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{selectedModel?.inputSchemaText ?? "{}"}</code>
          </pre>
        </div>

        <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[1px] text-black/45">6. Model Output Schema (Internal)</p>
            <button
              type="button"
              onClick={() => copyText(selectedModel?.outputSchemaText ?? "{}", "output-schema")}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-[10px] uppercase tracking-[0.8px] text-[#111827] transition-colors hover:bg-black/[0.03]"
            >
              {copiedBlock === "output-schema" ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
            </button>
          </div>
          <pre className="mt-3 overflow-x-auto rounded-2xl bg-[#111827] p-4 font-mono text-[11px] leading-6 text-[#F9FAFB]">
            <code>{selectedModel?.outputSchemaText ?? "{}"}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
