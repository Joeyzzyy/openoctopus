import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CircleAlert,
  Fingerprint,
  Network,
  ReceiptText,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { getInternalAdminData } from "@/lib/internal-admin-server";
import {
  createProvider,
  createProviderCredential,
  createSupportedModel,
  deleteProviderCredential,
  rotateProviderCredentialSecret,
  updateSupportedModelPricing,
  updateProviderCredentialState,
  updateProviderModelState,
  updateProviderStatus,
  updateRoutingRule,
  updateSupportedModelState,
} from "./actions";
import { BillingConfigEditor, CreateProviderModelForm, CreateRoutingRuleForm } from "./form-panels";
import { InternalShell } from "./internal-shell";
import { SubmitButton } from "./submit-button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabs = [
  {
    key: "overview",
    label: "Overview",
    description: "Control-plane health and setup guidance.",
  },
  {
    key: "public-models",
    label: "Public Models",
    description: "Customer-facing capability catalog.",
  },
  {
    key: "providers",
    label: "Providers",
    description: "Real upstream vendor records.",
  },
  {
    key: "credentials",
    label: "Credentials",
    description: "Secret references mapped to providers.",
  },
  {
    key: "models",
    label: "Models",
    description: "Provider implementations of public models.",
  },
  {
    key: "routes",
    label: "Routes",
    description: "Traffic routing between implementations.",
  },
  {
    key: "requests",
    label: "Requests",
    description: "Recent execution visibility.",
  },
  {
    key: "audit",
    label: "Audit",
    description: "Mutation history and traceability.",
  },
] as const;

type InternalTabKey = (typeof tabs)[number]["key"];

const capabilityOptions = [
  { value: "image_generation", label: "Image generation" },
  { value: "image_edit", label: "Image edit" },
  { value: "video_generation", label: "Video generation" },
] as const;

const providerStatusOptions = [
  { value: "healthy", label: "Healthy" },
  { value: "degraded", label: "Degraded" },
  { value: "offline", label: "Offline" },
] as const;

const providerKindOptions = [
  { value: "wavespeed", label: "WaveSpeed" },
  { value: "partner", label: "Partner" },
  { value: "custom", label: "Custom" },
] as const;

const routeStrategies = [
  "primary_then_fallback",
  "primary_only",
  "manual_failover",
  "route_by_capability_tag",
] as const;

const tabGuidance: Record<
  Exclude<InternalTabKey, "overview" | "requests" | "audit">,
  {
    relation: string;
    prerequisite: string;
    next: string;
  }
> = {
  "public-models": {
    relation:
      "定义用户看到的统一能力层。后面的 provider models 和 routes 都是围绕这个公共能力做映射和流量切换。",
    prerequisite: "这是全链路的起点。首次搭建时先建它；后续维护时主要在这里新增或停用对外能力。",
    next: "建完后去 Providers，录入真实上游供应商。",
  },
  providers: {
    relation:
      "定义真实上游供应商，是 credentials 和 provider models 的归属对象。一个 provider 可以挂多组凭证，也可以承载多个 provider model。",
    prerequisite: "通常在 public model 之后创建。没有 provider，后面的 credentials 和 models 都无法落地。",
    next: "如果是首次接入新供应商，下一步去 Credentials；如果凭证已齐全，也可以直接去 Models。",
  },
  credentials: {
    relation:
      "给 provider 绑定真实可用的密钥引用和环境信息。它不直接暴露给用户，但决定这个 provider 是否可运行。",
    prerequisite: "必须先有 provider。你已经有一套全链路时，这里更多是做密钥轮换、环境切换和启停管理。",
    next: "凭证准备好后去 Models，把这个 provider 的真实上游模型挂到 public model 上。",
  },
  models: {
    relation:
      "这是 public models 和 providers 之间的映射层。每条 provider model 代表某个 provider 对某个 public model 的一个具体实现。",
    prerequisite: "必须同时先有 public model 和 provider。没有这两边，映射关系无法建立。",
    next: "映射建好后去 Routes，决定线上主路由和 fallback 走哪条实现。",
  },
  routes: {
    relation:
      "Routes 决定某个 public model 当前把流量发到哪个 provider model，是全链路真正生效的切换层。",
    prerequisite: "必须先有兼容的 provider models。你已经建好一套链路时，这里就是主要的上线、切流和故障切换面板。",
    next: "切流后去 Requests 看真实调用表现，去 Audit 看变更记录。",
  },
};

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getTabValue(value: string | undefined): InternalTabKey {
  return tabs.some((item) => item.key === value) ? (value as InternalTabKey) : "overview";
}

function buildInternalHref(tab: InternalTabKey, template?: string) {
  const params = new URLSearchParams();
  params.set("tab", tab);
  if (template) {
    params.set("template", template);
  }
  return `/internal?${params.toString()}`;
}

