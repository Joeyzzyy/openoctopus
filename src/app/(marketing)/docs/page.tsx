import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  ArrowRight,
  BookOpen,
  CircleDollarSign,
  Code2,
  FileCode2,
  Image,
  KeyRound,
  ListChecks,
  MonitorPlay,
  MessageSquareText,
  PlayCircle,
  ShieldAlert,
  Sparkles,
  Video,
} from "lucide-react";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";
import { createClient } from "@/lib/supabase/server";
import {
  buildTaskStatusCurl,
  PUBLIC_API_BASE_URL,
} from "@/lib/api-docs";
import {
  type GatewayErrorDocRow,
  type ModelDocRow,
  loadModelsPageData,
} from "@/app/(marketing)/models/data";
import { DocsTocNav } from "./docs-toc-nav";
import { CopyCodeButton } from "./copy-code-button";

export const metadata = {
  title: "Documentation — OpenOctopus",
  description:
    "OpenOctopus developer documentation for CLI usage, API authentication, supported endpoints, model catalog, task polling, billing, and error handling.",
};

const pageSections = [
  { id: "introduction", label: "Introduction" },
  { id: "authentication", label: "Authentication" },
  { id: "cli", label: "CLI" },
  { id: "coding-agents", label: "Coding Agents" },
  { id: "rest-api", label: "REST API" },
  { id: "models", label: "Models" },
  { id: "tasks", label: "Tasks" },
  { id: "errors", label: "Errors" },
] as const;

const endpointRows = [
  {
    method: "GET",
    path: "/v1/models",
    label: "List active public models and provider routes.",
    anchor: "list-models",
  },
  {
    method: "POST",
    path: "/v1/images/generations",
    label: "Submit a text-to-image generation request.",
    anchor: "generate-images",
  },
  {
    method: "POST",
    path: "/v1/images/edits",
    label: "Submit an image edit request with input image URLs.",
    anchor: "edit-images",
  },
  {
    method: "POST",
    path: "/v1/chat/completions",
    label: "Submit a chat completion request for text-generation models.",
    anchor: "chat-completions",
  },
  {
    method: "POST",
    path: "/v1/videos/generations",
    label: "Submit a video generation request.",
    anchor: "generate-videos",
  },
  {
    method: "GET",
    path: "/v1/tasks/:id",
    label: "Poll queued, processing, succeeded, or failed task state.",
    anchor: "get-task",
  },
  {
    method: "GET",
    path: "/v1/files/:requestId/assets/:assetIndex",
    label: "Read a generated image or video asset returned in task output.",
    anchor: "files",
  },
] as const;

const capabilityMeta = {
  image_generation: {
    label: "Image generation",
    endpoint: "/v1/images/generations",
    icon: Image,
  },
  image_edit: {
    label: "Image editing",
    endpoint: "/v1/images/edits",
    icon: Sparkles,
  },
  text_generation: {
    label: "Chat completions",
    endpoint: "/v1/chat/completions",
    icon: MessageSquareText,
  },
  video_generation: {
    label: "Video generation",
    endpoint: "/v1/videos/generations",
    icon: Video,
  },
} as const;

async function loadDocsData() {
  try {
    return await loadModelsPageData();
  } catch {
    return {
      modelDocRows: [] as ModelDocRow[],
      vendorOptions: [] as string[],
      gatewayErrorDocs: [] as GatewayErrorDocRow[],
    };
  }
}

function capabilityLabel(capability: string) {
  return capabilityMeta[capability as keyof typeof capabilityMeta]?.label ?? capability.replaceAll("_", " ");
}

function slugifyPathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildModelTabHref(model: ModelDocRow, tab: "playground" | "api") {
  const providerSlug = slugifyPathPart(model.providerName) || encodeURIComponent(model.providerName);
  const modelSlug = slugifyPathPart(model.publicModel) || encodeURIComponent(model.publicModel);
  return `/models/${providerSlug}/${modelSlug}?tab=${tab}`;
}

