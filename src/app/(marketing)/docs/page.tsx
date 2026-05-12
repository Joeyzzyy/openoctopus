import Link from "next/link";
import { PageHero, SurfaceCard } from "@/components/marketing/page-primitives";
import {
  buildImageGenerationCurl,
  buildTaskStatusCurl,
  DEFAULT_QUICKSTART_MODEL,
  PUBLIC_API_BASE_URL,
} from "@/lib/api-docs";

const sidebarSections = [
  { id: "overview", label: "Overview" },
  { id: "authentication", label: "Authentication" },
  { id: "quickstart", label: "Quickstart" },
  { id: "endpoints", label: "Endpoints" },
  { id: "examples", label: "Examples" },
  { id: "responses", label: "Responses" },
  { id: "errors", label: "Errors" },
] as const;

const quickstartSteps = [
  {
    title: "Sign in",
    detail: "Create or access your workspace, then open the dashboard.",
  },
  {
    title: "Create an API key",
    detail:
      "Generate a workspace API key from the dashboard and save it immediately. The full key is only shown once.",
  },
  {
    title: "Choose a public model",
    detail:
      "Use the OpenOctopus public model slug that you want to call, such as openoctopus/seedream-4.5.",
  },
  {
    title: "Send a request",
    detail:
      "Call a generation endpoint with your API key in the Authorization header.",
  },
  {
    title: "Poll task status",
    detail:
      "Generation requests are asynchronous. Poll the task endpoint until the request finishes.",
  },
] as const;

const endpoints = [
  {
    method: "GET",
    path: "/v1/models",
    detail: "List currently active public models and their routed upstream providers.",
  },
  {
    method: "POST",
    path: "/v1/images/generations",
    detail: "Queue an image generation task.",
  },
  {
    method: "POST",
    path: "/v1/videos/generations",
    detail: "Queue a video generation task.",
  },
  {
    method: "GET",
    path: "/v1/tasks/:id",
    detail: "Fetch the current status and output payload for a task.",
  },
] as const;

const imageRequestExample = buildImageGenerationCurl();
const taskStatusExample = buildTaskStatusCurl();
const modelsExample = `curl ${PUBLIC_API_BASE_URL}/v1/models`;
const videoRequestExample = `curl -X POST ${PUBLIC_API_BASE_URL}/v1/videos/generations \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ooq_your_api_key" \\
  -d '{
    "model": "openoctopus/kling-v2.1",
    "prompt": "cinematic aerial shot of a neon harbor at night",
    "input": {
      "durationSeconds": 5,
      "aspectRatio": "16:9"
    }
  }'`;
const jsExample = `const response = await fetch("${PUBLIC_API_BASE_URL}/v1/images/generations", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer " + process.env.OPENOCTOPUS_API_KEY,
  },
  body: JSON.stringify({
    model: "${DEFAULT_QUICKSTART_MODEL}",
    prompt: "a premium octopus mascot, orange and black, clean background",
    input: {
      size: "1024x1024"
    }
  }),
});

const task = await response.json();
console.log(task);`;
const queuedResponseExample = `{
  "id": "7c47ef1f-5e69-43d2-9f66-b4a1f2f0e7fd",
  "status": "queued"
}`;
const completedTaskExample = `{
  "id": "7c47ef1f-5e69-43d2-9f66-b4a1f2f0e7fd",
  "status": "succeeded",
  "capability": "image_generation",
  "public_model_slug": "${DEFAULT_QUICKSTART_MODEL}",
  "output_payload": {
    "raw": {
      "...": "provider specific payload"
    },
    "assets": [
      {
        "type": "image",
        "url": "/v1/files/7c47ef1f-5e69-43d2-9f66-b4a1f2f0e7fd/assets/0",
        "sourceUrl": "https://upstream-provider.example/result.png"
      }
    ]
  },
  "error_code": null,
  "error_message": null,
  "created_at": "2026-04-12T08:00:00.000Z",
  "completed_at": "2026-04-12T08:00:09.000Z"
}`;
const unifiedImageOutputShapeExample = `{
  "output_payload": {
    "format": "openoctopus.image.output.v1",
    "raw": { "...": "provider specific payload" },
    "assets": [
      {
        "type": "image",
        "url": "string",
        "sourceUrl": "string (optional)"
      }
    ]
  }
}`;
const errorExample = `{
  "error": {
    "code": "invalid_api_key",
    "message": "Invalid or inactive API key"
  }
}`;

