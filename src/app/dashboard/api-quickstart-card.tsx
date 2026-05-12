"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
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

type MainTab = "quickstart" | "response" | "schemas";
type LanguageTab = "curl" | "nodejs" | "python" | "go" | "ruby";

function CodeBlock({
  code,
  copyId,
  copiedBlock,
  onCopy,
}: {
  code: string;
  copyId: string;
  copiedBlock: string | null;
  onCopy: (value: string, block: string) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onCopy(code, copyId)}
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-white/20 bg-black/40 text-white/85 transition-colors hover:bg-black/60"
        aria-label="Copy code"
        title="Copy code"
      >
        {copiedBlock === copyId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="overflow-x-auto rounded-2xl bg-[#111827] p-4 pr-12 font-mono text-[11px] leading-6 text-[#F9FAFB]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function buildPayload(model: string, capability: string) {
  if (capability.includes("video")) {
    return `{
  "model": "${model}",
  "prompt": "a cinematic octopus swimming through a neon underwater city",
  "input": {
    "duration": 5,
    "resolution": "720p"
  }
}`;
  }

  return `{
  "model": "${model}",
  "prompt": "a premium octopus mascot, orange and black, clean background"
}`;
}

function buildEndpoint(capability: string) {
  return capability.includes("video") ? "/v1/videos/generations" : "/v1/images/generations";
}

function buildCreateExamples(model: string, capability: string) {
  const endpoint = buildEndpoint(capability);
  const payload = buildPayload(model, capability);
  const compactPayload = payload.replace(/\n\s*/g, " ").replace(/\s+/g, " ").trim();

  const curl = [
    `curl -X POST ${PUBLIC_API_BASE_URL}${endpoint} \\\\`,
    '  -H "Content-Type: application/json" \\\\',
    '  -H "Authorization: Bearer ooq_your_api_key" \\\\',
    `  -d '${payload}'`,
  ].join("\n");

  const nodejs = `const response = await fetch("${PUBLIC_API_BASE_URL}${endpoint}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + process.env.OPENOCTOPUS_API_KEY,
  },
  body: JSON.stringify(${payload}),
});

const data = await response.json();
console.log(data);`;

  const python = `import requests

url = "${PUBLIC_API_BASE_URL}${endpoint}"
headers = {
    "Authorization": f"Bearer {"{"}OPENOCTOPUS_API_KEY{"}"}",
    "Content-Type": "application/json",
}
payload = ${payload}

resp = requests.post(url, headers=headers, json=payload, timeout=180)
print(resp.json())`;

  const go = `package main

import (
  "bytes"
  "fmt"
  "io"
  "net/http"
)

func main() {
  body := []byte(${JSON.stringify(compactPayload)})

  req, _ := http.NewRequest("POST", "${PUBLIC_API_BASE_URL}${endpoint}", bytes.NewBuffer(body))
  req.Header.Set("Authorization", "Bearer "+"ooq_your_api_key")
  req.Header.Set("Content-Type", "application/json")

  client := &http.Client{}
  resp, err := client.Do(req)
  if err != nil {
    panic(err)
  }
  defer resp.Body.Close()

  out, _ := io.ReadAll(resp.Body)
  fmt.Println(string(out))
}`;

  const ruby = `require "net/http"
require "json"

uri = URI("${PUBLIC_API_BASE_URL}${endpoint}")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

request = Net::HTTP::Post.new(uri)
request["Authorization"] = "Bearer #{ENV["OPENOCTOPUS_API_KEY"]}"
request["Content-Type"] = "application/json"
request.body = ${payload}.to_json

response = http.request(request)
puts response.body`;

  return { curl, nodejs, python, go, ruby };
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
  const resolvedModel = useMemo(
    () =>
      initialModel && safeModels.some((item) => item.publicModel === initialModel)
        ? initialModel
        : fallbackModel,
    [initialModel, safeModels, fallbackModel]
  );

  const [selectedModelSlug, setSelectedModelSlug] = useState(resolvedModel);
  const [mainTab, setMainTab] = useState<MainTab>("quickstart");
  const [languageTab, setLanguageTab] = useState<LanguageTab>("curl");

  useEffect(() => {
    setSelectedModelSlug(resolvedModel);
  }, [resolvedModel]);

  const selectedModel =
    safeModels.find((item) => item.publicModel === selectedModelSlug) ?? safeModels[0] ?? null;

  const capability = selectedModel?.capability ?? "image generation";
  const createExamples = buildCreateExamples(selectedModel?.publicModel ?? fallbackModel, capability);
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

  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyText = async (value: string, block: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedBlock(block);
    toast.success("Copied");
    window.setTimeout(() => setCopiedBlock(null), 1600);
  };

  const tabClass = (active: boolean) =>
    active
      ? "border-black bg-black text-white"
      : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]";

  const currentCreateExample = createExamples[languageTab];
  const isVideo = capability.includes("video");

  return (
    <section className="rounded-[28px] border border-black/[0.08] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.08)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[10px] uppercase tracking-[1px] text-black/45">API Quickstart</p>
        {selectedModel?.officialDocUrl ? (
          <a
            href={selectedModel.officialDocUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 cursor-pointer items-center rounded-md border border-black/[0.08] bg-white px-3 text-xs text-black/75 transition-colors hover:bg-black/[0.03]"
          >
            Official Upstream Docs
          </a>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setMainTab("quickstart")}
          className={`inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs font-medium transition-colors ${tabClass(mainTab === "quickstart")}`}
        >
          Quickstart
        </button>
        <button
          type="button"
          onClick={() => setMainTab("response")}
          className={`inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs font-medium transition-colors ${tabClass(mainTab === "response")}`}
        >
          Response Contract
        </button>
        <button
          type="button"
          onClick={() => setMainTab("schemas")}
          className={`inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-xs font-medium transition-colors ${tabClass(mainTab === "schemas")}`}
        >
          Model Schemas
        </button>
      </div>

      {mainTab === "quickstart" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[1px] text-black/45">How This Flow Works</p>
            <ol className="mt-2 space-y-1.5 text-xs leading-5 text-black/70">
              <li>1. Use Base URL as your API host for all generation endpoints.</li>
              <li>1. Send Create Request with your API key and selected model input.</li>
              <li>2. Poll Check Task Status until status becomes <code className="font-mono">succeeded</code>.</li>
              <li>3. Parse the unified output payload for image/video asset URLs.</li>
            </ol>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">Create Request</p>
                <p className="mt-1 text-xs leading-5 text-black/55">
                  Submit generation input. Choose a backend language example below.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["curl", "nodejs", "python", "go", "ruby"] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguageTab(lang)}
                    className={`inline-flex h-8 cursor-pointer items-center rounded-md border px-3 text-[11px] font-medium transition-colors ${tabClass(languageTab === lang)}`}
                  >
                    {lang === "nodejs" ? "Node.js" : lang === "python" ? "Python" : lang === "go" ? "Go" : lang === "ruby" ? "Ruby" : "cURL"}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <CodeBlock
                code={currentCreateExample}
                copyId={`create-${languageTab}`}
                copiedBlock={copiedBlock}
                onCopy={copyText}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
            <div>
              <div>
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">Check Task Status</p>
                <p className="mt-1 text-xs leading-5 text-black/55">
                  Use the task ID from create response to poll execution status.
                </p>
              </div>
            </div>
            <div className="mt-3">
              <CodeBlock code={taskExample} copyId="task" copiedBlock={copiedBlock} onCopy={copyText} />
            </div>
          </div>
        </div>
      ) : null}

      {mainTab === "response" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
            <p className="text-[10px] uppercase tracking-[1px] text-black/45">Unified Result Contract</p>
            <div className="mt-3">
              <CodeBlock
                code={isVideo ? videoResultShape : imageResultShape}
                copyId="result"
                copiedBlock={copiedBlock}
                onCopy={copyText}
              />
            </div>
          </div>
        </div>
      ) : null}

      {mainTab === "schemas" ? (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
            <div>
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">Model Input Schema (Internal)</p>
            </div>
            <div className="mt-3">
              <CodeBlock
                code={selectedModel?.inputSchemaText ?? "{}"}
                copyId="input-schema"
                copiedBlock={copiedBlock}
                onCopy={copyText}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
            <div>
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">Model Output Schema (Internal)</p>
            </div>
            <div className="mt-3">
              <CodeBlock
                code={selectedModel?.outputSchemaText ?? "{}"}
                copyId="output-schema"
                copiedBlock={copiedBlock}
                onCopy={copyText}
              />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
