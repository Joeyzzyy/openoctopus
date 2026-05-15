"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { buildTaskStatusCurl, PUBLIC_API_BASE_URL } from "@/lib/api-docs";

type ModelDocItem = {
  publicModel: string;
  displayName: string;
  capability: string;
  inputSchemaText: string;
  outputSchemaText: string;
  officialDocUrl?: string | null;
  executionConfigText: string;
  requestExampleJson: string | null;
  submitResponseExampleJson: string | null;
  normalizedOutputExampleJson: string | null;
};

type GatewayErrorDocItem = {
  code: string;
  httpStatus: number;
  retryable: boolean;
  publicMessage: string;
  category: string;
};

type LanguageTab = "curl" | "nodejs" | "python" | "go" | "ruby";

function safeParseJsonObject(value: string | null | undefined) {
  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

type FieldDoc = {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
  example?: string;
  exposedToCustomer?: boolean;
};

function extractFieldDocs(schema: Record<string, unknown>, key: "params" | "fields") {
  const raw = schema[key];
  if (!Array.isArray(raw)) {
    return [] as FieldDoc[];
  }

  return raw.reduce<FieldDoc[]>((acc, item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return acc;
      }
      const row = item as Record<string, unknown>;
      const name = typeof row.name === "string" ? row.name.trim() : "";
      if (!name) {
        return acc;
      }
      acc.push({
        name,
        type: typeof row.type === "string" ? row.type : undefined,
        required: typeof row.required === "boolean" ? row.required : undefined,
        description: typeof row.description === "string" ? row.description : undefined,
        example:
          row.example !== undefined && row.example !== null
            ? String(row.example)
            : undefined,
        exposedToCustomer:
          typeof row.exposedToCustomer === "boolean"
            ? row.exposedToCustomer
            : typeof row.customerVisible === "boolean"
            ? row.customerVisible
              : undefined,
      });
      return acc;
    }, []);
}

function FieldDocTable({
  rows,
  kind,
}: {
  rows: FieldDoc[];
  kind: "input" | "output";
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-black/[0.08] bg-white">
      <table className="min-w-full text-xs text-black/75">
        <thead>
          <tr className="border-b border-black/[0.08] bg-[#FCFCFA] text-[10px] uppercase tracking-[0.8px] text-black/45">
            <th className="px-3 py-2 text-left">Field</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">{kind === "input" ? "Required" : "Exposed"}</th>
            <th className="px-3 py-2 text-left">Description</th>
            <th className="px-3 py-2 text-left">Example</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.name}-${index}`} className="border-b border-black/[0.06] align-top last:border-b-0">
              <td className="px-3 py-2 font-mono text-[11px] text-black">{row.name}</td>
              <td className="px-3 py-2">{row.type ?? "-"}</td>
              <td className="px-3 py-2">
                {kind === "input"
                  ? row.required === true
                    ? "Yes"
                    : row.required === false
                      ? "No"
                      : "-"
                  : row.exposedToCustomer === true
                    ? "Yes"
                    : row.exposedToCustomer === false
                      ? "No"
                      : "-"}
              </td>
              <td className="px-3 py-2">{row.description ?? "-"}</td>
              <td className="px-3 py-2 font-mono text-[11px] text-black/65">{row.example ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
        className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-black/[0.12] bg-white text-black/75 transition-colors hover:bg-black/[0.03]"
        aria-label="Copy code"
        title="Copy code"
      >
        {copiedBlock === copyId ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <pre className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-[#F6F8FB] p-4 pr-12 font-mono text-[11px] leading-6 text-[#1F2937]">
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

function buildPollingExamples(taskId = "task_id_from_previous_response") {
  const nodejs = `const timeoutMs = 180000;
const intervalMs = 1800;
const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  const r = await fetch("${PUBLIC_API_BASE_URL}/v1/tasks/${taskId}", {
    headers: { Authorization: "Bearer " + process.env.OPENOCTOPUS_API_KEY },
  });
  const task = await r.json();
  if (!r.ok) throw new Error(task?.error?.message ?? "task query failed");

  if (task.status === "queued" || task.status === "processing") {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    continue;
  }
  if (task.status === "succeeded") {
    console.log(task.output_payload);
    break;
  }
  throw new Error(task?.error_message ?? "task failed");
}`;

  const python = `import time, requests

