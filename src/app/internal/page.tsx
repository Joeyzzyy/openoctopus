import { redirect } from "next/navigation";
import {
  CircleAlert,
  Fingerprint,
  Network,
  ShieldAlert,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { getInternalAdminData } from "@/lib/internal-admin-server";
import { clearApiKeyRequestRecords } from "./actions";
import { InternalShell } from "./internal-shell";
import {
  CredentialsPanel,
  ModelsPanel,
  ProvidersPanel,
  PublicModelsPanel,
  RoutesPanel,
} from "./internal-management-panels";
import { RequestRecordsClearForm } from "./request-records-clear-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabs = [
  {
    key: "overview",
    label: "总览",
    description: "控制台健康状态与配置指引。",
  },
  {
    key: "providers",
    label: "1. 供应商",
    description: "先登记 Google、WaveSpeed 等上游。",
  },
  {
    key: "public-models",
    label: "2. 公共模型",
    description: "定义用户看到的模型入口和售价。",
  },
  {
    key: "credentials",
    label: "3. 凭证",
    description: "给供应商绑定真实密钥。",
  },
  {
    key: "models",
    label: "4. 上游实现",
    description: "把供应商挂到公共模型，并填写内部成本。",
  },
  {
    key: "routes",
    label: "5. 路由",
    description: "决定当前流量走哪个供应商实现。",
  },
  {
    key: "requests",
    label: "请求记录",
    description: "近期调用与成本明细。",
  },
  {
    key: "audit",
    label: "审计",
    description: "配置变更历史与追踪。",
  },
] as const;

type InternalTabKey = (typeof tabs)[number]["key"];

const capabilityOptions = [
  { value: "image_generation", label: "图片生成" },
  { value: "image_edit", label: "图片编辑" },
  { value: "video_generation", label: "视频生成" },
] as const;

const providerStatusOptions = [
  { value: "healthy", label: "健康" },
  { value: "degraded", label: "降级" },
  { value: "offline", label: "离线" },
] as const;

const providerKindOptions = [
  { value: "wavespeed", label: "WaveSpeed" },
  { value: "partner", label: "合作方" },
  { value: "custom", label: "自定义" },
] as const;

