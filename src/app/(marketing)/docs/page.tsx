import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  FileCode2,
  Image,
  KeyRound,
  Layers3,
  ListChecks,
  MonitorPlay,
  PlayCircle,
  ShieldAlert,
  Sparkles,
  Video,
} from "lucide-react";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";
import { createClient } from "@/lib/supabase/server";
import {
  buildImageGenerationCurl,
  buildTaskStatusCurl,
  PUBLIC_API_BASE_URL,
} from "@/lib/api-docs";
import {
  type GatewayErrorDocRow,
  type ModelDocRow,
  loadModelsPageData,
} from "@/app/(marketing)/models/data";
import { DocsTocNav } from "./docs-toc-nav";

export const metadata = {
  title: "Documentation — OpenOctopus",
  description:
    "OpenOctopus developer documentation for API authentication, supported endpoints, model catalog, task polling, billing, and error handling.",
};

const sidebarGroups = [
  {
    title: "Getting Started",
    items: [
      { label: "Introduction", href: "#introduction" },
      { label: "Quick Start", href: "#quick-start" },
      { label: "API Authentication", href: "#authentication" },
    ],
  },
  {
    title: "Ways to Use",
    items: [
      { label: "Web Dashboard", href: "#web-dashboard" },
      { label: "REST API", href: "#rest-api" },
      { label: "Playground", href: "#web-dashboard" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { label: "Models", href: "#models" },
      { label: "Tasks", href: "#tasks" },
      { label: "Generated Files", href: "#files" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { label: "List Models", href: "#list-models" },
      { label: "Generate Images", href: "#generate-images" },
      { label: "Edit Images", href: "#edit-images" },
      { label: "Generate Videos", href: "#generate-videos" },
      { label: "Get Task Result", href: "#get-task" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "Pricing & Billing", href: "#billing" },
      { label: "Error Codes", href: "#errors" },
      { label: "Support", href: "#support" },
    ],
  },
] as const;

const pageSections = [
  { id: "introduction", label: "Introduction" },
  { id: "quick-start", label: "Quick Start" },
  { id: "authentication", label: "Authentication" },
  { id: "rest-api", label: "REST API" },
  { id: "models", label: "Models" },
  { id: "tasks", label: "Tasks" },
  { id: "billing", label: "Billing" },
  { id: "errors", label: "Errors" },
  { id: "support", label: "Support" },
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
    <pre className="overflow-x-auto rounded-lg border border-black/[0.08] bg-[#0F172A] p-4 text-[12px] leading-6 text-[#E5E7EB]">
      <code>{children}</code>
    </pre>
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
    <div className="mb-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0369A1]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[#111827]">{title}</h2>
      <p className="mt-2 text-[15px] leading-7 text-[#475569]">{description}</p>
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
    <div className="rounded-lg border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-[#E0F2FE] text-[#0369A1]">
          <Icon className="h-4 w-4" />
        </span>
        <h3 className="text-[15px] font-semibold text-[#111827]">{title}</h3>
      </div>
      <div className="mt-3 text-sm leading-6 text-[#475569]">{children}</div>
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
    <main className="bg-[#FCFCFA] text-[#111827]">
      <section id="introduction" className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-14">
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#111827]">
                <BookOpen className="h-4 w-4 text-[#38BDF8]" />
                OpenOctopus Docs
              </Link>
              <nav className="mt-6 space-y-5">
                {sidebarGroups.map((group) => (
                  <div key={group.title}>
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                      {group.title}
                    </p>
                    <div className="mt-2 space-y-1">
                      {group.items.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="block rounded-md px-2 py-1.5 text-[13px] text-[#475569] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0369A1]">
              Documentation
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-[#111827] md:text-6xl">
              Build with OpenOctopus
            </h1>
            <p className="mt-5 max-w-3xl text-[17px] leading-8 text-[#475569]">
              OpenOctopus provides authenticated REST APIs for image generation, image editing, video generation,
              model discovery, async task polling, and generated asset delivery.
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
              <div className="rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-4">
                <p className="text-[12px] text-[#6B7280]">Public base URL</p>
                <p className="mt-2 break-all font-mono text-[13px] text-[#111827]">{PUBLIC_API_BASE_URL}</p>
              </div>
              <div className="rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-4">
                <p className="text-[12px] text-[#6B7280]">Supported models</p>
                <p className="mt-2 text-2xl font-semibold text-[#111827]">
                  {modelDocRows.length > 0 ? modelDocRows.length : "Live catalog"}
                </p>
              </div>
              <div className="rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-4">
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
              <InfoCard icon={Video} title="Video generation">
                Submit video jobs through <code>/v1/videos/generations</code> and poll the task.
              </InfoCard>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-8 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-w-0 space-y-12">
          <section id="quick-start">
            <SectionHeader
              eyebrow="Getting Started"
              title="Quick start"
              description="Create an API key in the dashboard, send a generation request, then poll the returned task ID until the task reaches a terminal status."
            />
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
              <div>
                <CodeBlock>{buildImageGenerationCurl()}</CodeBlock>
              </div>
              <div className="space-y-3">
                {[
                  "Use Authorization: Bearer ooq_your_api_key on every API request.",
                  "Submit requests with a public model slug and optional input object.",
                  "Poll /v1/tasks/:id until status is succeeded, failed, or cancelled.",
                  "Read generated URLs from output_payload.assets[].url.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-lg border border-black/[0.08] bg-white p-3 text-sm text-[#475569]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-[#15803D]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="authentication">
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
          </section>

          <section id="web-dashboard">
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
          </section>

          <section id="rest-api">
            <SectionHeader
              eyebrow="REST API"
              title="Supported endpoints"
              description="These are the public API surfaces implemented by the gateway today. Unsupported SDKs, webhooks, streaming, and training flows are intentionally not documented here."
            />
            <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-white shadow-sm">
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
          </section>

          <section id="models">
            <SectionHeader
              eyebrow="Core Concepts"
              title="Models"
              description="Every request uses a public model slug. The live model catalog is sourced from active supported model configuration and grouped by capability."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {capabilitySummaries.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.capability} className="rounded-lg border border-black/[0.08] bg-white p-4 shadow-sm">
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
              <div className="mt-6 rounded-lg border border-black/[0.08] bg-white p-4 shadow-sm">
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
                    <div key={model.id} className="rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-3">
                      <p className="truncate text-[13px] font-semibold text-[#111827]">{model.displayName}</p>
                      <p className="mt-1 truncate font-mono text-[11px] text-[#6B7280]">{model.publicModel}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[#475569]">
                        <span className="rounded-md bg-white px-2 py-1">{capabilityLabel(model.capability)}</span>
                        <span className="rounded-md bg-white px-2 py-1">{formatPrice(model)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          <section id="tasks">
            <SectionHeader
              eyebrow="Core Concepts"
              title="Tasks and polling"
              description="Generation endpoints return a queued task. Poll task status with the same API key that created the task."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <CodeBlock>{buildTaskStatusCurl()}</CodeBlock>
              <div className="rounded-lg border border-black/[0.08] bg-white p-4 text-sm leading-6 text-[#475569] shadow-sm">
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
          </section>

          <section id="files">
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
          </section>

          <section id="billing">
            <SectionHeader
              eyebrow="Pricing & Billing"
              title="Wallet billing"
              description="OpenOctopus estimates customer charge before creating a provider job. Actual request costs and top ups are visible in the dashboard."
            />
            <div className="grid gap-4 md:grid-cols-3">
              <InfoCard icon={CircleDollarSign} title="Prepaid wallet">
                A positive workspace wallet balance is required before requests are accepted.
              </InfoCard>
              <InfoCard icon={Layers3} title="Model pricing">
                Pricing is model specific and can vary by image count, video duration, resolution, quality, or add-ons.
              </InfoCard>
              <InfoCard icon={FileCode2} title="Usage records">
                Usage events, request history, and billing ledger entries are available from the dashboard.
              </InfoCard>
            </div>
          </section>

          <section id="errors">
            <SectionHeader
              eyebrow="Help"
              title="Error codes"
              description="API errors use a stable public error object with code, message, and retryable fields. Retry only when retryable is true."
            />
            <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-white shadow-sm">
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
          </section>

          <section id="support">
            <SectionHeader
              eyebrow="Support"
              title="Need help?"
              description="Use the dashboard and model catalog as the source of truth for active models, pricing, generated task history, and API keys."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/dashboard"
                className="group rounded-lg border border-black/[0.08] bg-white p-4 shadow-sm transition-colors hover:border-[#38BDF8]/50"
              >
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
                  <MonitorPlay className="h-4 w-4 text-[#0369A1]" />
                  Dashboard
                </div>
                <p className="mt-2 text-sm leading-6 text-[#475569]">
                  Manage API keys, wallet, model usage, and request history.
                </p>
              </Link>
              <Link
                href="/models"
                className="group rounded-lg border border-black/[0.08] bg-white p-4 shadow-sm transition-colors hover:border-[#38BDF8]/50"
              >
                <div className="flex items-center gap-2 text-[15px] font-semibold text-[#111827]">
                  <Code2 className="h-4 w-4 text-[#0369A1]" />
                  Model catalog
                </div>
                <p className="mt-2 text-sm leading-6 text-[#475569]">
                  Review model specific request schemas, output schemas, examples, and prices.
                </p>
              </Link>
            </div>
          </section>

          <section>
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
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="rounded-lg border border-black/[0.08] bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2 px-2 text-[13px] font-semibold text-[#111827]">
                <ShieldAlert className="h-4 w-4 text-[#0369A1]" />
                On This Page
              </div>
              <DocsTocNav sections={pageSections} />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