function formatPrice(model: ModelDocRow) {
  if (model.primaryPriceValue === null || !model.primaryPriceLabel) {
    return model.priceLabel || "Configured per model";
  }

  const value = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: model.billingCurrency || "USD",
    minimumFractionDigits: model.primaryPriceValue >= 0.1 ? 2 : 3,
    maximumFractionDigits: model.primaryPriceValue >= 0.1 ? 2 : 3,
  }).format(model.primaryPriceValue);
  return `${value} ${model.primaryPriceLabel}`;
}

function buildCapabilitySummaries(models: ModelDocRow[]) {
  const counts = new Map<string, number>();
  for (const model of models) {
    counts.set(model.capability, (counts.get(model.capability) ?? 0) + 1);
  }

  return Object.entries(capabilityMeta).map(([capability, meta]) => ({
    capability,
    ...meta,
    count: counts.get(capability) ?? 0,
  }));
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-10">
        <CopyCodeButton value={children} />
      </div>
      <pre className="overflow-x-auto rounded-2xl border border-[#0F172A]/85 bg-[linear-gradient(180deg,#0F172A_0%,#111827_100%)] p-5 pr-16 text-[12px] leading-6 text-[#E5E7EB] shadow-[0_22px_50px_rgba(15,23,42,0.18)]">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-[#0F172A]">{title}</h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-7 text-[#475569]">{description}</p>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#E0F2FE] text-[#0369A1]">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
      </div>
      <div className="mt-3 text-sm leading-6 text-[#475569]">{children}</div>
    </div>
  );
}