function formatCurrency(value: number) {
  const absValue = Math.abs(value);
  const fractionDigits = absValue > 0 && absValue < 0.1 ? 6 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

const tabGuidance: Record<
  Exclude<InternalTabKey, "overview" | "requests" | "audit">,
  {
    relation: string;
    prerequisite: string;
    next: string;
  }
> = {
  providers: {
    relation:
      "这里记录真实上游供应商，例如 Google、WaveSpeed。它只描述供应商本身的基础信息，不代表用户可见的模型。",
    prerequisite: "这是第一步。先把供应商录进去，后面的凭证和上游实现都要依附在供应商下面。",
    next: "供应商创建后，去公共模型定义用户可见的模型入口和售价。",
  },
  "public-models": {
    relation:
      "这里定义用户看到的模型入口，例如 `openoctopus/gemini-image`。这里的价格是用户售价，不是供应商成本。",
    prerequisite: "通常是第二步。供应商和公共模型彼此独立，但后面的上游实现需要同时依附这两者。",
    next: "公共模型定义好后，去凭证给供应商绑定可用密钥。",
  },
  credentials: {
    relation:
      "凭证只属于供应商，用来保存真实可用的密钥引用和环境信息。它不影响用户售价，只决定这个供应商能不能调用。",
    prerequisite: "必须先有供应商。这通常是第三步。",
    next: "凭证准备好后，去上游实现，把某个供应商的真实模型挂到公共模型上，并填写内部成本。",
  },
  models: {
    relation:
      "这里是连接公共模型和供应商的映射层。每条上游实现代表“某个供应商提供某个公共模型的一种实现”。这里填写的是供应商成本，不是用户售价。",
    prerequisite: "必须同时先有供应商、公共模型和可用凭证。没有这三者，上游实现就没有意义。",
    next: "映射建好后去路由，决定线上主路由和回退实现走哪条。",
  },
  routes: {
    relation:
      "路由决定某个公共模型当前把流量发到哪个上游实现，是全链路真正生效的切换层。",
    prerequisite: "必须先有兼容的上游实现。你已经建好一套链路后，这里就是上线、切流和故障切换面板。",
    next: "切流后去请求记录看真实调用表现，去审计看变更记录。",
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

function buildRequestsFilterHref(input: {
  customer?: string;
  key?: string;
}) {
  const params = new URLSearchParams();
  params.set("tab", "requests");
  if (input.customer && input.customer !== "all") {
    params.set("requestCustomer", input.customer);
  }
  if (input.key && input.key !== "all") {
    params.set("requestKey", input.key);
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
          <p className="text-[11px] tracking-[0.35px] text-black/45">关系</p>
          <p className="mt-2 text-sm leading-6 text-black/68">{guidance.relation}</p>
        </div>
        <div className="rounded-sm border border-black/8 bg-[#faf9f6] p-4">
          <p className="text-[11px] tracking-[0.35px] text-black/45">前置条件</p>
          <p className="mt-2 text-sm leading-6 text-black/68">{guidance.prerequisite}</p>
        </div>
        <div className="rounded-sm border border-black/8 bg-[#faf9f6] p-4">
          <p className="text-[11px] tracking-[0.35px] text-black/45">下一步</p>
          <p className="mt-2 text-sm leading-6 text-black/68">{guidance.next}</p>
        </div>
      </div>
    </section>
  );
}

function SetupOrderCard() {
  const steps = [
    "1. 先建供应商：只填 Google / WaveSpeed 这类上游基础信息，例如名称、slug、base URL。",
    "2. 再建公共模型：定义用户可见的模型入口，例如 `openoctopus/gemini-image`，这里填的是用户售价。",
    "3. 然后配凭证：把真实密钥绑定到供应商。",
    "4. 再建上游实现：把“某个供应商的某个真实模型”挂到某个公共模型上，这里填的是供应商成本。",
    "5. 最后配路由：决定线上默认走哪个上游实现，是否有回退实现。",
  ];

  return (
    <section className="mb-6 rounded-sm border border-black/10 bg-white p-4">
      <h2 className="text-xl font-semibold text-black">推荐操作顺序</h2>
      <p className="mt-1 text-sm text-black/55">
        先把供应商、售价、凭证、上游实现、路由这五层分清，再去录数据，整个后台就不会绕。
      </p>
      <div className="mt-4 grid gap-3">
        {steps.map((step) => (
          <div key={step} className="rounded-sm border border-black/8 bg-[#faf9f6] px-4 py-3 text-sm text-black/72">
            {step}
          </div>
        ))}
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

function RequestMetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-sm border border-black/8 bg-white px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.8px] text-black/40">{label}</p>
      <p className="mt-1 text-sm font-medium text-black">{value}</p>
    </div>
  );
}

function RequestBreakdownSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: Array<{ label: string; value: string }>;
  emptyLabel: string;
}) {
  return (
    <section className="rounded-sm border border-black/8 bg-white px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.8px] text-black/40">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <div
              key={`${title}-${item.label}`}
              className="flex items-center justify-between gap-3 rounded-sm border border-black/8 bg-[#faf9f6] px-3 py-2 text-xs"
            >
              <span className="text-black/58">{item.label}</span>
              <span className="font-mono text-black">{item.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-black/45">{emptyLabel}</p>
      )}
    </section>
  );
}