export const metadata = {
  title: "API Docs — OpenOctopus",
  description:
    "Public API documentation for authenticating, listing models, and submitting OpenOctopus generation requests.",
};

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-[#2A2623] bg-[#171412] p-4 text-xs leading-6 text-[#F8F3E8] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <code>{code}</code>
    </pre>
  );
}

function DocsSection({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-28 rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm ring-1 ring-black/[0.02] md:p-6"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-black/42">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black md:text-[30px]">
        {title}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-black/60">
        {description}
      </p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow="API Documentation"
        title="Build against the OpenOctopus API"
        description="OpenOctopus provides a unified API for image and video generation. Use one API key, one base URL, and public model slugs routed by the platform."
        primaryAction={{ href: "/login", label: "Get API Key" }}
        secondaryAction={{ href: "/pricing", label: "View pricing" }}
      />

      <div className="px-6 pb-14 md:px-8 md:pb-20">
        <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
          <aside className="xl:sticky xl:top-28 xl:self-start">
            <SurfaceCard className="overflow-hidden p-0">
              <div className="border-b border-black/[0.06] bg-gradient-to-r from-[#F6EFE3] to-[#FAF8F2] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[1.2px] text-black/45">
                  OpenOctopus Docs
                </p>
              </div>
              <div className="p-4">
              <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                On This Page
              </p>
              <nav className="mt-4 space-y-1">
                {sidebarSections.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block rounded-lg px-3 py-2 text-sm text-black/62 transition-colors hover:bg-black/[0.03] hover:text-black"
                  >
                    {section.label}
                  </a>
                ))}
              </nav>
              <div className="mt-5 rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                  Base URL
                </p>
                <code className="mt-2 block break-all text-[11px] leading-5 text-black/72">
                  {PUBLIC_API_BASE_URL}
                </code>
              </div>
              </div>
            </SurfaceCard>
          </aside>

          <div className="space-y-6">
            <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-r from-[#FAF6EC] via-[#FFFFFF] to-[#F5F8FF] p-5 shadow-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[1px] text-black/45">Auth</p>
                  <p className="mt-1 text-sm font-medium text-black">Bearer Token</p>
                </div>
                <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[1px] text-black/45">Request Style</p>
                  <p className="mt-1 text-sm font-medium text-black">Asynchronous Tasks</p>
                </div>
                <div className="rounded-xl border border-black/[0.08] bg-white px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[1px] text-black/45">Coverage</p>
                  <p className="mt-1 text-sm font-medium text-black">Image + Video</p>
                </div>
              </div>
            </div>

            <DocsSection
              id="overview"
              eyebrow="Overview"
              title="What the API gives you"
              description="Use a single OpenOctopus API key to submit image and video generation tasks through stable public model slugs."
            >
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <p className="text-sm font-medium text-black">Unified auth</p>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    One bearer token works across public OpenOctopus models.
                  </p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <p className="text-sm font-medium text-black">Async tasks</p>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    Generation endpoints return a task id first, then you poll
                    for the final result.
                  </p>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <p className="text-sm font-medium text-black">Routed models</p>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    You call public slugs while OpenOctopus handles upstream
                    routing behind the scenes.
                  </p>
                </div>
              </div>
            </DocsSection>

            <DocsSection
              id="authentication"
              eyebrow="Authentication"
              title="Base URL and API key"
              description="All requests use the same base URL and a standard bearer token in the Authorization header."
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                    Base URL
                  </p>
                  <code className="mt-2 block break-all rounded bg-white px-2 py-2 text-[12px] leading-6 text-black/75">
                    {PUBLIC_API_BASE_URL}
                  </code>
                </div>
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <p className="text-[10px] uppercase tracking-[1px] text-black/45">
                    Header
                  </p>
                  <code className="mt-2 block break-all rounded bg-white px-2 py-2 text-[12px] leading-6 text-black/75">
                    Authorization: Bearer ooq_your_api_key
                  </code>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4 text-sm leading-7 text-black/60">
                Create API keys from the dashboard after signing in. Save the
                full key when it is created because the full value is only shown
                once.
              </div>
            </DocsSection>

            <DocsSection
              id="quickstart"
              eyebrow="Quickstart"
              title="From account to first request"
              description="This is the shortest path from a new account to a working API call."
            >
              <div className="grid gap-3">
                {quickstartSteps.map((step, index) => (
                  <div
                    key={step.title}
                    className="grid gap-3 rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-4 md:grid-cols-[40px_minmax(0,1fr)]"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-sm font-semibold text-black">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-black">
                        {step.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-black/58">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </DocsSection>

            <DocsSection
              id="endpoints"
              eyebrow="Endpoints"
              title="Public API surface"
              description="These are the customer-facing endpoints currently reflected by the app and gateway worker."
            >
              <div className="grid gap-3">
                {endpoints.map((endpoint) => (
                  <div
                    key={`${endpoint.method}-${endpoint.path}`}
                    className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4 transition-colors hover:bg-white"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="inline-flex rounded-md bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[1px] text-black/52">
                          {endpoint.method}
                        </p>
                        <p className="mt-1 break-all text-sm font-medium text-black">
                          {endpoint.path}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-black/58">
                      {endpoint.detail}
                    </p>
                  </div>
                ))}
              </div>
            </DocsSection>

            <DocsSection
              id="examples"
              eyebrow="Examples"
              title="Common request patterns"
              description="Start with the model list endpoint, then send generation requests, and finally poll the task status endpoint."
            >
              <div className="space-y-6">
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    List models
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    Fetch the current public model catalog before hard-coding
                    model names in your own app.
                  </p>
                  <CodeBlock code={modelsExample} />
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Image generation
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    Submit an image generation task and receive a queued task id
                    in the first response.
                  </p>
                  <CodeBlock code={imageRequestExample} />
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Video generation
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    Video requests follow the same async lifecycle through the
                    dedicated video endpoint.
                  </p>
                  <CodeBlock code={videoRequestExample} />
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    JavaScript example
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    Any server-side JavaScript runtime can call the API over
                    normal HTTP.
                  </p>
                  <CodeBlock code={jsExample} />
                </div>
              </div>
            </DocsSection>

            <DocsSection
              id="responses"
              eyebrow="Responses"
              title="Queued task and final result"
              description="Generation endpoints are asynchronous. Expect a queued task response first, then poll until you receive a terminal result."
            >
              <div className="grid gap-4">
                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Initial queued response
                  </h3>
                  <CodeBlock code={queuedResponseExample} />
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Task status polling
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    Poll until the task moves from{" "}
                    <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                      queued
                    </code>{" "}
                    or{" "}
                    <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                      processing
                    </code>{" "}
                    to a terminal state.
                  </p>
                  <CodeBlock code={taskStatusExample} />
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Example completed response
                  </h3>
                  <CodeBlock code={completedTaskExample} />
                </div>

                <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Unified image output contract
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/58">
                    For image tasks, always read{" "}
                    <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                      output_payload.assets
                    </code>{" "}
                    as the normalized result. The upstream provider response remains in{" "}
                    <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                      output_payload.raw
                    </code>
                    .
                  </p>
                  <CodeBlock code={unifiedImageOutputShapeExample} />
                  <div className="mt-3 space-y-2 text-sm leading-6 text-black/58">
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        output_payload.format
                      </code>{" "}
                      for image tasks is{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        openoctopus.image.output.v1
                      </code>
                      .
                    </p>
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        assets[].type
                      </code>{" "}
                      is always{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        image
                      </code>{" "}
                      for image generation.
                    </p>
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        assets[].url
                      </code>{" "}
                      can be one of: a{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        data:image/...;base64,...
                      </code>{" "}
                      URL, an OpenOctopus file proxy URL such as{" "}
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        /v1/files/:requestId/assets/:assetIndex
                      </code>
                      , or a direct HTTPS URL.
                    </p>
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        assets[].sourceUrl
                      </code>{" "}
                      is optional and keeps the original upstream asset URL when proxying.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-black/[0.08] bg-[#FAF9F4] p-4">
                  <h3 className="text-lg font-semibold text-black">
                    Request body fields
                  </h3>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-black/58">
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        model
                      </code>{" "}
                      is required and must be a public OpenOctopus model slug.
                    </p>
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        prompt
                      </code>{" "}
                      is optional in the request schema, but many upstream
                      models still expect it.
                    </p>
                    <p>
                      <code className="rounded bg-white px-1 py-0.5 text-[12px]">
                        input
                      </code>{" "}
                      is a free-form object for model-specific parameters such
                      as size, aspect ratio, duration, or seed.
                    </p>
                  </div>
                </div>
              </div>
            </DocsSection>

            <DocsSection
              id="errors"
              eyebrow="Errors"
              title="Structured error responses"
              description="Authentication failures and request validation failures use a simple error envelope with a machine-readable code."
            >
              <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-4">
                <CodeBlock code={errorExample} />
              </div>
            </DocsSection>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-black px-4 text-sm font-medium text-white transition-colors hover:bg-black/85"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-black/10 bg-white px-4 text-sm font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
              >
                Open Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