const providerTemplates = {
  "gemini-direct": {
    provider: {
      name: "Gemini Direct",
      slug: "gemini-direct",
      kind: "custom",
      baseUrl: "https://generativelanguage.googleapis.com",
      status: "healthy",
      regions: "",
      credentialsRef: "env://GEMINI_API_KEY",
      config: '{\n  "timeoutMs": 60000,\n  "apiVersion": "v1beta"\n}',
    },
    credential: {
      label: "Primary production key",
      secretRef: "Google AI Studio production key",
      environment: "production",
      notes: "Primary Gemini image generation credential",
      metadata: '{\n  "owner": "infra"\n}',
    },
    providerModel: {
      capability: "image_generation",
      upstreamModelSlug: "gemini-2.5-flash-image",
      pricing: '{\n  "billingMode": "per_image",\n  "costPerUnit": 0.04,\n  "currency": "USD"\n}',
      inputSchema:
        '{\n  "prompt": { "type": "string", "required": true },\n  "size": { "type": "string" }\n}',
      outputSchema:
        '{\n  "images": { "type": "array" },\n  "mimeType": { "type": "string" }\n}',
    },
    route: {
      capability: "image_generation",
      workspaceScope: "global",
      routeStrategy: "primary_only",
    },
  },
  wavespeed: {
    provider: {
      name: "WaveSpeed",
      slug: "wavespeed",
      kind: "wavespeed",
      baseUrl: "https://api.wavespeed.ai",
      status: "healthy",
      regions: "sgp1, us-west",
      credentialsRef: "env://WAVESPEED_API_KEY",
      config: '{\n  "timeoutMs": 90000\n}',
    },
    credential: {
      label: "Primary production key",
      secretRef: "WaveSpeed production key",
      environment: "production",
      notes: "Primary WaveSpeed production credential",
      metadata: '{\n  "owner": "ops"\n}',
    },
    providerModel: {
      capability: "image_generation",
      upstreamModelSlug: "gemini-2.5-flash-image",
      pricing: '{\n  "billingMode": "per_image"\n}',
      inputSchema:
        '{\n  "prompt": { "type": "string", "required": true }\n}',
      outputSchema:
        '{\n  "images": { "type": "array" }\n}',
    },
    route: {
      capability: "image_generation",
      workspaceScope: "global",
      routeStrategy: "primary_then_fallback",
    },
  },
} as const;

function OverviewCard({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-sm border border-black/8 bg-[#f7f7f4] px-4 py-4 shadow-[0_18px_40px_rgba(17,17,17,0.03)]">
      <div className="flex items-start gap-3">
        <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-white text-black/55">
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.35px] text-black/60">{title}</p>
          <p className="mt-1 text-2xl font-medium tracking-tight text-black">{value}</p>
          <p className="mt-2 text-xs leading-5 text-black/50">{note}</p>
        </div>
      </div>
    </div>
  );
}

function GuidanceCard({
  tab,
}: {
  tab: Exclude<InternalTabKey, "overview" | "requests" | "audit">;
}) {
  const guidance = tabGuidance[tab];

  return (
    <section className="mb-6 rounded-sm border border-black/10 bg-white p-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-sm border border-black/8 bg-[#faf9f6] p-4">
          <p className="text-[11px] tracking-[0.35px] text-black/45">Relationship</p>
          <p className="mt-2 text-sm leading-6 text-black/68">{guidance.relation}</p>
        </div>
        <div className="rounded-sm border border-black/8 bg-[#faf9f6] p-4">
          <p className="text-[11px] tracking-[0.35px] text-black/45">Prerequisite</p>
          <p className="mt-2 text-sm leading-6 text-black/68">{guidance.prerequisite}</p>
        </div>
        <div className="rounded-sm border border-black/8 bg-[#faf9f6] p-4">
          <p className="text-[11px] tracking-[0.35px] text-black/45">Next Step</p>
          <p className="mt-2 text-sm leading-6 text-black/68">{guidance.next}</p>
        </div>
      </div>
    </section>
  );
}