timeout_s = 180
interval_s = 1.8
started = time.time()

while time.time() - started < timeout_s:
    resp = requests.get(
        "${PUBLIC_API_BASE_URL}/v1/tasks/${taskId}",
        headers={"Authorization": f"Bearer {OPENOCTOPUS_API_KEY}"},
        timeout=30,
    )
    task = resp.json()
    if resp.status_code >= 400:
        raise RuntimeError(task.get("error", {}).get("message", "task query failed"))

    status = task.get("status")
    if status in ("queued", "processing"):
        time.sleep(interval_s)
        continue
    if status == "succeeded":
        print(task.get("output_payload"))
        break
    raise RuntimeError(task.get("error_message", "task failed"))`;

  return { nodejs, python };
}

export function ApiQuickstartCard({
  models,
  initialModel,
  headerControls,
  gatewayErrorDocs,
}: {
  models?: ModelDocItem[];
  initialModel?: string | null;
  headerControls?: React.ReactNode;
  gatewayErrorDocs?: GatewayErrorDocItem[];
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
            executionConfigText: "{}",
            requestExampleJson: null,
            submitResponseExampleJson: null,
            normalizedOutputExampleJson: null,
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
  const [languageTab, setLanguageTab] = useState<LanguageTab>("curl");
  const [activeSection, setActiveSection] = useState<"quickstart" | "input" | "output" | "errors">("quickstart");
  const quickstartRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLDivElement | null>(null);
  const outputRef = useRef<HTMLDivElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedModelSlug(resolvedModel);
  }, [resolvedModel]);

  const selectedModel =
    safeModels.find((item) => item.publicModel === selectedModelSlug) ?? safeModels[0] ?? null;

  const capability = selectedModel?.capability ?? "image generation";
  const providerInputSchema = safeParseJsonObject(selectedModel?.inputSchemaText);
  const providerOutputSchema = safeParseJsonObject(selectedModel?.outputSchemaText);
  const inputFieldDocs = extractFieldDocs(providerInputSchema, "params");
  const outputFieldDocs = extractFieldDocs(providerOutputSchema, "fields");
  const createExamples = buildCreateExamples(selectedModel?.publicModel ?? fallbackModel, capability);
  const pollingExamples = buildPollingExamples();
  const taskExample = buildTaskStatusCurl();
  const executionConfig = safeParseJsonObject(selectedModel?.executionConfigText);
  const protocolModeRaw =
    typeof executionConfig.mode === "string" ? executionConfig.mode.trim().toLowerCase() : "";
  const protocolModeLabel =
    protocolModeRaw === "sync"
      ? "Synchronous"
      : protocolModeRaw === "async"
        ? "Asynchronous Polling"
        : "Auto";

  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  const copyText = async (value: string, block: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedBlock(block);
    toast.success("Copied");
    window.setTimeout(() => setCopiedBlock(null), 1600);
  };

  const tabClass = (active: boolean) =>
    active
      ? "border-[#E58A35] bg-[#FFF1DD] text-[#9A4F18]"
      : "border-[#E7E0D3] bg-white text-[#6B5F4E] hover:bg-[#FFF7EA]";

  const jumpToSection = (section: "quickstart" | "input" | "output" | "errors") => {
    setActiveSection(section);
    const target =
      section === "quickstart"
        ? quickstartRef.current
        : section === "input"
          ? inputRef.current
          : section === "output"
            ? outputRef.current
            : errorRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const embeddedInputSchema = JSON.stringify(
    {
      standard: {
        model: "public model slug (required)",
        prompt: "user prompt (required)",
        input: "provider-specific options (optional object)",
      },
      providerExtension: providerInputSchema,
    },
    null,
    2
  );

  const embeddedOutputSchema = JSON.stringify(
    {
      standard: {
        id: "task id",
        status: "queued | processing | succeeded | failed | cancelled",
        capability: "image_generation | video_generation",
        output_payload: {
          format: "openoctopus.image.output.v1 | openoctopus.video.output.v1",
          assets: "normalized output assets",
          raw: "optional provider raw payload (may be omitted depending on endpoint policy)",
        },
      },
      providerExtension: providerOutputSchema,
    },
    null,
    2
  );

  const currentCreateExample = createExamples[languageTab];
  const safeGatewayErrorDocs =
    gatewayErrorDocs && gatewayErrorDocs.length > 0
      ? gatewayErrorDocs
      : [
          {
            code: "invalid_request",
            httpStatus: 400,
            retryable: false,
            publicMessage: "Request validation failed.",
            category: "validation",
          },
          {
            code: "insufficient_balance",
            httpStatus: 402,
            retryable: false,
            publicMessage: "Insufficient balance.",
            category: "billing",
          },
          {
            code: "provider_timeout",
            httpStatus: 504,
            retryable: true,
            publicMessage: "Upstream provider timeout.",
            category: "upstream",
          },
          {
            code: "internal_error",
            httpStatus: 500,
            retryable: true,
            publicMessage: "Internal server error.",
            category: "internal",
          },
        ];

  return (
    <section className="rounded-[28px] border border-black/[0.08] bg-white p-4 shadow-[0_24px_70px_rgba(17,24,39,0.08)] sm:p-6">
      {headerControls ? (
        <div className="-mx-4 mb-4 border-b border-black/[0.06] bg-white px-4 pb-3 pt-1 sm:-mx-6 sm:px-6">
          {headerControls}
        </div>
      ) : null}
      <div className="grid items-start gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl border border-black/[0.08] bg-[#FCFCFA] p-2 md:sticky md:top-24 md:self-start max-md:static">
          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => jumpToSection("quickstart")}
              className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${tabClass(activeSection === "quickstart")}`}
            >
              Step 1 · Submit & Poll
            </button>
            <button
              type="button"
              onClick={() => jumpToSection("input")}
              className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${tabClass(activeSection === "input")}`}
            >
              Step 2 · Input Params
            </button>
            <button
              type="button"
              onClick={() => jumpToSection("output")}
              className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${tabClass(activeSection === "output")}`}
            >
              Step 3 · Output Params
            </button>
            <button
              type="button"
              onClick={() => jumpToSection("errors")}
              className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${tabClass(activeSection === "errors")}`}
            >
              Step 4 · Error Handling
            </button>
          </nav>
        </aside>
        <div className="space-y-3">
          <div ref={quickstartRef} className="space-y-3">
            <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">Integration Steps</p>
              <ol className="mt-2 space-y-1.5 text-xs leading-5 text-black/70">
                <li>1. Request style: <code className="font-mono">{protocolModeLabel}</code></li>
                <li>2. Send Create Request with your API key and selected model input.</li>
                <li>3. Poll every <code className="font-mono">1.8s</code> for up to <code className="font-mono">180s</code>.</li>
                <li>4. Stop only on <code className="font-mono">succeeded / failed / cancelled</code>.</li>
                <li>5. Parse unified <code className="font-mono">output_payload.assets[]</code> URLs.</li>
              </ol>
            </div>

            <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[1px] text-black/45">Step 1 · Create Request</p>
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
                  <p className="text-[10px] uppercase tracking-[1px] text-black/45">Poll Task Status</p>
                  <p className="mt-1 text-xs leading-5 text-black/55">
                    Use the task ID from create response to poll execution status.
                  </p>
                </div>
              </div>
              <div className="mt-3">
                <CodeBlock code={taskExample} copyId="task" copiedBlock={copiedBlock} onCopy={copyText} />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <CodeBlock code={pollingExamples.nodejs} copyId="task-poll-node" copiedBlock={copiedBlock} onCopy={copyText} />
                <CodeBlock code={pollingExamples.python} copyId="task-poll-python" copiedBlock={copiedBlock} onCopy={copyText} />
              </div>
            </div>

            {selectedModel?.requestExampleJson ? (
              <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">Request Example (From Internal)</p>
                <div className="mt-3">
                  <CodeBlock
                    code={selectedModel.requestExampleJson}
                    copyId="doc-request-example"
                    copiedBlock={copiedBlock}
                    onCopy={copyText}
                  />
                </div>
              </div>
            ) : null}
            {selectedModel?.submitResponseExampleJson ? (
              <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">Submit Response Example</p>
                <div className="mt-3">
                  <CodeBlock
                    code={selectedModel.submitResponseExampleJson}
                    copyId="doc-submit-response-example"
                    copiedBlock={copiedBlock}
                    onCopy={copyText}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div ref={inputRef} className="space-y-3">
            <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
              <div>
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  Input Schema (Standard + Provider Extension)
                </p>
                <p className="mt-1 text-xs leading-5 text-black/55">
                  Standard request contract merged with this model&apos;s upstream input parameters.
                </p>
              </div>
              {inputFieldDocs.length > 0 ? (
                <div className="mt-3">
                  <FieldDocTable rows={inputFieldDocs} kind="input" />
                </div>
              ) : null}
              <div className="mt-3">
                <CodeBlock
                  code={embeddedInputSchema}
                  copyId="input-schema"
                  copiedBlock={copiedBlock}
                  onCopy={copyText}
                />
              </div>
            </div>
          </div>

          <div ref={outputRef} className="space-y-3">
            <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
              <div>
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  Output Schema (Standard + Provider Extension)
                </p>
                <p className="mt-1 text-xs leading-5 text-black/55">
                  Standard output contract merged with provider extension fields.
                </p>
              </div>
              {outputFieldDocs.length > 0 ? (
                <div className="mt-3">
                  <FieldDocTable rows={outputFieldDocs} kind="output" />
                </div>
              ) : null}
              <div className="mt-3">
                <CodeBlock
                  code={embeddedOutputSchema}
                  copyId="output-schema"
                  copiedBlock={copiedBlock}
                  onCopy={copyText}
                />
              </div>
            </div>
            {selectedModel?.normalizedOutputExampleJson ? (
              <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">Final Output Example (Normalized)</p>
                <div className="mt-3">
                  <CodeBlock
                    code={selectedModel.normalizedOutputExampleJson}
                    copyId="doc-normalized-output-example"
                    copiedBlock={copiedBlock}
                    onCopy={copyText}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div ref={errorRef} className="space-y-3">
            <div className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-3.5">
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">Step 4 · Error Handling Guide</p>
              <p className="mt-1 text-xs leading-5 text-black/55">
                Error codes below are loaded from internal gateway error definitions and should be treated as source of truth.
              </p>
              <div className="mt-2 overflow-x-auto rounded-xl border border-black/[0.08] bg-white">
                <table className="min-w-full text-xs text-black/75">
                  <thead>
                    <tr className="border-b border-black/[0.08] bg-[#FCFCFA] text-[10px] uppercase tracking-[0.8px] text-black/45">
                      <th className="px-3 py-2 text-left">Code</th>
                      <th className="px-3 py-2 text-left">HTTP</th>
                      <th className="px-3 py-2 text-left">Retryable</th>
                      <th className="px-3 py-2 text-left">Category</th>
                      <th className="px-3 py-2 text-left">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeGatewayErrorDocs.map((item) => (
                      <tr key={item.code} className="border-b border-black/[0.06] last:border-b-0">
                        <td className="px-3 py-2 font-mono">{item.code}</td>
                        <td className="px-3 py-2">{item.httpStatus}</td>
                        <td className="px-3 py-2">{item.retryable ? "Yes" : "No"}</td>
                        <td className="px-3 py-2">{item.category}</td>
                        <td className="px-3 py-2">{item.publicMessage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 rounded-md border border-black/[0.08] bg-white p-2.5 text-[11px] leading-5 text-black/60">
                Integration rule: for <code>task.status=failed</code>, always read <code>error.code</code> and match the table above; retry only when <code>retryable=true</code>.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