function DocsSection({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-[28px] border border-black/[0.07] bg-white px-6 py-7 shadow-[0_14px_36px_rgba(15,23,42,0.045)] md:px-8 ${className}`}
    >
      {children}
    </section>
  );
}

function ScenarioCard({
  title,
  description,
  prompt,
}: {
  title: string;
  description: string;
  prompt: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
      <h4 className="text-[16px] font-semibold text-[#111827]">{title}</h4>
      <p className="mt-2 text-sm leading-7 text-[#475569]">{description}</p>
      <div className="mt-4">
        <CodeBlock>{prompt}</CodeBlock>
      </div>
    </div>
  );
}

export default async function DocsPage() {
  noStore();

  const [{ modelDocRows, vendorOptions, gatewayErrorDocs }, supabase] = await Promise.all([
    loadDocsData(),
    createClient(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const destination = user ? "/dashboard" : "/login";
  const destinationLabel = user ? "Dashboard" : "Sign In";
  const capabilitySummaries = buildCapabilitySummaries(modelDocRows);
  const featuredModels = modelDocRows.slice(0, 9);
  const initialModel = modelDocRows[0]?.publicModel ?? null;

  return (
    <main className="bg-[radial-gradient(circle_at_top_left,#EFF8FF_0%,#FCFCFA_28%,#FCFCFA_100%)] text-[#111827]">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-8 lg:grid-cols-[240px_minmax(0,1fr)] lg:py-14">
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <div className="rounded-[24px] border border-black/[0.08] bg-white/95 p-4 shadow-[0_16px_38px_rgba(15,23,42,0.08)] backdrop-blur">
                <div className="flex items-center gap-2 px-2 text-[13px] font-semibold text-[#111827]">
                  <BookOpen className="h-4 w-4 text-[#0369A1]" />
                  Documentation
                </div>
                <DocsTocNav sections={pageSections} />
              </div>
            </div>
          </aside>

          <div className="min-w-0 space-y-12">
            <section id="introduction" className="rounded-[32px] border border-black/[0.06] bg-white px-6 py-8 shadow-[0_18px_42px_rgba(15,23,42,0.06)] md:px-8">
              <h1 className="max-w-3xl text-4xl font-semibold text-[#111827] md:text-6xl">
                Build with OpenOctopus
              </h1>
              <p className="mt-5 max-w-3xl text-[17px] leading-8 text-[#475569]">
                OpenOctopus provides an official CLI plus authenticated REST APIs for image generation, image editing,
                chat completions, video generation, model discovery, async task polling, and generated asset delivery.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={destination}
                  className="inline-flex h-10 items-center justify-center rounded-md bg-[#111827] px-4 text-sm font-medium text-white transition-colors hover:bg-[#0B1220]"
                >
                  {destinationLabel}
                </Link>
                <Link
                  href="/models"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-black/[0.08] bg-white px-4 text-sm font-medium text-[#111827] shadow-sm transition-colors hover:bg-[#F9FAFB]"
                >
                  Browse models
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4">
                  <p className="text-[12px] text-[#6B7280]">Public base URL</p>
                  <p className="mt-2 break-all font-mono text-[13px] text-[#111827]">{PUBLIC_API_BASE_URL}</p>
                </div>
                <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4">
                  <p className="text-[12px] text-[#6B7280]">Supported models</p>
                  <p className="mt-2 text-2xl font-semibold text-[#111827]">
                    {modelDocRows.length > 0 ? modelDocRows.length : "Live catalog"}
                  </p>
                </div>
                <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4">
                  <p className="text-[12px] text-[#6B7280]">API mode</p>
                  <p className="mt-2 text-2xl font-semibold text-[#111827]">Async polling</p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-3">
                <InfoCard icon={Image} title="Image generation">
                  Create images with public model slugs through <code>/v1/images/generations</code>.
                </InfoCard>
                <InfoCard icon={Sparkles} title="Image editing">
                  Edit one or more input images through <code>/v1/images/edits</code>.
                </InfoCard>
                <InfoCard icon={Code2} title="CLI and async jobs">
                  Authenticate once, run models from the terminal, and wait for async tasks or fetch results later.
                </InfoCard>
              </div>
            </section>

          <DocsSection id="authentication">
            <SectionHeader
              eyebrow="Authentication"
              title="API authentication"
              description="OpenOctopus API keys are workspace scoped. Create production, development, or service keys in the dashboard and send them as bearer tokens."
            />
	              <div className="grid gap-4 md:grid-cols-2">
              <InfoCard icon={KeyRound} title="Bearer token">
                <p>Include this header on model submission and task polling requests:</p>
                <div className="mt-3 rounded-md bg-[#F6F8FB] px-3 py-2 font-mono text-[12px] text-[#111827]">
                  Authorization: Bearer ooq_your_api_key
                </div>
              </InfoCard>
              <InfoCard icon={CircleDollarSign} title="Wallet balance">
                Requests require an active API key and positive workspace wallet balance. Insufficient balance returns
                a billing error before a provider task is created.
              </InfoCard>
            </div>
          </DocsSection>

          <DocsSection id="web-dashboard">
            <SectionHeader
              eyebrow="Ways to Use"
              title="Web dashboard and playground"
              description="Use the dashboard to manage keys, wallet balance, usage, request history, and the interactive model playground."
            />
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard icon={MonitorPlay} title="Dashboard">
                Manage API keys, top ups, usage analytics, model catalog, and recent inference requests.
              </InfoCard>
              <InfoCard icon={PlayCircle} title="Playground" >
                Test supported models from the browser. The playground submits to the same public gateway endpoints.
              </InfoCard>
              <InfoCard icon={ListChecks} title="Request history">
                Inspect task status, costs, generated outputs, and model usage in your workspace dashboard.
              </InfoCard>
            </div>
          </DocsSection>

          <DocsSection id="cli">
            <SectionHeader
              eyebrow="Ways to Use"
              title="Official CLI"
              description="If you prefer the terminal, the CLI is the easiest starting point. It can discover live models, run jobs, wait for results, and even upload your local files automatically."
            />
            <div className="space-y-6">
              <InfoCard icon={PlayCircle} title="Start here">
                <p>
                  Install the CLI, log in once, and check that it can see your account. After that, you can search
                  models, inspect inputs, and run jobs from the same terminal.
                </p>
              </InfoCard>

              <CodeBlock>{`npm i -g @openoctopus/cli
ooct auth login
ooct auth status
ooct models
ooct models search image
ooct models inspect openoctopus/google/imagen-4`}</CodeBlock>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard icon={FileCode2} title="Supported commands">
                  <ul className="space-y-2 font-mono text-[12px] text-[#111827]">
                    <li>ooct auth login</li>
                    <li>ooct auth logout</li>
                    <li>ooct auth status</li>
                    <li>ooct config get</li>
                    <li>ooct config set api-base &lt;url&gt;</li>
                    <li>ooct models</li>
                    <li>ooct models search &lt;query&gt;</li>
                    <li>ooct models inspect &lt;model&gt;</li>
                    <li>ooct run &lt;model&gt; [dynamic flags]</li>
                    <li>ooct task get &lt;task_id&gt;</li>
                    <li>ooct task wait &lt;task_id&gt;</li>
                    <li>ooct uploads create &lt;file&gt; [--field name]</li>
                  </ul>
                </InfoCard>

                <InfoCard icon={ShieldAlert} title="Good to know">
                  <ul className="space-y-3 text-sm leading-7 text-[#475569]">
                    <li>The CLI reads live model definitions from OpenOctopus, so the available flags come from the real model manifest.</li>
                    <li>Local image, video, and audio files can be passed directly. The CLI uploads them for you automatically.</li>
                    <li><code>--json</code> prints raw output. <code>--no-wait</code> returns only the task ID. <code>--output</code> saves the first result locally.</li>
                  </ul>
	                </InfoCard>
	              </div>
	            </div>

	            <div className="mt-6 rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-5">
              <h3 className="text-[16px] font-semibold text-[#111827]">
                Use OpenOctopus CLI from Cursor, OpenCode, or other AI coding assistants
              </h3>
              <p className="mt-2 text-sm leading-7 text-[#475569]">
                If you want an AI assistant to operate OpenOctopus for you, tell it one simple rule first:
                use the <code>ooct</code> CLI, inspect live models before guessing, and wait for async tasks unless you say otherwise.
              </p>

              <div className="mt-5 space-y-5">
                <ScenarioCard
                  title="General instruction template"
                  description="Use this when you want Cursor, OpenCode, or another coding assistant to work with OpenOctopus in a safe and repeatable way."
                  prompt={`Use the OpenOctopus CLI instead of calling the REST API directly.

Rules:
- First run: ooct auth status
- If needed, inspect models with: ooct models or ooct models search <query>
- Before using a model, inspect it with: ooct models inspect <model>
- Prefer local file paths when I provide files; the CLI can upload them automatically
- For async models, use ooct task wait unless I explicitly ask for --no-wait
- If a request fails, show me the exact CLI command and the returned error`}
                />

                <ScenarioCard
                  title="Scenario: let the assistant choose an image model for you"
                  description="Use this when you do not know which image model to pick and want the assistant to search, compare, and recommend before running anything."
                  prompt={`Use OpenOctopus CLI to help me choose a model for high-quality product photography.

Steps:
1. Run ooct models search image
2. Inspect the most relevant candidates
3. Recommend 2 to 3 models with short tradeoffs
4. After I choose one, run it with my prompt

Do not guess model names. Use the live manifest.`}
                />

                <ScenarioCard
                  title="Scenario: generate an image from a prompt"
                  description="Use this when you already know what you want to create, and you want the assistant to pick the right text-to-image model, run it, and save the result."
                  prompt={`Use OpenOctopus CLI to generate an image for me.

Prompt:
"A cinematic octopus walking through a neon rainy alley, ultra detailed, realistic lighting"

Requirements:
- Use ooct models search and ooct models inspect first if the model is not specified
- Then run ooct run with the best matching text-to-image model
- Wait for the task to finish
- Save the first output locally with --output ./octopus.png
- Show me the exact command you used`}
                />

                <ScenarioCard
                  title="Scenario: edit an image with local files"
                  description="Use this when you already have a base image, a reference image, and maybe a mask image on your machine. The assistant should use the local files directly."
                  prompt={`Use OpenOctopus CLI to edit my image with local assets.

Requirements:
- Use local file paths, not manual upload steps
- The CLI should upload them automatically
- First inspect the selected model to confirm the required flags
- Then run the model and wait for the final result

Files:
- base image: ./input/product.png
- reference image: ./input/style.png
- mask image: ./input/mask.png`}
                />

                <ScenarioCard
                  title="Scenario: generate video with reference assets"
                  description="Use this when you want the assistant to handle a longer video-generation command with image, video, or audio references and wait for the final result."
                  prompt={`Use OpenOctopus CLI to create a video with reference assets.

Steps:
1. Inspect the specified video model
2. Run it with:
   - my prompt
   - local reference image
   - local reference video
   - local reference audio
3. Wait for the task to finish
4. Save the first output locally

Prefer ooct task wait for polling.`}
                />

                <ScenarioCard
                  title="Scenario: use chat models from the terminal"
                  description="Use this when you want the assistant to run a chat model quickly and return only the final text, without extra explanation."
                  prompt={`Use OpenOctopus CLI to run a chat model for me.

Task:
- Check auth status
- Inspect the chat model
- Run it with my prompt
- Return the final text output only

Prompt:
"Summarize async polling for AI generation APIs in 5 bullets."`}
                />

                <ScenarioCard
                  title="Scenario: upload first, then reuse the returned URL"
                  description="Use this when you want the assistant to upload a file once, keep the returned URL, and reuse that URL in a later run command."
                  prompt={`Use OpenOctopus CLI to upload my local file first, then reuse the uploaded URL in a later command.

Steps:
1. Run ooct uploads create ./mask.png --field input.mask_url
2. Capture the returned URL
3. Use that URL in the next ooct run command
4. Show me both commands and the returned task ID`}
                />
              </div>
            </div>
          </DocsSection>

          <DocsSection id="coding-agents">
            <SectionHeader
              eyebrow="Ways to Use"
              title="Coding agents in the terminal"
              description="To use Deep Code with OpenOctopus, you only need three values: your model slug, the gateway URL, and your OpenOctopus API key."
            />

            <div className="space-y-5">
              <div className="rounded-2xl border border-black/[0.08] bg-[#F8FAFC] p-5">
                <h4 className="text-[16px] font-semibold text-[#111827]">Step 1: Prepare these 3 values</h4>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-[#475569]">
                  <li>1. `MODEL`: your coding model slug, for example `openoctopus/your-coding-model`</li>
                  <li>2. `BASE_URL`: your gateway URL, for example `{PUBLIC_API_BASE_URL}`</li>
                  <li>3. `API_KEY`: your OpenOctopus API key, for example `ooq_xxx`</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
                <h4 className="text-[16px] font-semibold text-[#111827]">Step 2: Create the Deep Code config file</h4>
                <p className="mt-2 text-sm leading-7 text-[#475569]">
                  Copy this block into your terminal, then replace the three placeholder values with your own values.
                </p>
                <div className="mt-4">
                  <CodeBlock>{`mkdir -p ~/.deepcode

cat > ~/.deepcode/settings.json <<'EOF'
{
  "env": {
    "MODEL": "openoctopus/your-coding-model",
    "BASE_URL": "${PUBLIC_API_BASE_URL}",
    "API_KEY": "ooq_your_openoctopus_key"
  },
  "thinkingEnabled": true,
  "reasoningEffort": "max"
}
EOF`}</CodeBlock>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.08] bg-white p-5">
                <h4 className="text-[16px] font-semibold text-[#111827]">Step 3: Open any project and start Deep Code</h4>
                <p className="mt-2 text-sm leading-7 text-[#475569]">
                  Once the file is saved, open any project folder and run `deepcode`.
                </p>
                <div className="mt-4">
                  <CodeBlock>{`cd /path/to/your/project
deepcode`}</CodeBlock>
                </div>
              </div>

              <div className="rounded-2xl border border-black/[0.08] bg-[#F8FAFC] p-5">
                <h4 className="text-[16px] font-semibold text-[#111827]">Step 4: Send the first message</h4>
                <p className="mt-2 text-sm leading-7 text-[#475569]">
                  After Deep Code opens, type a normal request such as `review this repo` or `help me fix this error` and press Enter.
                </p>
              </div>
            </div>
          </DocsSection>

          <DocsSection id="rest-api">
            <SectionHeader
              eyebrow="REST API"
              title="Supported endpoints"
              description="These are the public API surfaces implemented by the gateway today. Unsupported SDKs, webhooks, streaming, and training flows are intentionally not documented here."
            />
            <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <table className="min-w-[720px] text-left text-sm">
                <thead className="border-b border-black/[0.08] bg-[#F6F8FB] text-[11px] uppercase tracking-[0.1em] text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Endpoint</th>
                    <th className="px-4 py-3">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {endpointRows.map((row) => (
                    <tr key={row.path} id={row.anchor} className="border-b border-black/[0.06] last:border-b-0">
                      <td className="px-4 py-3">
                        <span className="rounded-md bg-[#ECFDF5] px-2 py-1 font-mono text-[12px] text-[#047857]">
                          {row.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[13px] text-[#111827]">{row.path}</td>
                      <td className="px-4 py-3 text-[#475569]">{row.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocsSection>

          <DocsSection id="models">
            <SectionHeader
              eyebrow="Core Concepts"
              title="Models"
              description="Every request uses a public model slug. The live model catalog is sourced from active supported model configuration and grouped by capability."
            />
            <div className="mb-5 flex flex-wrap gap-3">
              <Link
                href="/models?tab=playground"
                className="inline-flex items-center rounded-full bg-[#0F172A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1E293B]"
              >
                Open model playgrounds
              </Link>
              <Link
                href="/models?tab=api"
                className="inline-flex items-center rounded-full border border-[#BAE6FD] bg-white px-4 py-2 text-sm font-medium text-[#0369A1] transition hover:bg-[#F0F9FF]"
              >
                Open model API docs
              </Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {capabilitySummaries.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.capability} className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E0F2FE] text-[#0369A1]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="rounded-md bg-[#F6F8FB] px-2 py-1 text-[12px] text-[#475569]">
                        {item.count > 0 ? `${item.count} models` : "Configured live"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-[15px] font-semibold text-[#111827]">{item.label}</h3>
                    <p className="mt-2 font-mono text-[12px] text-[#475569]">{item.endpoint}</p>
                  </div>
                );
              })}
            </div>

            {featuredModels.length > 0 ? (
              <div className="mt-6 rounded-2xl border border-black/[0.08] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#111827]">Model library</h3>
                    <p className="mt-1 text-sm text-[#475569]">
                      {vendorOptions.length > 0 ? `${vendorOptions.length} active vendors` : "Active vendors"} with public model docs and pricing.
                    </p>
                  </div>
                  <Link href="/models" className="inline-flex items-center text-sm font-medium text-[#0369A1]">
                    Browse all models
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  {featuredModels.map((model) => (
                    <div
                      key={model.id}
                      className="flex h-full flex-col rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-3"
                    >
                      <p className="truncate text-[13px] font-semibold text-[#111827]">{model.displayName}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-[#6B7280]">{model.publicModel}</p>
                      <p className="mt-2 text-[12px] leading-6 text-[#475569]">
                        Open the live playground to test it, or jump straight into the model-specific API page.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#475569]">
                        <span className="rounded-md bg-white px-2 py-1">{capabilityLabel(model.capability)}</span>
                        <span className="rounded-md bg-white px-2 py-1">{formatPrice(model)}</span>
                      </div>
                      <div className="mt-auto pt-4 flex flex-wrap gap-2">
                        <Link
                          href={buildModelTabHref(model, "playground")}
                          className="inline-flex items-center rounded-full bg-[#0F172A] px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-[#1E293B]"
                        >
                          Open playground
                        </Link>
                        <Link
                          href={buildModelTabHref(model, "api")}
                          className="inline-flex items-center rounded-full border border-[#BAE6FD] bg-white px-3 py-1.5 text-[12px] font-medium text-[#0369A1] transition hover:bg-[#F0F9FF]"
                        >
                          Open API docs
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </DocsSection>

          <DocsSection id="tasks">
            <SectionHeader
              eyebrow="Core Concepts"
              title="Tasks and polling"
              description="Generation endpoints return a queued task. Poll task status with the same API key that created the task."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <CodeBlock>{buildTaskStatusCurl()}</CodeBlock>
              <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4 text-sm leading-6 text-[#475569]">
                <p className="font-semibold text-[#111827]">Task statuses</p>
                <div className="mt-3 grid gap-2">
                  {["queued", "processing", "succeeded", "failed", "cancelled"].map((status) => (
                    <div key={status} className="flex items-center justify-between rounded-md bg-[#F6F8FB] px-3 py-2">
                      <code className="text-[12px] text-[#111827]">{status}</code>
                      <span>{status === "succeeded" || status === "failed" || status === "cancelled" ? "terminal" : "keep polling"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DocsSection>

          <DocsSection id="files">
            <SectionHeader
              eyebrow="Core Concepts"
              title="Generated files"
              description="Successful task responses expose normalized output assets. Asset URLs may point to the OpenOctopus file route for generated images or videos."
            />
            <CodeBlock>{`{
  "id": "task_id",
  "status": "succeeded",
  "output_payload": {
    "format": "openoctopus.image.output.v1",
    "assets": [
      {
        "type": "image",
        "url": "${PUBLIC_API_BASE_URL}/v1/files/task_id/assets/0"
      }
    ]
  }
}`}</CodeBlock>
          </DocsSection>

          <DocsSection id="errors">
            <SectionHeader
              eyebrow="Help"
              title="Error codes"
              description="API errors use a stable public error object with code, message, and retryable fields. Retry only when retryable is true."
            />
            <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
              <table className="min-w-[720px] text-left text-sm">
                <thead className="border-b border-black/[0.08] bg-[#F6F8FB] text-[11px] uppercase tracking-[0.1em] text-[#6B7280]">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">HTTP</th>
                    <th className="px-4 py-3">Retry</th>
                    <th className="px-4 py-3">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(gatewayErrorDocs.length > 0
                    ? gatewayErrorDocs
                    : [
                        {
                          code: "invalid_request",
                          httpStatus: 400,
                          retryable: false,
                          publicMessage: "The request payload is invalid.",
                          category: "validation",
                        },
                        {
                          code: "insufficient_balance",
                          httpStatus: 402,
                          retryable: false,
                          publicMessage: "Your wallet balance is insufficient.",
                          category: "billing",
                        },
                        {
                          code: "upstream_timeout",
                          httpStatus: 504,
                          retryable: true,
                          publicMessage: "The generation request timed out.",
                          category: "upstream",
                        },
                      ]).map((error) => (
                    <tr key={error.code} className="border-b border-black/[0.06] last:border-b-0">
                      <td className="px-4 py-3 font-mono text-[13px] text-[#111827]">{error.code}</td>
                      <td className="px-4 py-3 text-[#475569]">{error.httpStatus}</td>
                      <td className="px-4 py-3 text-[#475569]">{error.retryable ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-[#475569]">{error.publicMessage}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DocsSection>

          <DocsSection>
            <SectionHeader
              eyebrow="API Reference"
              title="Interactive model API docs"
              description="This panel is shared with the dashboard API Calling Doc and reflects the active model catalog when backend configuration is available."
            />
            <ApiQuickstartCard
              models={modelDocRows}
              initialModel={initialModel}
              gatewayErrorDocs={gatewayErrorDocs}
            />
          </DocsSection>
        </div>
      </div>
    </main>
  );
}