function SectionShell({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-sm border border-black/10 bg-white p-4">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-black">{title}</h2>
        <p className="mt-1 text-sm text-black/55">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
      <p className="text-sm font-medium text-black">{title}</p>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">{detail}</p>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  defaultValue,
  help,
  example,
  required = false,
  disabled = false,
  type = "text",
  autoComplete,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  help?: string;
  example?: string;
  required?: boolean;
  disabled?: boolean;
  type?: "text" | "password";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
      />
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
      {example ? (
        <span className="mt-1 block text-xs leading-5 text-black/40">
          Example: <code className="rounded bg-black/[0.04] px-1 py-0.5 text-[11px]">{example}</code>
        </span>
      ) : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  placeholder,
  defaultValue,
  help,
  example,
  disabled = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  defaultValue?: string;
  help?: string;
  example?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        disabled={disabled}
        className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
      />
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
      {example ? (
        <span className="mt-1 block text-xs leading-5 text-black/40">
          Example: <code className="rounded bg-black/[0.04] px-1 py-0.5 text-[11px]">{example}</code>
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
  help,
  disabled = false,
}: {
  label: string;
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  defaultValue?: string;
  help?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        disabled={disabled}
        className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
    </label>
  );
}

export default async function InternalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const data = await getInternalAdminData();

  if (!data) {
    redirect("/login");
  }

  if (!data.authorized) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#f7f6f1] text-[#111111]">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(202,232,207,0.52),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,224,194,0.4),transparent_26%),linear-gradient(180deg,#fbfaf5_0%,#f4f3ee_46%,#efeee7_100%)]" />
        <div className="relative mx-auto max-w-4xl px-4 py-10">
          <div className="rounded-sm border border-black/10 bg-white p-6">
            <p className="text-[11px] tracking-[0.35px] text-black/55">Internal Access</p>
            <h1 className="mt-2 text-3xl font-semibold text-black">Access restricted</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/55">
              This internal control plane is only available to workspace owners and admins.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const providerModelOptions = data.providerModels.map((item) => ({
    value: item.id,
    label: `${item.supportedModelName} / ${item.providerName} / ${item.upstream_model_slug}`,
  }));
  const hasProviders = data.providers.length > 0;
  const hasSupportedModels = data.supportedModels.length > 0;
  const hasProviderModels = data.providerModels.length > 0;
  const hasCredentials = data.providerCredentials.length > 0;
  const hasRoutes = data.routingRules.length > 0;
  const hasRequests = data.requests.length > 0;
  const hasAudit = data.auditLogs.length > 0;
  const selectedTemplateKey = getSearchValue(resolvedSearchParams, "template");
  const activeTab = getTabValue(getSearchValue(resolvedSearchParams, "tab"));
  const selectedTemplate =
    selectedTemplateKey && selectedTemplateKey in providerTemplates
      ? providerTemplates[selectedTemplateKey as keyof typeof providerTemplates]
      : null;
  const sidebarTabs = tabs.map((tab) => ({
    ...tab,
    count:
      tab.key === "public-models"
        ? data.metrics.publicModels
        : tab.key === "providers"
          ? data.metrics.providers
          : tab.key === "credentials"
            ? data.metrics.credentials
            : tab.key === "models"
              ? data.metrics.providerModels
              : tab.key === "routes"
                ? data.metrics.activeRoutes
                : undefined,
  }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f6f1] text-[#111111]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(202,232,207,0.52),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,224,194,0.4),transparent_26%),linear-gradient(180deg,#fbfaf5_0%,#f4f3ee_46%,#efeee7_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,rgba(221,229,215,0.55),transparent_56%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 xl:px-0">
        <section className="min-h-[calc(100vh-108px)] py-8">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] tracking-[0.35px] text-black/45">Internal Control</p>
              <h1 className="mt-2 text-3xl font-semibold leading-none text-[#111111]">
                Internal Control Plane
              </h1>
              <p className="mt-2 text-sm text-black/55">
                Real provider onboarding, routing, credentials, and execution visibility.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80">
                <span>{data.workspace.name}</span>
              </div>
              <div className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80">
                <span>{data.role}</span>
              </div>
              <div className="inline-flex h-9 items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80">
                <span>{data.user.name}</span>
              </div>
            </div>
          </div>

          <InternalShell activeTab={activeTab} selectedTemplateKey={selectedTemplateKey} tabs={sidebarTabs}>
          {activeTab === "overview" ? (
            <>
              <article className="mb-6 space-y-3 md:mb-8">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <OverviewCard
                    title="Public Models"
                    value={data.metrics.publicModels}
                    note={
                      hasSupportedModels
                        ? `${data.metrics.publicModels} active customer-facing capabilities`
                        : "No public capabilities defined yet"
                    }
                    icon={Network}
                  />
                  <OverviewCard
                    title="Providers"
                    value={data.metrics.providers}
                    note={
                      hasProviders
                        ? `${data.metrics.providers} configured upstream records`
                        : "No upstream vendors configured yet"
                    }
                    icon={ShieldCheck}
                  />
                  <OverviewCard
                    title="Provider Models"
                    value={data.metrics.providerModels}
                    note={
                      hasProviderModels
                        ? `${data.metrics.providerModels} provider-side model entries`
                        : "No provider models have been onboarded yet"
                    }
                    icon={ShieldCheck}
                  />
                  <OverviewCard
                    title="Credentials"
                    value={data.metrics.credentials}
                    note={
                      hasCredentials
                        ? `${data.metrics.credentials} active credential references`
                        : "No credential references stored yet"
                    }
                    icon={Fingerprint}
                  />
                  <OverviewCard
                    title="Active Routes"
                    value={data.metrics.activeRoutes}
                    note={
                      hasRoutes
                        ? `${data.metrics.activeRoutes} public routes currently enabled`
                        : "No public routing rules are active yet"
                    }
                    icon={Waypoints}
                  />
                </div>
              </article>

              <section className="mb-6">
                <SectionShell
                  id="overview-panel"
                  title="System Readiness"
                  description="A compact view of whether the control-plane chain is configured and ready for live traffic."
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                      <p className="text-sm font-medium text-black">Current chain</p>
                      <div className="mt-4 grid gap-3 text-sm text-black/65">
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          Public models: {hasSupportedModels ? "configured" : "missing"}
                        </div>
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          Providers and credentials: {hasProviders && hasCredentials ? "configured" : "incomplete"}
                        </div>
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          Provider models and routes: {hasProviderModels && hasRoutes ? "configured" : "incomplete"}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                      <p className="text-sm font-medium text-black">Operational checks</p>
                      <div className="mt-4 grid gap-3 text-sm text-black/65">
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          Dashboard visibility depends on an active route that is global or scoped to the user workspace.
                        </div>
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          API acceptance depends on an active API key and a route matching the requested public model slug.
                        </div>
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          Final execution still depends on a worker adapter and real upstream credentials.
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "public-models" ? (
            <>
              <GuidanceCard tab="public-models" />
              <section className="mb-6">
                <SectionShell
                id="public-models-panel"
                title="Public Models"
                description="Define the customer-facing OpenOctopus capabilities here. Multiple providers can implement the same public model."
                >
                <div className="mb-4 flex items-center gap-1.5 bg-[#e8f0ff] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#355fb4]" />
                  <p className="text-xs leading-[1.35] text-[#355fb4]">
                    This is the real clustering layer. If two providers both offer Gemini 2.5 image generation, they should both attach to one public model such as <code className="rounded bg-white px-1 py-0.5">openoctopus/gemini-image</code>.
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-3">
                    {hasSupportedModels ? (
                      data.supportedModels.map((model) => (
                        <div key={model.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                                  {model.modality}
                                </span>
                                <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                                  {model.active ? "active" : "inactive"}
                                </span>
                              </div>
                              <p className="mt-3 text-sm font-medium text-black">{model.display_name}</p>
                              <p className="mt-1 text-xs text-black/50">{model.model_slug}</p>
                              <p className="mt-1 text-xs text-black/50">
                                billing: {model.billingSummary}
                              </p>
                            </div>

                            <form action={updateSupportedModelState} className="flex items-center gap-2">
                              <input type="hidden" name="supportedModelId" value={model.id} />
                              <input type="hidden" name="active" value={model.active ? "false" : "true"} />
                              <SubmitButton label={model.active ? "Deactivate" : "Activate"} />
                            </form>
                          </div>

                          <div className="mt-4 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
                            <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                              Provider label: {model.provider}
                            </div>
                            <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                              Implementations: {model.activeProviderModelCount}/{model.providerModelCount} active
                            </div>
                            <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                              Created: {model.createdLabel}
                            </div>
                          </div>

                          <form action={updateSupportedModelPricing} className="mt-4 rounded-sm border border-black/8 bg-white p-3">
                            <input type="hidden" name="supportedModelId" value={model.id} />
                            <div className="grid gap-3">
                              <BillingConfigEditor initialValue={model.billingConfigText} />
                              <div className="flex justify-end">
                                <SubmitButton label="Update billing" />
                              </div>
                            </div>
                          </form>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No public models yet"
                        detail="Create a public capability first, for example openoctopus/gemini-image. Providers and routes should attach to this layer rather than inventing separate user-facing slugs."
                      />
                    )}
                  </div>

                  <form action={createSupportedModel} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                    <div className="grid gap-4">
                      <Field
                        label="Provider Label"
                        name="provider"
                        defaultValue="OpenOctopus"
                        help="Human-readable owner label for this public model. In most cases keep this as OpenOctopus."
                        example="OpenOctopus"
                        required
                      />
                      <Field
                        label="Public Model Slug"
                        name="modelSlug"
                        defaultValue="openoctopus/gemini-image"
                        help="Customer-facing capability slug. This is what users conceptually buy from OpenOctopus."
                        example="openoctopus/gemini-image"
                        required
                      />
                      <Field
                        label="Display Name"
                        name="displayName"
                        defaultValue="Gemini Image"
                        help="Readable label for internal and future catalog views."
                        example="Gemini Image"
                        required
                      />
                      <SelectField
                        label="Modality"
                        name="modality"
                        options={[
                          { value: "image", label: "Image" },
                          { value: "video", label: "Video" },
                          { value: "audio", label: "Audio" },
                        ]}
                        help="High-level media type of this public capability."
                      />
                      <SelectField
                        label="Capability"
                        name="capability"
                        options={capabilityOptions}
                        defaultValue="image_generation"
                        help="Operational capability family for this public model. Provider models and routes must match this."
                      />
                      <BillingConfigEditor
                        initialValue={'{"billingMode":"hybrid","currency":"USD","charges":{"perImage":0.039,"inputTextTokensPerMillion":0.30}}'}
                      />
                      <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
                        <input type="checkbox" name="active" defaultChecked className="size-4 rounded border-black/20 bg-white accent-black" />
                        Active on create
                      </label>
                      <SubmitButton label="Add public model" />
                    </div>
                  </form>
                </div>
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "providers" ? (
            <>
              <GuidanceCard tab="providers" />
              <section className="mb-6 rounded-sm border border-black/10 bg-white p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-black">Quick Templates</h2>
                    <p className="mt-1 text-sm text-black/55">
                      Pre-fill common provider onboarding values so operators do not start from a blank form.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={buildInternalHref("providers", "gemini-direct")}
                      className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80 transition-colors hover:bg-black/[0.03]"
                    >
                      Gemini Direct
                    </a>
                    <a
                      href={buildInternalHref("providers", "wavespeed")}
                      className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80 transition-colors hover:bg-black/[0.03]"
                    >
                      WaveSpeed
                    </a>
                    <a
                      href={buildInternalHref("providers")}
                      className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/80 transition-colors hover:bg-black/[0.03]"
                    >
                      Clear
                    </a>
                  </div>
                </div>
                {selectedTemplate ? (
                  <div className="mt-4 flex items-center gap-1.5 bg-[#e8f0ff] px-3 py-2.5">
                    <CircleAlert className="size-3.5 shrink-0 text-[#355fb4]" />
                    <p className="text-xs leading-[1.35] text-[#355fb4]">
                      Template loaded. Review each field and replace any placeholder values before saving.
                    </p>
                  </div>
                ) : null}
              </section>
              <SectionShell
                id="providers-panel"
                title="Providers"
                description="Register real upstream vendors here. No sample providers are preloaded."
              >
              <div className="mb-4 flex items-center gap-1.5 bg-[#eef3ea] px-3 py-2.5">
                <CircleAlert className="size-3.5 shrink-0 text-[#335d2d]" />
                <p className="text-xs leading-[1.35] text-[#335d2d]">
                  A provider is a supply source, not a customer-facing model. Multiple providers can map to one public model such as Gemini Image.
                </p>
              </div>
              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  {hasProviders ? (
                    data.providers.map((provider) => (
                      <div
                        key={provider.id}
                        className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-6 items-center rounded-sm bg-[#eef3ea] px-2 text-[11px] text-[#335d2d]">
                                {provider.kind}
                              </span>
                              <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                                {provider.status}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-black">{provider.name}</p>
                            <p className="mt-1 text-xs text-black/50">{provider.slug}</p>
                            <p className="mt-1 text-xs text-black/50">
                              {provider.base_url ?? "No base URL"}
                            </p>
                          </div>

                          <form action={updateProviderStatus} className="flex items-center gap-2">
                            <input type="hidden" name="providerId" value={provider.id} />
                            <select
                              name="status"
                              defaultValue={provider.status}
                              className="h-9 rounded-sm border border-black/10 bg-white px-3 text-xs text-black"
                            >
                              {providerStatusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            <SubmitButton label="Save" />
                          </form>
                        </div>

                        <div className="mt-4 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Regions: {provider.regionsLabel}
                          </div>
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Models: {provider.activeModelCount}/{provider.modelCount} active
                          </div>
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Credentials: {provider.credentialCount}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No providers yet"
                      detail="Start by adding your first real upstream provider, for example your direct Gemini account or any partner API you intend to resell behind the OpenOctopus surface."
                    />
                  )}
                </div>

                <form action={createProvider} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                  <div className="grid gap-4">
                    <Field
                      label="Name"
                      name="name"
                      defaultValue={selectedTemplate?.provider.name}
                      placeholder="Gemini Direct"
                      help="Internal display name for this upstream vendor. Operators will see this name in routing and request history."
                      example="Gemini Direct"
                      required
                    />
                    <Field
                      label="Slug"
                      name="slug"
                      defaultValue={selectedTemplate?.provider.slug}
                      placeholder="gemini-direct"
                      help="Stable internal identifier. Use lowercase letters and hyphens. Avoid changing it later."
                      example="gemini-direct"
                      required
                    />
                    <SelectField
                      label="Kind"
                      name="kind"
                      options={providerKindOptions}
                      defaultValue={selectedTemplate?.provider.kind}
                      help="Use custom for direct official APIs, wavespeed for WaveSpeed-backed supply, and partner for other third-party resellers."
                    />
                    <Field
                      label="Base URL"
                      name="baseUrl"
                      defaultValue={selectedTemplate?.provider.baseUrl}
                      placeholder="https://generativelanguage.googleapis.com"
                      help="Base endpoint for this provider. Leave blank only if the adapter fully hardcodes the upstream endpoint."
                      example="https://generativelanguage.googleapis.com"
                    />
                    <SelectField
                      label="Status"
                      name="status"
                      options={providerStatusOptions}
                      defaultValue={selectedTemplate?.provider.status ?? "healthy"}
                      help="Manual operator status. Healthy means ready for routing, degraded means caution, offline means do not send traffic."
                    />
                    <Field
                      label="Regions"
                      name="regions"
                      defaultValue={selectedTemplate?.provider.regions}
                      placeholder="us-east1, asia-southeast1"
                      help="Optional. Only fill this if this provider has region-specific endpoints, routing, or commercial constraints. Otherwise leave it empty."
                      example="us-east1, asia-southeast1"
                    />
                    <TextAreaField
                      label="Config JSON"
                      name="config"
                      defaultValue={selectedTemplate?.provider.config ?? "{}"}
                      help="Optional provider-level settings. Use this for adapter behavior such as timeout, API version, polling defaults, or transport mode. If you do not need extra settings yet, keep it as an empty object."
                      example={'{"timeoutMs":60000,"apiVersion":"v1beta"}'}
                    />
                    <SubmitButton label="Add provider" />
                  </div>
                </form>
              </div>
              </SectionShell>
            </>
          ) : null}

          {activeTab === "credentials" ? (
            <>
              <GuidanceCard tab="credentials" />
              <section className="mt-6">
                <SectionShell
                id="credentials-panel"
                title="Provider Credentials"
                description="Store encrypted provider secrets here. Secrets are masked after save and never shown again."
                >
                <div className="mb-4 flex items-center gap-1.5 bg-amber-500/10 px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-amber-600" />
                  <p className="text-xs leading-[1.35] text-amber-900/70">
                    Secrets entered here are encrypted server-side before storage. The worker decrypts them at runtime.
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <form action={createProviderCredential} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                    <div className="grid gap-4">
                      <SelectField
                        label="Provider"
                        name="providerId"
                        options={
                          hasProviders
                            ? data.providers.map((item) => ({
                                value: item.id,
                                label: `${item.name} (${item.slug})`,
                              }))
                            : [{ value: "", label: "Add a provider first" }]
                        }
                        disabled={!hasProviders}
                        help="Choose which provider this credential belongs to."
                      />
                      <Field
                        label="Label"
                        name="label"
                        defaultValue={selectedTemplate?.credential.label}
                        placeholder="Primary production key"
                        help="Human-readable name for this credential set. Use names that help operators distinguish prod, staging, backup, or rotated keys."
                        example="Primary production key"
                        required
                        disabled={!hasProviders}
                      />
                      <Field
                        label="Secret"
                        name="secret"
                        type="password"
                        placeholder="Paste the real upstream API key"
                        help="The raw provider secret. It is encrypted immediately on the server and cannot be viewed again after save."
                        required
                        disabled={!hasProviders}
                        autoComplete="new-password"
                      />
                      <Field
                        label="Reference (Optional)"
                        name="secretRef"
                        defaultValue={selectedTemplate?.credential.secretRef}
                        placeholder="Google AI Studio production key"
                        help="Optional operator note for where this secret came from or how to identify it during rotation."
                        example="Google AI Studio production key"
                        disabled={!hasProviders}
                      />
                      <Field
                        label="Environment"
                        name="environment"
                        defaultValue={selectedTemplate?.credential.environment}
                        placeholder="production"
                        help="Execution environment this credential is intended for."
                        example="production"
                        required
                        disabled={!hasProviders}
                      />
                      <TextAreaField
                        label="Notes"
                        name="notes"
                        defaultValue={selectedTemplate?.credential.notes}
                        placeholder="Quota approved Apr 2026"
                        help="Optional free-form operator notes such as who owns the key, why it was rotated, or where it is approved for use."
                        example="Primary Gemini image credential for production traffic"
                        disabled={!hasProviders}
                      />
                      <TextAreaField
                        label="Metadata JSON"
                        name="metadata"
                        defaultValue={selectedTemplate?.credential.metadata ?? "{}"}
                        help="Optional machine-readable annotations for ops workflows. Leave as {} if you do not need extra metadata."
                        example={'{"owner":"infra","rotationPolicy":"90d"}'}
                        disabled={!hasProviders}
                      />
                      <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
                        <input
                          type="checkbox"
                          name="isActive"
                          defaultChecked
                          disabled={!hasProviders}
                          className="size-4 rounded border-black/20 bg-white accent-black"
                        />
                        Active on create
                      </label>
                      <SubmitButton label="Add credential" disabled={!hasProviders} />
                    </div>
                  </form>

                  <div className="space-y-3">
                    {hasCredentials ? (
                      data.providerCredentials.map((credential) => (
                        <div
                          key={credential.id}
                          className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                                  {credential.environment}
                                </span>
                                <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                                  {credential.secretSourceLabel}
                                </span>
                                {credential.is_active ? (
                                  <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#eef3ea] px-2 text-[11px] text-[#335d2d]">
                                    <BadgeCheck className="size-3" />
                                    active
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3 text-sm font-medium text-black">{credential.label}</p>
                              <p className="mt-1 text-xs text-black/50">
                                {credential.providerName} · {credential.secretMask}
                              </p>
                              {credential.secret_ref ? (
                                <p className="mt-1 text-xs text-black/50">reference: {credential.secret_ref}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-black/50">
                                secret updated: {credential.secretUpdatedLabel}
                              </p>
                              {credential.notes ? (
                                <p className="mt-2 text-xs leading-5 text-black/55">{credential.notes}</p>
                              ) : null}
                            </div>

                            <div className="flex flex-col gap-2">
                              <form action={updateProviderCredentialState} className="flex items-center gap-2">
                                <input type="hidden" name="credentialId" value={credential.id} />
                                <input type="hidden" name="isActive" value={credential.is_active ? "false" : "true"} />
                                <SubmitButton label={credential.is_active ? "Deactivate" : "Activate"} />
                              </form>
                              <form action={deleteProviderCredential} className="flex items-center gap-2">
                                <input type="hidden" name="credentialId" value={credential.id} />
                                <SubmitButton
                                  label="Delete"
                                  pendingLabel="Deleting..."
                                  disabled={credential.is_active}
                                  tone="danger"
                                />
                              </form>
                            </div>
                          </div>

                          {credential.secret_source !== "internal_encrypted" ? (
                            <div className="mt-4 flex items-center gap-1.5 bg-[#ffe7e3] px-3 py-2.5">
                              <CircleAlert className="size-3.5 shrink-0 text-[#b54432]" />
                              <p className="text-xs leading-[1.35] text-[#b54432]">
                                This is a legacy external reference only. Rotate it below before sending live traffic.
                              </p>
                            </div>
                          ) : null}

                          {credential.is_active ? (
                            <div className="mt-4 flex items-center gap-1.5 bg-[#fff4df] px-3 py-2.5">
                              <CircleAlert className="size-3.5 shrink-0 text-[#8a5a00]" />
                              <p className="text-xs leading-[1.35] text-[#8a5a00]">
                                Delete is only available after deactivation so queued traffic does not lose its credential.
                              </p>
                            </div>
                          ) : null}

                          <form action={rotateProviderCredentialSecret} className="mt-4 rounded-sm border border-black/8 bg-white p-3">
                            <input type="hidden" name="credentialId" value={credential.id} />
                            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
                              <Field
                                label="Rotate Secret"
                                name="secret"
                                type="password"
                                placeholder="Paste a replacement secret"
                                required
                                autoComplete="new-password"
                              />
                              <Field
                                label="Reference (Optional)"
                                name="secretRef"
                                defaultValue={credential.secret_ref ?? ""}
                                placeholder="Rotation ticket or source note"
                              />
                              <SubmitButton label="Rotate secret" />
                            </div>
                          </form>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No credentials yet"
                        detail="Once you add a provider, record the real secret reference here so the team knows which credential is active in each environment."
                      />
                    )}
                  </div>
                </div>
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "models" ? (
            <>
              <GuidanceCard tab="models" />
              <section className="mt-6">
                <SectionShell
                id="models-panel"
                title="Provider Models"
                description="Map your public OpenOctopus slugs to actual upstream model identifiers."
                >
                <div className="mb-4 flex items-center gap-1.5 bg-[#e8f0ff] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#355fb4]" />
                  <p className="text-xs leading-[1.35] text-[#355fb4]">
                    Provider models now attach to the public model catalog. This keeps all Gemini-capability implementations grouped under one customer-facing capability.
                  </p>
                </div>
                <div className="grid gap-4">
                  <CreateProviderModelForm
                    supportedModels={data.supportedModels.map((item) => ({
                      id: item.id,
                      modelSlug: item.model_slug,
                      displayName: item.display_name,
                      capability: item.capability,
                    }))}
                    providers={data.providers.map((item) => ({
                      id: item.id,
                      name: item.name,
                      slug: item.slug,
                    }))}
                    defaultSupportedModelSlug="openoctopus/gemini-image"
                    defaultUpstreamModelSlug={selectedTemplate?.providerModel.upstreamModelSlug}
                    defaultPricing={selectedTemplate?.providerModel.pricing}
                    defaultInputSchema={selectedTemplate?.providerModel.inputSchema}
                    defaultOutputSchema={selectedTemplate?.providerModel.outputSchema}
                    disabled={!hasProviders || !hasSupportedModels}
                  />

                  <div className="space-y-3">
                    {hasProviderModels ? (
                      data.providerModels.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                                  {item.capability}
                                </span>
                                <span className="text-sm font-medium text-black">{item.providerName}</span>
                              </div>
                              <p className="mt-3 text-sm font-medium text-black">{item.public_model_slug}</p>
                              <p className="mt-1 text-xs text-black/50">
                                public model: {item.supportedModelName}
                              </p>
                              <p className="mt-1 text-xs text-black/50">
                                upstream: {item.upstream_model_slug}
                              </p>
                            </div>

                            <form action={updateProviderModelState} className="flex items-center gap-2">
                              <input type="hidden" name="providerModelId" value={item.id} />
                              <input type="hidden" name="active" value={item.active ? "false" : "true"} />
                              <SubmitButton label={item.active ? "Deactivate" : "Activate"} />
                            </form>
                          </div>

                          <div className="mt-4 grid gap-3 text-xs text-black/55 xl:grid-cols-3">
                            <div className="rounded-sm border border-black/8 bg-white p-3">
                              <p className="text-[11px] tracking-[0.35px] text-black/45">Pricing</p>
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.pricingText}</pre>
                            </div>
                            <div className="rounded-sm border border-black/8 bg-white p-3">
                              <p className="text-[11px] tracking-[0.35px] text-black/45">Input schema</p>
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.inputSchemaText}</pre>
                            </div>
                            <div className="rounded-sm border border-black/8 bg-white p-3">
                              <p className="text-[11px] tracking-[0.35px] text-black/45">Output schema</p>
                              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.outputSchemaText}</pre>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState
                        title="No provider models yet"
                        detail="After creating a provider, add the real upstream model IDs you plan to expose behind OpenOctopus public model slugs."
                      />
                    )}
                  </div>
                </div>
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "routes" ? (
            <>
              <GuidanceCard tab="routes" />
              <section className="mt-6">
                <SectionShell
                id="routes-panel"
                title="Public Model Routes"
                description="Switch real traffic between upstreams here. Empty by default until you create your own routes."
                >
                <div className="mb-4 flex items-center gap-1.5 bg-[#eef3ea] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#335d2d]" />
                  <p className="text-xs leading-[1.35] text-[#335d2d]">
                    Operators choose which implementation is online for each public model here. Customers still only see the public OpenOctopus capability.
                  </p>
                </div>
                <div className="grid gap-4">
                  <CreateRoutingRuleForm
                    supportedModels={data.supportedModels.map((item) => ({
                      id: item.id,
                      modelSlug: item.model_slug,
                      displayName: item.display_name,
                      capability: item.capability,
                    }))}
                    providerModels={data.providerModels.map((item) => ({
                      id: item.id,
                      supportedModelId: item.supported_model_id,
                      supportedModelName: item.supportedModelName,
                      providerName: item.providerName,
                      upstreamModelSlug: item.upstream_model_slug,
                      capability: item.capability,
                    }))}
                    defaultStrategy={selectedTemplate?.route.routeStrategy}
                    defaultWorkspaceScope={selectedTemplate?.route.workspaceScope}
                    disabled={!hasProviderModels || !hasSupportedModels}
                  />

                  <div className="space-y-3">
                    {hasRoutes ? (
                      data.routingRules.map((rule) => (
                        <form
                          key={rule.id}
                          action={updateRoutingRule}
                          className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                        >
                          <input type="hidden" name="routingRuleId" value={rule.id} />
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-black/45">
                                <span>{rule.scopeLabel}</span>
                                <span>•</span>
                                <span>{rule.capability}</span>
                              </div>
                              <p className="mt-3 text-sm font-medium text-black">{rule.public_model_slug}</p>
                            </div>
                            <label className="flex items-center gap-2 rounded-sm border border-black/10 bg-white px-3 py-2 text-xs text-black/70">
                              <input
                                type="checkbox"
                                name="active"
                                defaultChecked={rule.active}
                                className="size-4 rounded border-black/20 bg-white accent-black"
                              />
                              Active
                            </label>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <SelectField
                              label="Primary"
                              name="primaryProviderModelId"
                              options={providerModelOptions}
                              defaultValue={rule.primary_provider_model_id}
                            />
                            <SelectField
                              label="Fallback"
                              name="fallbackProviderModelId"
                              options={[{ value: "", label: "No fallback" }, ...providerModelOptions]}
                              defaultValue={rule.fallback_provider_model_id ?? ""}
                            />
                            <SelectField
                              label="Strategy"
                              name="routeStrategy"
                              options={routeStrategies.map((item) => ({ value: item, label: item }))}
                              defaultValue={rule.route_strategy}
                            />
                          </div>

                          <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-black/52">
                              <span>Primary: {rule.primaryLabel}</span>
                              <span>Fallback: {rule.fallbackLabel}</span>
                            </div>
                            <SubmitButton label="Save route" />
                          </div>
                        </form>
                      ))
                    ) : (
                      <EmptyState
                        title="No routes yet"
                        detail="Create routes only after you have at least one real provider model. Until then, your public API surface should remain unbound."
                      />
                    )}
                  </div>
                </div>
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "requests" ? (
            <section className="mt-6">
              <SectionShell
                id="requests-panel"
                title="Recent Requests"
                description="Execution records will appear here after real traffic starts flowing."
              >
                {hasRequests ? (
                  <div className="space-y-3">
                    {data.requests.map((request) => (
                      <article
                        key={request.id}
                        className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                            {request.status}
                          </span>
                          <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                            {request.capability}
                          </span>
                        </div>

                        <p className="mt-3 text-sm font-medium text-black">{request.public_model_slug}</p>
                        <p className="mt-1 text-xs text-black/50">
                          {request.providerName} / {request.upstreamModelSlug}
                        </p>

                        <div className="mt-4 grid gap-2 text-xs text-black/55 md:grid-cols-2">
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Created: {request.createdLabel}
                          </div>
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Completed: {request.completedLabel}
                          </div>
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Attempts: {request.attemptCount}
                          </div>
                          <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                            Cost: {request.actual_cost ?? request.estimated_cost ?? 0}
                          </div>
                        </div>

                        {request.lastAttempt ? (
                          <div className="mt-4 rounded-sm border border-black/8 bg-white px-3 py-3 text-xs text-black/58">
                            <div className="flex items-center justify-between gap-3">
                              <span>Last attempt #{request.lastAttempt.attempt_no}</span>
                              <span>{request.lastAttempt.status}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span>Latency</span>
                              <span>{request.lastAttempt.latency_ms ?? "pending"} ms</span>
                            </div>
                            {request.error_message || request.lastAttempt.error_message ? (
                              <p className="mt-3 text-[#b54432]">
                                {request.error_message ?? request.lastAttempt.error_message}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No request traffic yet"
                    detail="This stays empty until you send real requests through the gateway. Once routing is configured and traffic starts, execution history will appear here."
                  />
                )}
              </SectionShell>
            </section>
          ) : null}

          {activeTab === "audit" ? (
            <section className="mt-6">
              <SectionShell
                id="audit-panel"
                title="Change Log"
                description="Every real control-plane mutation is recorded here for auditability."
              >
                {hasAudit ? (
                  <div className="space-y-3">
                    {data.auditLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-black/45">
                              <span>{log.action}</span>
                              <span>•</span>
                              <span>{log.target_type}</span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-black">{log.summary}</p>
                            {log.target_id ? (
                              <p className="mt-1 text-xs text-black/50">target: {log.target_id}</p>
                            ) : null}
                          </div>
                          <div className="text-xs text-black/45">{log.createdLabel}</div>
                        </div>

                        <div className="mt-4 rounded-sm border border-black/8 bg-white p-3 text-xs text-black/58">
                          <pre className="overflow-x-auto whitespace-pre-wrap">{log.detailsText}</pre>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No audit events yet"
                    detail="The audit trail starts once you create providers, credentials, models, or routing rules in this internal dashboard."
                  />
                )}
              </SectionShell>
            </section>
          ) : null}

          <section className="mt-6 rounded-sm border border-black/10 bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-[#f7f7f4] text-black/55">
                <ReceiptText className="size-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-black">Real-data-only internal workspace</p>
                <p className="mt-2 text-sm leading-6 text-black/55">
                  This control plane now assumes there are no default upstreams. Enter your real
                  providers, real credential references, real provider models, and real routes
                  from scratch.
                </p>
              </div>
            </div>
          </section>
          </InternalShell>
        </section>
      </div>
    </main>
  );
}