function ReadinessItem({
  label,
  detail,
  ready,
}: {
  label: string;
  detail: string;
  ready: boolean;
}) {
  const Icon = ready ? ShieldCheck : ShieldAlert;

  return (
    <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-sm ${
            ready ? "bg-[#e7f4ea] text-[#1f6b3b]" : "bg-[#fff1dc] text-[#9a5a00]"
          }`}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-black">{label}</p>
          <p className="mt-1 text-xs leading-5 text-black/55">{detail}</p>
        </div>
      </div>
    </div>
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
            <p className="text-[11px] tracking-[0.35px] text-black/55">内部访问</p>
            <h1 className="mt-2 text-3xl font-semibold text-black">无权访问</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/55">
              这个内部控制台只对工作区 owner 和 admin 开放。
            </p>
          </div>
        </div>
      </main>
    );
  }

  const hasProviders = data.providers.length > 0;
  const hasSupportedModels = data.supportedModels.length > 0;
  const hasProviderModels = data.providerModels.length > 0;
  const hasCredentials = data.providerCredentials.length > 0;
  const hasRoutes = data.routingRules.length > 0;
  const hasAudit = data.auditLogs.length > 0;
  const selectedTemplateKey = getSearchValue(resolvedSearchParams, "template");
  const activeTab = getTabValue(getSearchValue(resolvedSearchParams, "tab"));
  const selectedRequestCustomer = getSearchValue(resolvedSearchParams, "requestCustomer") ?? "all";
  const selectedRequestKey = getSearchValue(resolvedSearchParams, "requestKey") ?? "all";
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
  const filteredRequests = data.requests.filter((request) => {
    const matchesCustomer =
      selectedRequestCustomer === "all" ||
      request.workspaceSlug === selectedRequestCustomer;
    const matchesKey =
      selectedRequestKey === "all" ||
      request.api_key_id === selectedRequestKey;

    return matchesCustomer && matchesKey;
  });
  const requestSummary = {
    customerCharge: filteredRequests.reduce((sum, request) => sum + request.customerCharge, 0),
    providerCost: filteredRequests.reduce((sum, request) => sum + request.providerCost, 0),
    profit: filteredRequests.reduce((sum, request) => sum + request.profit, 0),
    requestCount: filteredRequests.length,
  };
  const hasFilteredRequests = filteredRequests.length > 0;
  const selectedRequestKeyRecord =
    selectedRequestKey === "all"
      ? null
      : data.requestFilters.apiKeys.find((item) => item.id === selectedRequestKey) ?? null;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f6f1] text-[#111111]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(202,232,207,0.52),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,224,194,0.4),transparent_26%),linear-gradient(180deg,#fbfaf5_0%,#f4f3ee_46%,#efeee7_100%)]" />
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,rgba(221,229,215,0.55),transparent_56%)]" />

      <div className="relative mx-auto max-w-7xl px-4 pb-10 xl:px-0">
        <section className="min-h-[calc(100vh-108px)] py-8">
          <div className="mb-6">
            <div>
              <h1 className="mt-2 text-3xl font-semibold leading-none text-[#111111]">
                内部控制台
              </h1>
              <p className="mt-2 text-sm text-black/55">
                用于管理真实供应商接入、路由、凭证和调用可观测性。
              </p>
              <p className="mt-3 text-xs text-black/42">
                {data.workspace.name} · {data.role}
              </p>
            </div>
          </div>

          <InternalShell activeTab={activeTab} selectedTemplateKey={selectedTemplateKey} tabs={sidebarTabs}>
          {activeTab === "overview" ? (
            <>
              <SetupOrderCard />
              <article className="mb-6 space-y-3 md:mb-8">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <OverviewCard
                    title="公共模型（用户售价）"
                    value={data.metrics.publicModels}
                    note={
                      hasSupportedModels
                        ? `${data.metrics.publicModels} 个已启用的客户侧能力`
                        : "还没有定义公共能力"
                    }
                    icon={Network}
                  />
                  <OverviewCard
                    title="供应商"
                    value={data.metrics.providers}
                    note={
                      hasProviders
                        ? `${data.metrics.providers} 个已配置上游记录`
                        : "还没有配置上游供应商"
                    }
                    icon={ShieldCheck}
                  />
                  <OverviewCard
                    title="上游实现（供应商成本）"
                    value={data.metrics.providerModels}
                    note={
                      hasProviderModels
                        ? `${data.metrics.providerModels} 条供应商侧模型记录`
                        : "还没有接入供应商模型"
                    }
                    icon={ShieldCheck}
                  />
                  <OverviewCard
                    title="凭证"
                    value={data.metrics.credentials}
                    note={
                      hasCredentials
                        ? `${data.metrics.credentials} 个已启用密钥引用`
                        : "还没有保存密钥引用"
                    }
                    icon={Fingerprint}
                  />
                  <OverviewCard
                    title="已启用路由"
                    value={data.metrics.activeRoutes}
                    note={
                      hasRoutes
                        ? `${data.metrics.activeRoutes} 条公共路由正在启用`
                        : "还没有启用公共路由规则"
                    }
                    icon={Waypoints}
                  />
                </div>
              </article>

              <section className="mb-6">
                <SectionShell
                  id="overview-panel"
                  title="系统就绪状态"
                  description="快速确认控制台链路是否已配置完成，能否承接真实流量。"
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                      <p className="text-sm font-medium text-black">当前链路</p>
                      <div className="mt-4 grid gap-3 text-sm text-black/65">
                        <ReadinessItem
                          label="公共模型"
                          detail={hasSupportedModels ? "已配置，可作为客户侧能力入口参与路由。" : "缺少公共能力定义。"}
                          ready={hasSupportedModels}
                        />
                        <ReadinessItem
                          label="供应商与凭证"
                          detail={hasProviders && hasCredentials ? "上游供应商和密钥引用已就位。" : "供应商接入或凭证配置还不完整。"}
                          ready={hasProviders && hasCredentials}
                        />
                        <ReadinessItem
                          label="供应商模型与路由"
                          detail={hasProviderModels && hasRoutes ? "供应商侧实现已完成映射，并可被路由。" : "供应商模型映射或路由配置还不完整。"}
                          ready={hasProviderModels && hasRoutes}
                        />
                      </div>
                    </div>

                    <div className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
                      <p className="text-sm font-medium text-black">运行检查</p>
                      <div className="mt-4 grid gap-3 text-sm text-black/65">
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          Dashboard 是否可见取决于是否存在全局路由，或是否存在当前工作区级别的启用路由。
                        </div>
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          API 是否接收请求取决于 API Key 是否启用，以及是否存在匹配请求公共模型 slug 的路由。
                        </div>
                        <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                          最终执行仍然依赖 worker adapter 和真实上游凭证。
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
                title="公共模型（用户售价）"
                description="这里定义用户看到的模型入口，以及用户侧售价。多个供应商可以共同实现同一个公共模型。"
                >
                <div className="mb-4 flex items-center gap-1.5 bg-[#e8f0ff] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#355fb4]" />
                  <p className="text-xs leading-[1.35] text-[#355fb4]">
                    这里填的是用户看到的模型入口和用户售价，不是供应商成本。如果两个供应商都提供 Gemini 2.5 图片生成能力，它们应该都挂到同一个公共模型，例如 <code className="rounded bg-white px-1 py-0.5">openoctopus/gemini-image</code>。
                  </p>
                </div>
                <PublicModelsPanel models={data.supportedModels} capabilityOptions={capabilityOptions} />
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
                    <h2 className="text-xl font-semibold text-black">快速模板</h2>
                    <p className="mt-1 text-sm text-black/55">
                      预填常见供应商接入字段，避免操作员从空表单开始。
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
                      清除
                    </a>
                  </div>
                </div>
                {selectedTemplate ? (
                  <div className="mt-4 flex items-center gap-1.5 bg-[#e8f0ff] px-3 py-2.5">
                    <CircleAlert className="size-3.5 shrink-0 text-[#355fb4]" />
                    <p className="text-xs leading-[1.35] text-[#355fb4]">
                      模板已载入。保存前请逐项检查，并替换所有占位值。
                    </p>
                  </div>
                ) : null}
              </section>
              <SectionShell
                id="providers-panel"
                title="供应商"
                description="在这里登记真实上游供应商。系统不会预置示例供应商。"
              >
              <div className="mb-4 flex items-center gap-1.5 bg-[#eef3ea] px-3 py-2.5">
                <CircleAlert className="size-3.5 shrink-0 text-[#335d2d]" />
                <p className="text-xs leading-[1.35] text-[#335d2d]">
                  供应商是供给来源，不是客户看到的模型。多个供应商可以映射到同一个公共模型，例如 Gemini Image。
                </p>
              </div>
              <ProvidersPanel
                providers={data.providers}
                providerKindOptions={providerKindOptions}
                providerStatusOptions={providerStatusOptions}
                selectedTemplate={selectedTemplate}
              />
              </SectionShell>
            </>
          ) : null}

          {activeTab === "credentials" ? (
            <>
              <GuidanceCard tab="credentials" />
              <section className="mt-6">
                <SectionShell
                id="credentials-panel"
                title="供应商凭证"
                description="在这里保存加密后的供应商密钥。密钥保存后会被掩码展示，不再明文显示。"
                >
                <div className="mb-4 flex items-center gap-1.5 bg-amber-500/10 px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-amber-600" />
                  <p className="text-xs leading-[1.35] text-amber-900/70">
                    这里输入的密钥会先在服务端加密再写入数据库。worker 在运行时解密使用。
                  </p>
                </div>
                <CredentialsPanel
                  credentials={data.providerCredentials}
                  providers={data.providers}
                  selectedTemplate={selectedTemplate}
                />
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
                title="上游实现（供应商成本）"
                description="把公共模型映射到真实上游模型，并填写内部供应商成本。这里不是用户售价。"
                >
                <div className="mb-4 flex items-center gap-1.5 bg-[#e8f0ff] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#355fb4]" />
                  <p className="text-xs leading-[1.35] text-[#355fb4]">
                    这里填的是供应商真实结算成本，不是用户售价。用户售价在“公共模型”里维护；这里维护的是某个供应商对这个公共模型的一种实现和进货成本。
                  </p>
                </div>
                <ModelsPanel
                  providerModels={data.providerModels}
                  providers={data.providers}
                  supportedModels={data.supportedModels}
                  selectedTemplate={selectedTemplate}
                />
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
                title="公共模型路由"
                description="在这里切换真实流量应该走哪个上游实现。默认为空，需要你自己创建路由。"
                >
                <div className="mb-4 flex items-center gap-1.5 bg-[#eef3ea] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#335d2d]" />
                  <p className="text-xs leading-[1.35] text-[#335d2d]">
                    操作员在这里选择每个公共模型当前上线哪个实现。客户侧仍然只看到 OpenOctopus 的公共能力。
                  </p>
                </div>
                <RoutesPanel
                  routingRules={data.routingRules}
                  providerModels={data.providerModels}
                  supportedModels={data.supportedModels}
                  selectedTemplate={selectedTemplate}
                />
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "requests" ? (
            <section className="mt-6">
              <SectionShell
                id="requests-panel"
                title="近期请求"
                description="按客户和 API Key 筛选，查看每条请求的收入、成本和计费拆分。"
              >
                <div className="mb-4 grid gap-3 rounded-sm border border-black/8 bg-[#faf9f6] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                    <p className="text-[11px] tracking-[0.35px] text-black/45">客户</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-black">{data.workspace.name}</p>
                        <p className="mt-1 text-xs text-black/45">{data.workspace.slug}</p>
                      </div>
                      <a
                        href={buildRequestsFilterHref({
                          customer: data.workspace.slug,
                          key: selectedRequestKey,
                        })}
                        className="inline-flex h-8 items-center rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
                      >
                        当前客户
                      </a>
                    </div>
                  </div>

                  <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                    <p className="text-[11px] tracking-[0.35px] text-black/45">API Key 筛选</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={buildRequestsFilterHref({
                          customer: selectedRequestCustomer,
                          key: "all",
                        })}
                        className={`inline-flex h-8 items-center rounded-sm border px-3 text-xs font-medium transition-colors ${
                          selectedRequestKey === "all"
                            ? "border-black bg-black text-white"
                            : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                        }`}
                      >
                        全部 Key
                      </a>
                      {data.requestFilters.apiKeys.map((item) => (
                        <a
                          key={item.id}
                          href={buildRequestsFilterHref({
                            customer: selectedRequestCustomer,
                            key: item.id,
                          })}
                          className={`inline-flex h-8 items-center rounded-sm border px-3 text-xs font-medium transition-colors ${
                            selectedRequestKey === item.id
                              ? "border-black bg-black text-white"
                              : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                          }`}
                        >
                          {item.name}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-sm border border-black/8 bg-white px-3 py-3">
                    <p className="text-[11px] tracking-[0.35px] text-black/45">当前选择</p>
                    <p className="mt-2 text-sm font-medium text-black">
                      {selectedRequestKeyRecord ? selectedRequestKeyRecord.name : "全部 Key"}
                    </p>
                    <p className="mt-1 text-xs text-black/45">
                      {selectedRequestKeyRecord
                        ? `${selectedRequestKeyRecord.keyPrefix} · ${selectedRequestKeyRecord.environment}`
                        : `${data.workspace.slug} · 全部请求记录`}
                    </p>
                  </div>
                </div>

                {selectedRequestKeyRecord ? (
                  <RequestRecordsClearForm
                    action={clearApiKeyRequestRecords}
                    apiKeyId={selectedRequestKeyRecord.id}
                    apiKeyName={selectedRequestKeyRecord.name}
                  />
                ) : null}

                <div className="mb-4 grid gap-3 md:grid-cols-4">
                  <OverviewCard
                    title="请求数"
                    value={requestSummary.requestCount}
                    note="当前筛选条件下的请求行数"
                    icon={Network}
                  />
                  <OverviewCard
                    title="客户收费"
                    value={formatCurrency(requestSummary.customerCharge)}
                    note="来源：inference_requests 客户收费字段"
                    icon={Fingerprint}
                  />
                  <OverviewCard
                    title="供应商成本"
                    value={formatCurrency(requestSummary.providerCost)}
                    note="来源：inference_requests 供应商成本字段"
                    icon={ShieldCheck}
                  />
                  <OverviewCard
                    title="利润"
                    value={formatCurrency(requestSummary.profit)}
                    note="客户收费减去供应商成本"
                    icon={Waypoints}
                  />
                </div>

                {hasFilteredRequests ? (
                  <div className="space-y-3">
                    {filteredRequests.map((request) => (
                      <article
                        key={request.id}
                        className="rounded-sm border border-black/10 bg-[#faf9f6] p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
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
                            <p className="mt-1 text-xs text-black/45">
                              {request.customerName} · {request.apiKeyName} · {request.apiKeyPrefix}
                            </p>
                          </div>

                          <div className="grid min-w-[280px] gap-2 sm:grid-cols-3 lg:w-[360px]">
                            <RequestMetricCard label="客户收费" value={request.customerChargeLabel} />
                            <RequestMetricCard label="供应商成本" value={request.providerCostLabel} />
                            <RequestMetricCard label="利润" value={request.profitLabel} />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                          <section className="rounded-sm border border-black/8 bg-white px-3 py-3">
                            <p className="text-[10px] uppercase tracking-[0.8px] text-black/40">请求摘要</p>
                            <div className="mt-3 grid gap-2 sm:grid-cols-2">
                              <RequestMetricCard label="创建时间" value={request.createdLabel} />
                              <RequestMetricCard label="完成时间" value={request.completedLabel} />
                              <RequestMetricCard label="尝试次数" value={String(request.attemptCount)} />
                              <RequestMetricCard
                                label="最后延迟"
                                value={
                                  request.lastAttempt
                                    ? `${request.lastAttempt.latency_ms ?? "等待中"} ms`
                                    : "无尝试"
                                }
                              />
                            </div>
                            {request.lastAttempt ? (
                              <div className="mt-3 rounded-sm border border-black/8 bg-[#faf9f6] px-3 py-2.5 text-xs">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-black/58">
                                    最后一次尝试 #{request.lastAttempt.attempt_no}
                                  </span>
                                  <span className="font-medium text-black">
                                    {request.lastAttempt.status}
                                  </span>
                                </div>
                                {request.error_message || request.lastAttempt.error_message ? (
                                  <p className="mt-2 leading-5 text-[#b54432]">
                                    {request.error_message ?? request.lastAttempt.error_message}
                                  </p>
                                ) : null}
                              </div>
                            ) : null}
                          </section>

                          <RequestBreakdownSection
                            title="使用量指标"
                            items={request.usageBreakdown}
                            emptyLabel="没有记录到使用量指标"
                          />

                          <div className="grid gap-3">
                            <RequestBreakdownSection
                              title="客户侧计费"
                              items={request.customerComponentBreakdown}
                              emptyLabel="没有客户侧可计费组件"
                            />
                            <RequestBreakdownSection
                              title="供应商成本"
                              items={request.providerComponentBreakdown}
                              emptyLabel="没有供应商侧成本拆分"
                            />
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="当前筛选条件下没有请求"
                    detail="调整客户或 API Key 筛选条件，或者通过 gateway 发送新流量。结算后这里会展示请求级经济数据。"
                  />
                )}
              </SectionShell>
            </section>
          ) : null}

          {activeTab === "audit" ? (
            <section className="mt-6">
              <SectionShell
                id="audit-panel"
                title="变更日志"
                description="所有真实控制台配置变更都会记录在这里，便于审计追踪。"
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
                              <p className="mt-1 text-xs text-black/50">目标：{log.target_id}</p>
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
                    title="还没有审计事件"
                    detail="当你在内部后台创建供应商、凭证、模型或路由规则后，审计轨迹会从这里开始记录。"
                  />
                )}
              </SectionShell>
            </section>
          ) : null}
          </InternalShell>
        </section>
      </div>
    </main>
  );
}
