import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  CircleAlert,
  Fingerprint,
  Network,
  Activity,
  ShieldAlert,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { getInternalAdminData } from "@/lib/internal-admin-server";
import { clearApiKeyRequestRecords, unlockInternalAccess } from "./actions";
import { INTERNAL_ACCESS_COOKIE, INTERNAL_ACCESS_COOKIE_VALUE } from "@/lib/internal-access";
import { InternalShell } from "./internal-shell";
import { MonitoringAutoRefresh } from "./monitoring-auto-refresh";
import {
  CreateProviderButton,
  CreateModelVendorButton,
  CreateSupportedModelButton,
  CreateProviderModelMappingButton,
  EconomicsPanel,
  ModelVendorsPanel,
  ProvidersPanel,
  PublicModelsPanel,
  RoutesPanel,
  WorkerTemplatesPanel,
} from "./internal-management-panels";
import { RequestRecordsClearForm } from "./request-records-clear-form";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabs = [
  {
    key: "monitoring",
    group: "overview",
    label: "系统用量监控",
    description: "资源调度管理监测中心。",
  },
  {
    key: "worker-templates",
    group: "basic",
    label: "API 调用格式配置",
    description: "管理供应商模型调用格式模板。",
  },
  {
    key: "providers",
    group: "basic",
    label: "供应商管理",
    description: "同页管理上游厂商与供应商密钥。",
  },
  {
    key: "model-vendors",
    group: "basic",
    label: "模型厂商管理",
    description: "维护可售模型里的模型厂商名称列表。",
  },
  {
    key: "public-models",
    group: "basic",
    label: "可售模型管理",
    description: "定义用户可售模型、供应商模型映射与价格联动。",
  },
  {
    key: "economics",
    group: "basic",
    label: "模型价格总表",
    description: "统一查看和维护售价、成本、利润与调用协议配置。",
  },
  {
    key: "routes",
    group: "basic",
    label: "路由配置",
    description: "决定当前流量走哪个供应商模型。",
  },
  {
    key: "requests",
    group: "overview",
    label: "用户请求记录",
    description: "近期调用与成本明细。",
  },
  {
    key: "audit",
    group: "overview",
    label: "配置变更历史",
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

function getSearchValue(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] : value;
}

function getTabValue(value: string | undefined): InternalTabKey {
  return tabs.some((item) => item.key === value) ? (value as InternalTabKey) : "public-models";
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

const monitoringIntervalOptions = [
  { value: "minute", label: "按分钟" },
  { value: "hour", label: "按小时" },
  { value: "day", label: "按天" },
] as const;

const monitoringRangeOptions = [
  { value: "60m", label: "最近 60 分钟" },
  { value: "6h", label: "最近 6 小时" },
  { value: "24h", label: "最近 24 小时" },
  { value: "7d", label: "最近 7 天" },
  { value: "30d", label: "最近 30 天" },
  { value: "90d", label: "最近 90 天" },
] as const;

const monitoringStatusOptions = [
  { value: "all", label: "全部请求" },
  { value: "inflight", label: "进行中" },
  { value: "succeeded", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "cancelled", label: "已取消" },
] as const;

const monitoringViewOptions = [
  { value: "overview", label: "系统用量总览" },
  { value: "video", label: "视频任务监控" },
  { value: "image", label: "图片任务监控" },
] as const;

type MonitoringInterval = (typeof monitoringIntervalOptions)[number]["value"];
type MonitoringRange = (typeof monitoringRangeOptions)[number]["value"];
type MonitoringStatus = (typeof monitoringStatusOptions)[number]["value"];
type MonitoringView = (typeof monitoringViewOptions)[number]["value"];

function parseMonitoringInterval(value: string | undefined): MonitoringInterval {
  return monitoringIntervalOptions.some((option) => option.value === value)
    ? (value as MonitoringInterval)
    : "hour";
}

function parseMonitoringRange(value: string | undefined): MonitoringRange {
  return monitoringRangeOptions.some((option) => option.value === value)
    ? (value as MonitoringRange)
    : "24h";
}

function parseMonitoringStatus(value: string | undefined): MonitoringStatus {
  return monitoringStatusOptions.some((option) => option.value === value)
    ? (value as MonitoringStatus)
    : "all";
}

function parseMonitoringView(value: string | undefined): MonitoringView {
  return monitoringViewOptions.some((option) => option.value === value)
    ? (value as MonitoringView)
    : "overview";
}

function parseMonitoringRangeMs(value: MonitoringRange) {
  if (value.endsWith("m")) {
    return Number(value.replace("m", "")) * 60 * 1000;
  }

  if (value.endsWith("h")) {
    return Number(value.replace("h", "")) * 60 * 60 * 1000;
  }

  return Number(value.replace("d", "")) * 24 * 60 * 60 * 1000;
}

function getMonitoringBucketMs(interval: MonitoringInterval) {
  if (interval === "minute") {
    return 60 * 1000;
  }

  if (interval === "hour") {
    return 60 * 60 * 1000;
  }

  return 24 * 60 * 60 * 1000;
}

function formatMonitoringBucketLabel(date: Date, interval: MonitoringInterval) {
  if (interval === "minute") {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (interval === "hour") {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildMonitoringHref(input: {
  view: MonitoringView;
  interval: MonitoringInterval;
  range: MonitoringRange;
  status: MonitoringStatus;
}) {
  const params = new URLSearchParams();
  params.set("tab", "monitoring");
  params.set("monitoringView", input.view);
  params.set("monitoringInterval", input.interval);
  params.set("monitoringRange", input.range);
  params.set("monitoringStatus", input.status);
  return `/internal?${params.toString()}`;
}

function buildMonitoringSeries(
  modelLabels: Map<string, string>,
  requests: Array<{ public_model_slug: string; created_at: string; status: string }>,
  interval: MonitoringInterval,
  range: MonitoringRange
) {
  const bucketMs = getMonitoringBucketMs(interval);
  const rangeMs = parseMonitoringRangeMs(range);
  const now = Date.now();
  const end = Math.floor(now / bucketMs) * bucketMs;
  const start = end - rangeMs + bucketMs;
  const bucketCount = Math.max(1, Math.floor(rangeMs / bucketMs));
  const buckets = Array.from({ length: bucketCount }, (_, index) => start + index * bucketMs);
  const labels = buckets.map((bucket) => formatMonitoringBucketLabel(new Date(bucket), interval));
  const createEmptyPoints = () => Array.from({ length: bucketCount }, () => 0);

  const seriesMap = new Map<string, number[]>();

  for (const modelSlug of modelLabels.keys()) {
    seriesMap.set(modelSlug, createEmptyPoints());
  }

  for (const request of requests) {
    const timestamp = new Date(request.created_at).getTime();
    if (!Number.isFinite(timestamp) || timestamp < start || timestamp > end + bucketMs - 1) {
      continue;
    }

    const bucketIndex = Math.floor((timestamp - start) / bucketMs);
    if (bucketIndex < 0 || bucketIndex >= bucketCount) {
      continue;
    }

    const currentSeries =
      seriesMap.get(request.public_model_slug) ?? createEmptyPoints();
    currentSeries[bucketIndex] += 1;
    seriesMap.set(request.public_model_slug, currentSeries);
  }

  return Array.from(seriesMap.entries())
    .map(([modelSlug, values]) => ({
      modelSlug,
      title: modelLabels.get(modelSlug) ?? modelSlug,
      total: values.reduce((sum, value) => sum + value, 0),
      peak: Math.max(...values, 0),
      points: values,
      labels,
    }))
    .sort((a, b) => b.total - a.total || a.modelSlug.localeCompare(b.modelSlug));
}

function matchesMonitoringStatus(status: string, filter: MonitoringStatus) {
  if (filter === "all") {
    return true;
  }

  if (filter === "inflight") {
    return status === "queued" || status === "submitted" || status === "processing";
  }

  return status === filter;
}

function formatPercent(value: number) {
  return `${value.toFixed(value >= 10 || value === 0 ? 0 : 1)}%`;
}

function isInflightRequestStatus(status: string) {
  return status === "queued" || status === "submitted" || status === "processing";
}

function formatElapsedDuration(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "时间未知";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  const hours = Math.floor(diffSeconds / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function buildMonitoringHealthByModel(
  modelLabels: Map<string, string>,
  requests: Array<{ public_model_slug: string; status: string }>
) {
  const statsMap = new Map<
    string,
    {
      total: number;
      settled: number;
      succeeded: number;
      failed: number;
      cancelled: number;
      inflight: number;
    }
  >();

  for (const modelSlug of modelLabels.keys()) {
    statsMap.set(modelSlug, {
      total: 0,
      settled: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      inflight: 0,
    });
  }

  for (const request of requests) {
    const current = statsMap.get(request.public_model_slug) ?? {
      total: 0,
      settled: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      inflight: 0,
    };

    current.total += 1;

    if (request.status === "succeeded") {
      current.succeeded += 1;
      current.settled += 1;
    } else if (request.status === "failed") {
      current.failed += 1;
      current.settled += 1;
    } else if (request.status === "cancelled") {
      current.cancelled += 1;
      current.settled += 1;
    } else {
      current.inflight += 1;
    }

    statsMap.set(request.public_model_slug, current);
  }

  return statsMap;
}

function buildLinePath(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return "";
  }

  const maxValue = Math.max(...points, 1);
  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point / maxValue) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

const providerTemplates = {
  "gemini-direct": {
    provider: {
      name: "Gemini Direct",
      slug: "gemini-direct",
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
      pricing:
        '{\n  "billingMode": "hybrid",\n  "currency": "USD",\n  "charges": {\n    "inputTextTokensPerMillion": 0.3,\n    "outputTextTokensPerMillion": 30\n  }\n}',
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
      pricing:
        '{\n  "billingMode": "hybrid",\n  "currency": "USD",\n  "charges": {\n    "inputTextTokensPerMillion": 0.3,\n    "outputTextTokensPerMillion": 30\n  }\n}',
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
    <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="inline-flex size-7 shrink-0 items-center justify-center rounded-xl bg-white text-black/55">
          <Icon className="size-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] tracking-[0.35px] text-black/60">{title}</p>
          <p className="text-lg font-medium tracking-tight text-black">{value}</p>
        </div>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-black/50">{note}</p>
    </div>
  );
}

function SectionShell({
  id,
  title,
  description,
  headerRight,
  children,
}: {
  id: string;
  title: string;
  description: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-black">{title}</h2>
          <p className="mt-1 text-sm text-black/55">{description}</p>
        </div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
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
    <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
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
    <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5">
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
    <section className="rounded-xl border border-black/[0.06] bg-white px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.8px] text-black/40">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 grid gap-2">
          {items.map((item) => (
            <div
              key={`${title}-${item.label}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-black/[0.06] bg-[#FCFCFA] px-3 py-2 text-xs"
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
    <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-3">
      <div className="flex items-start gap-3">
        <div
          className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md ${
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

function MonitoringChartCard({
  title,
  points,
  labels,
  total,
  peak,
  intervalLabel,
  successRate,
  failureRate,
  settledCount,
  inflightCount,
}: {
  title: string;
  points: number[];
  labels: string[];
  total: number;
  peak: number;
  intervalLabel: string;
  successRate: string;
  failureRate: string;
  settledCount: number;
  inflightCount: number;
}) {
  const width = 520;
  const height = 180;
  const path = buildLinePath(points, width, height);
  const maxValue = Math.max(...points, 1);

  return (
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <p className="break-all text-sm font-medium text-black">{title}</p>
          <p className="mt-1 text-xs text-black/45">
            总调用 {total} · {intervalLabel}峰值 {peak}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-[#D7EADB] bg-[#EDF8F0] px-2.5 py-1 text-[11px] text-[#1F6B3B]">
            <span>成功率 {successRate}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-[#F0D1CB] bg-[#FFF1EE] px-2.5 py-1 text-[11px] text-[#B54432]">
            <span>失败率 {failureRate}</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-black/[0.08] bg-[#FCFCFA] px-2.5 py-1 text-[11px] text-black/60">
            <Activity className="size-3.5" />
            <span>峰值 {maxValue}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-black/45">
        <span>已结算 {settledCount}</span>
        <span>进行中 {inflightCount}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full"
          role="img"
          aria-label={`${title} usage chart`}
        >
          {[0.25, 0.5, 0.75, 1].map((ratio) => (
            <line
              key={ratio}
              x1="0"
              x2={width}
              y1={height - height * ratio}
              y2={height - height * ratio}
              stroke="rgba(17,17,17,0.08)"
              strokeDasharray="4 6"
            />
          ))}
          <path
            d={path}
            fill="none"
            stroke="#111111"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className="mt-3 flex items-center justify-between gap-4 text-[11px] text-black/45">
          <span>{labels[0] ?? ""}</span>
          <span>{labels[Math.floor(labels.length / 2)] ?? ""}</span>
          <span>{labels[labels.length - 1] ?? ""}</span>
        </div>
      </div>
    </div>
  );
}

function VideoTaskMonitoringCard({
  request,
}: {
  request: {
    id: string;
    publicModelSlug: string;
    status: string;
    workspaceName: string;
    workspaceSlug: string;
    createdAt: string;
    createdLabel: string;
    startedLabel: string;
    completedLabel: string;
    errorMessage: string | null;
    lastAttempt: {
      attemptNo: number;
      status: string;
      upstreamTaskId: string | null;
      latencyMs: number | null;
      errorMessage: string | null;
      updatedLabel: string;
    } | null;
  };
}) {
  const inflight = isInflightRequestStatus(request.status);
  const elapsedLabel = inflight ? formatElapsedDuration(request.createdAt) : request.completedLabel;

  return (
    <article className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${
                inflight
                  ? "border-[#F2DEC0] bg-[#FFF3E2] text-[#9A5A00]"
                  : request.status === "succeeded"
                    ? "border-[#D7EADB] bg-[#EDF8F0] text-[#1F6B3B]"
                    : "border-[#F0D1CB] bg-[#FFF1EE] text-[#B54432]"
              }`}
            >
              {request.status}
            </span>
            <span className="inline-flex h-6 items-center rounded-md border border-[#D8E4F8] bg-[#F3F7FF] px-2 text-[11px] text-[#355FB4]">
              video_generation
            </span>
          </div>
          <p className="mt-3 break-all text-sm font-medium text-black">{request.publicModelSlug}</p>
          <p className="mt-1 text-xs text-black/50">
            {request.workspaceName} · {request.workspaceSlug}
          </p>
          <p className="mt-2 break-all font-mono text-[11px] text-black/45">{request.id}</p>
        </div>

        <div className="grid min-w-[300px] gap-2 sm:grid-cols-2 lg:w-[420px]">
          <RequestMetricCard label="创建时间" value={request.createdLabel} />
          <RequestMetricCard label="已运行" value={elapsedLabel} />
          <RequestMetricCard label="开始处理" value={request.startedLabel} />
          <RequestMetricCard
            label="最后尝试"
            value={
              request.lastAttempt
                ? `#${request.lastAttempt.attemptNo} · ${request.lastAttempt.status}`
                : "无尝试"
            }
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.8px] text-black/40">上游轮询</p>
          {request.lastAttempt ? (
            <div className="mt-3 space-y-2 text-xs text-black/60">
              <p>最近回写：{request.lastAttempt.updatedLabel}</p>
              <p>提交延迟：{request.lastAttempt.latencyMs ?? "等待中"} ms</p>
              <p className="break-all font-mono text-[11px] text-black/45">
                {request.lastAttempt.upstreamTaskId ?? "尚无 upstream task id"}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-black/45">还没有 provider_attempts 记录。</p>
          )}
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
          <p className="text-[10px] uppercase tracking-[0.8px] text-black/40">错误 / 诊断</p>
          {request.errorMessage || request.lastAttempt?.errorMessage ? (
            <p className="mt-3 text-xs leading-5 text-[#b54432]">
              {request.errorMessage ?? request.lastAttempt?.errorMessage}
            </p>
          ) : (
            <p className="mt-3 text-xs text-black/45">
              {inflight ? "当前没有错误，正在等待上游结果。" : "当前没有错误信息。"}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

function ImageTaskLogRow({
  request,
}: {
  request: {
    id: string;
    capability: string;
    publicModelSlug: string;
    status: string;
    workspaceSlug: string;
    createdLabel: string;
    errorMessage: string | null;
  };
}) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 items-center rounded-md border border-[#E9E1CF] bg-[#F6F1E7] px-2 text-[11px] text-[#6F5B27]">
              {request.status}
            </span>
            <span className="inline-flex h-6 items-center rounded-md border border-[#D7EADB] bg-[#EDF8F0] px-2 text-[11px] text-[#436B39]">
              {request.capability}
            </span>
          </div>
          <p className="mt-2 break-all text-sm font-medium text-black">{request.publicModelSlug}</p>
          <p className="mt-1 text-xs text-black/45">
            {request.workspaceSlug} · {request.createdLabel}
          </p>
          <p className="mt-1 break-all font-mono text-[11px] text-black/40">{request.id}</p>
        </div>
        <div className="max-w-md text-xs leading-5 text-black/55">
          {request.errorMessage ?? "无错误，整体状态正常。"}
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
  const cookieStore = await cookies();
  const hasPasswordAccess =
    cookieStore.get(INTERNAL_ACCESS_COOKIE)?.value === INTERNAL_ACCESS_COOKIE_VALUE;

  if (!hasPasswordAccess) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#FCFCFA] text-[#111111]">
        <div className="relative mx-auto flex min-h-screen w-full max-w-[520px] items-center px-4 py-10">
          <section className="w-full rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
            <form action={unlockInternalAccess} className="grid gap-3">
              <input
                type="password"
                name="password"
                required
                className="h-10 rounded-md border border-black/[0.08] bg-white px-3 text-sm text-black outline-none focus:border-black/20"
                placeholder="访问密码"
              />
              <button
                type="submit"
                className="inline-flex h-10 items-center justify-center rounded-md bg-[#111827] px-3 text-sm font-medium text-white transition-colors hover:bg-[#0B1220]"
              >
                进入后台
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const resolvedSearchParams = await searchParams;
  const selectedMonitoringInterval = parseMonitoringInterval(
    getSearchValue(resolvedSearchParams, "monitoringInterval")
  );
  const selectedMonitoringRange = parseMonitoringRange(
    getSearchValue(resolvedSearchParams, "monitoringRange")
  );
  const selectedMonitoringStatus = parseMonitoringStatus(
    getSearchValue(resolvedSearchParams, "monitoringStatus")
  );
  const selectedMonitoringView = parseMonitoringView(
    getSearchValue(resolvedSearchParams, "monitoringView")
  );
  const data = await getInternalAdminData({
    monitoringLookbackMs: parseMonitoringRangeMs(selectedMonitoringRange),
    bypassAuth: true,
  });
  if (!data) redirect("/login");
  if (!data.authorized) redirect("/login");

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
  const modelVendorCount = new Set(
    [
      ...data.modelVendors.map((vendor) => vendor.name.trim().toLowerCase()),
      ...data.supportedModels
        .map((model) => model.provider.trim().toLowerCase())
        .filter((name) => name.length > 0 && name !== "openoctopus"),
    ]
  ).size;
  const workerTemplateCount = (data.workerTemplates ?? []).length;
  const sidebarTabs = tabs.map((tab) => ({
    ...tab,
    count:
      tab.key === "public-models"
        ? data.metrics.publicModels
        : tab.key === "providers"
          ? data.metrics.providers
          : tab.key === "model-vendors"
            ? modelVendorCount
            : tab.key === "worker-templates"
              ? workerTemplateCount
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
  const monitoringModelLabels = new Map(
    data.supportedModels.map((model) => [
      model.model_slug,
      `${model.display_name} (${model.model_slug})`,
    ])
  );
  const monitoringRequestsInRange = data.monitoringRequests;
  const monitoringHealthByModel = buildMonitoringHealthByModel(
    monitoringModelLabels,
    monitoringRequestsInRange
  );
  const monitoringSeries = buildMonitoringSeries(
    monitoringModelLabels,
    monitoringRequestsInRange.filter((request) =>
      matchesMonitoringStatus(request.status, selectedMonitoringStatus)
    ),
    selectedMonitoringInterval,
    selectedMonitoringRange
  );
  const monitoringHealthSummary = Array.from(monitoringHealthByModel.values()).reduce(
    (summary, item) => ({
      total: summary.total + item.total,
      settled: summary.settled + item.settled,
      succeeded: summary.succeeded + item.succeeded,
      failed: summary.failed + item.failed,
      cancelled: summary.cancelled + item.cancelled,
      inflight: summary.inflight + item.inflight,
    }),
    {
      total: 0,
      settled: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      inflight: 0,
    }
  );
  const monitoringSummary = {
    requestCount: monitoringSeries.reduce((sum, series) => sum + series.total, 0),
    modelCount: monitoringSeries.length,
    activeModelCount: monitoringSeries.filter((series) => series.total > 0).length,
    peakValue: monitoringSeries.reduce((peak, series) => Math.max(peak, series.peak), 0),
  };
  const monitoringSuccessRate =
    monitoringHealthSummary.settled > 0
      ? monitoringHealthSummary.succeeded / monitoringHealthSummary.settled * 100
      : 0;
  const monitoringFailureRate =
    monitoringHealthSummary.settled > 0
      ? monitoringHealthSummary.failed / monitoringHealthSummary.settled * 100
      : 0;
  const selectedMonitoringIntervalLabel =
    monitoringIntervalOptions.find((option) => option.value === selectedMonitoringInterval)?.label ??
    "按小时";
  const selectedMonitoringRangeLabel =
    monitoringRangeOptions.find((option) => option.value === selectedMonitoringRange)?.label ??
    "最近 24 小时";
  const selectedMonitoringStatusLabel =
    monitoringStatusOptions.find((option) => option.value === selectedMonitoringStatus)?.label ??
    "全部请求";
  const globalVideoInflightRequests = data.globalMonitoring.videoInflightRequests;
  const recentVideoSettledRequests = data.globalMonitoring.recentVideoRequests.filter(
    (request) => !isInflightRequestStatus(request.status)
  );
  const recentVideoFailedCount = recentVideoSettledRequests.filter(
    (request) => request.status === "failed"
  ).length;
  const recentVideoSucceededCount = recentVideoSettledRequests.filter(
    (request) => request.status === "succeeded"
  ).length;
  const imageMonitoringSummary = data.globalMonitoring.imageSummary;
  const imageRecentLogs = data.globalMonitoring.recentImageRequests.slice(0, 12);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FCFCFA] text-[#111111]">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(243, 226, 201, 0.52), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,252,250,1) 46%)",
        }}
      />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[360px] opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,24,39,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1960px] px-3 pb-10 xl:px-4">
        <section className="min-h-[calc(100vh-108px)] py-8">
          <div className="mb-6">
            <div>
              <h1 className="mt-2 text-3xl font-semibold leading-none tracking-[-0.05em] text-[#111111]">
                内部控制台
              </h1>
            </div>
          </div>

          <InternalShell activeTab={activeTab} selectedTemplateKey={selectedTemplateKey} tabs={sidebarTabs}>
          {activeTab === "public-models" ? (
            <>
              <section className="mb-6">
                <SectionShell
                id="public-models-panel"
                title="可售模型管理"
                description=" "
                headerRight={<CreateSupportedModelButton capabilityOptions={capabilityOptions} />}
                >
                <PublicModelsPanel
                  models={data.supportedModels}
                  modelVendors={data.modelVendors}
                  capabilityOptions={capabilityOptions}
                />
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "economics" ? (
            <>
              <section>
                <SectionShell
                  id="economics-panel"
                  title="模型总表管理"
                  description=" "
                  headerRight={
                    <CreateProviderModelMappingButton
                      supportedModels={data.supportedModels}
                      providers={data.providers}
                      workerTemplates={data.workerTemplates ?? []}
                    />
                  }
                >
                  <EconomicsPanel
                    supportedModels={data.supportedModels}
                    providerModels={data.providerModels}
                    providers={data.providers}
                    workerTemplates={data.workerTemplates ?? []}
                  />
                </SectionShell>
              </section>
            </>
          ) : null}

          {activeTab === "providers" ? (
            <>
              <SectionShell
                id="providers-panel"
                title="供应商管理"
                description=" "
                headerRight={<CreateProviderButton providerStatusOptions={providerStatusOptions} />}
              >
              <ProvidersPanel
                providers={data.providers}
                credentials={data.providerCredentials}
                providerStatusOptions={providerStatusOptions}
                workerTemplates={data.workerTemplates ?? []}
                providerCapabilityExecutionConfigs={data.providerCapabilityExecutionConfigs ?? []}
              />
              </SectionShell>
            </>
          ) : null}

          {activeTab === "model-vendors" ? (
            <>
              <SectionShell
                id="model-vendors-panel"
                title="模型厂商管理"
                description=" "
                headerRight={<CreateModelVendorButton />}
              >
                <ModelVendorsPanel
                  models={data.supportedModels}
                  modelVendors={data.modelVendors}
                />
              </SectionShell>
            </>
          ) : null}

          {activeTab === "routes" ? (
            <>
              <section className="mt-6">
                <SectionShell
                id="routes-panel"
                title="可售模型路由"
                description="在这里切换真实流量应该走哪个供应商模型。默认为空，需要你自己创建路由。"
                >
                <div className="mb-4 flex items-center gap-1.5 rounded-xl border border-[#D7EADB] bg-[#EDF8F0] px-3 py-2.5">
                  <CircleAlert className="size-3.5 shrink-0 text-[#335d2d]" />
                  <p className="text-xs leading-[1.35] text-[#335d2d]">
                    操作员在这里选择每个可售模型当前上线哪个供应商模型。客户侧仍然只看到 OpenOctopus 的可售型号。
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

          {activeTab === "worker-templates" ? (
            <>
              <SectionShell
                id="worker-templates-panel"
                title="API 调用格式配置"
                description=" "
              >
                <WorkerTemplatesPanel
                  workerTemplates={data.workerTemplates ?? []}
                  providerModels={data.providerModels}
                />
              </SectionShell>
            </>
          ) : null}

          {activeTab === "monitoring" ? (
            <section className="mt-6">
              <SectionShell
                id="monitoring-panel"
                title="资源调度管理监测中心"
                description="查看全系统所有模型的调用量走势，支持分钟、小时、天三种粒度，以及多个时间范围切换。"
              >
                <MonitoringAutoRefresh enabled={activeTab === "monitoring" && selectedMonitoringView === "video"} />

                <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                  {monitoringViewOptions.map((option) => (
                    <a
                      key={option.value}
                      href={buildMonitoringHref({
                        view: option.value,
                        interval: selectedMonitoringInterval,
                        range: selectedMonitoringRange,
                        status: selectedMonitoringStatus,
                      })}
                      className={`inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium transition-colors ${
                        selectedMonitoringView === option.value
                          ? "border-black bg-black text-white"
                          : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                      }`}
                    >
                      {option.label}
                    </a>
                  ))}
                </div>

                <div className="mb-4 rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                  <div className="grid gap-3 lg:grid-cols-3">
                    <div>
                      <p className="text-[11px] tracking-[0.35px] text-black/45">时间粒度</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {monitoringIntervalOptions.map((option) => (
                          <a
                            key={option.value}
                            href={buildMonitoringHref({
                              view: selectedMonitoringView,
                              interval: option.value,
                              range: selectedMonitoringRange,
                              status: selectedMonitoringStatus,
                            })}
                            className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                              selectedMonitoringInterval === option.value
                                ? "border-black bg-black text-white"
                                : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                            }`}
                          >
                            {option.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] tracking-[0.35px] text-black/45">时间范围</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {monitoringRangeOptions.map((option) => (
                          <a
                            key={option.value}
                            href={buildMonitoringHref({
                              view: selectedMonitoringView,
                              interval: selectedMonitoringInterval,
                              range: option.value,
                              status: selectedMonitoringStatus,
                            })}
                            className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                              selectedMonitoringRange === option.value
                                ? "border-black bg-black text-white"
                                : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                            }`}
                          >
                            {option.label}
                          </a>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] tracking-[0.35px] text-black/45">请求状态</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {monitoringStatusOptions.map((option) => (
                          <a
                            key={option.value}
                            href={buildMonitoringHref({
                              view: selectedMonitoringView,
                              interval: selectedMonitoringInterval,
                              range: selectedMonitoringRange,
                              status: option.value,
                            })}
                            className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors ${
                              selectedMonitoringStatus === option.value
                                ? "border-black bg-black text-white"
                                : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                            }`}
                          >
                            {option.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-6">
                  <OverviewCard
                    title="模型总数"
                    value={monitoringSummary.modelCount}
                    note="按可售模型逐张展示折线图"
                    icon={Network}
                  />
                  <OverviewCard
                    title="活跃模型"
                    value={monitoringSummary.activeModelCount}
                    note={`${selectedMonitoringRangeLabel} 内至少调用过一次`}
                    icon={Activity}
                  />
                  <OverviewCard
                    title="总调用量"
                    value={monitoringSummary.requestCount}
                    note={`${selectedMonitoringRangeLabel} · ${selectedMonitoringStatusLabel}`}
                    icon={Fingerprint}
                  />
                  <OverviewCard
                    title="单桶峰值"
                    value={monitoringSummary.peakValue}
                    note={`${selectedMonitoringIntervalLabel}`}
                    icon={Waypoints}
                  />
                  <OverviewCard
                    title="成功率"
                    value={formatPercent(monitoringSuccessRate)}
                    note={`已结算 ${monitoringHealthSummary.settled} 条`}
                    icon={ShieldCheck}
                  />
                  <OverviewCard
                    title="失败率"
                    value={formatPercent(monitoringFailureRate)}
                    note={`失败 ${monitoringHealthSummary.failed} · 取消 ${monitoringHealthSummary.cancelled}`}
                    icon={ShieldAlert}
                  />
                </div>

                {selectedMonitoringView === "overview" ? (
                  <>
                    {monitoringSeries.length > 0 ? (
                      <div className="grid gap-5">
                        {monitoringSeries.map((series) => {
                          const health = monitoringHealthByModel.get(series.modelSlug) ?? {
                            total: 0,
                            settled: 0,
                            succeeded: 0,
                            failed: 0,
                            cancelled: 0,
                            inflight: 0,
                          };
                          const successRate =
                            health.settled > 0 ? (health.succeeded / health.settled) * 100 : 0;
                          const failureRate =
                            health.settled > 0 ? (health.failed / health.settled) * 100 : 0;

                          return (
                            <MonitoringChartCard
                              key={series.modelSlug}
                              title={series.title}
                              points={series.points}
                              labels={series.labels}
                              total={series.total}
                              peak={series.peak}
                              intervalLabel={selectedMonitoringIntervalLabel.replace("按", "")}
                              successRate={formatPercent(successRate)}
                              failureRate={formatPercent(failureRate)}
                              settledCount={health.settled}
                              inflightCount={health.inflight}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <EmptyState
                        title="还没有模型监控数据"
                        detail="先创建可售模型，或者等待网关产生新的 inference_requests。这里会按模型自动生成对应的调用折线图。"
                      />
                    )}
                  </>
                ) : null}

                {selectedMonitoringView === "video" ? (
                  <>
                    <div className="mb-5 grid gap-3 md:grid-cols-3">
                      <OverviewCard
                        title="进行中视频任务"
                        value={globalVideoInflightRequests.length}
                        note="全系统当前 queued / processing 的视频请求"
                        icon={Activity}
                      />
                      <OverviewCard
                        title="近期成功视频"
                        value={recentVideoSucceededCount}
                        note="最近抓取到的已结算视频任务"
                        icon={ShieldCheck}
                      />
                      <OverviewCard
                        title="近期失败视频"
                        value={recentVideoFailedCount}
                        note="用于排查上游 provider 错误"
                        icon={ShieldAlert}
                      />
                    </div>

                    <section className="mb-6 rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-5 shadow-sm">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-black">全局视频任务实时监控</p>
                          <p className="mt-1 text-xs leading-5 text-black/50">
                            这里只盯全系统“正在发生中的”视频任务，展示 task id、workspace、最近一次 provider attempt 和上游 task id。
                          </p>
                        </div>
                        <div className="rounded-md border border-black/[0.08] bg-white px-3 py-2 text-[11px] text-black/55">
                          30 秒自动刷新
                        </div>
                      </div>

                      {globalVideoInflightRequests.length > 0 ? (
                        <div className="grid gap-3">
                          {globalVideoInflightRequests.map((request) => (
                            <VideoTaskMonitoringCard key={request.id} request={request} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="当前没有进行中的视频任务"
                          detail="新的全局 video_generation 请求进入 queued / processing 后会自动出现在这里。"
                        />
                      )}
                    </section>

                    <section className="mb-6 rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-sm font-medium text-black">最近完成的视频任务日志</p>
                        <p className="mt-1 text-xs leading-5 text-black/50">
                          用于确认新部署后的 polling 是否能把视频任务正确推进到最终成功或最终失败。
                        </p>
                      </div>

                      {recentVideoSettledRequests.length > 0 ? (
                        <div className="grid gap-3">
                          {recentVideoSettledRequests.slice(0, 10).map((request) => (
                            <VideoTaskMonitoringCard key={request.id} request={request} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="最近还没有已结算的视频任务"
                          detail="新的视频任务完成后，会在这里保留成功或失败日志。"
                        />
                      )}
                    </section>
                  </>
                ) : null}

                {selectedMonitoringView === "image" ? (
                  <>
                    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <OverviewCard
                        title="图片总量"
                        value={imageMonitoringSummary.total}
                        note="最近抓取窗口内图片请求总数"
                        icon={Fingerprint}
                      />
                      <OverviewCard
                        title="图片进行中"
                        value={imageMonitoringSummary.inflight}
                        note="queued / processing"
                        icon={Activity}
                      />
                      <OverviewCard
                        title="图片成功"
                        value={imageMonitoringSummary.succeeded}
                        note="最近抓取窗口内 succeeded"
                        icon={ShieldCheck}
                      />
                      <OverviewCard
                        title="图片失败"
                        value={imageMonitoringSummary.failed}
                        note="最近抓取窗口内 failed"
                        icon={ShieldAlert}
                      />
                    </div>

                    <section className="mb-6 rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-5 shadow-sm">
                      <div className="mb-4">
                        <p className="text-sm font-medium text-black">图片任务汇总与整体日志</p>
                        <p className="mt-1 text-xs leading-5 text-black/50">
                          图片任务不做逐任务实时盯盘，只保留总量、状态拆分和最近整体状态日志。
                        </p>
                      </div>

                      {imageRecentLogs.length > 0 ? (
                        <div className="grid gap-2">
                          {imageRecentLogs.map((request) => (
                            <ImageTaskLogRow key={request.id} request={request} />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="最近没有图片任务日志"
                          detail="当前窗口内还没有 image_generation 或 image_edit 请求。"
                        />
                      )}
                    </section>
                  </>
                ) : null}

              </SectionShell>
            </section>
          ) : null}

          {activeTab === "requests" ? (
            <section className="mt-6">
              <SectionShell
                id="requests-panel"
                title="用户请求记录"
                description=" "
              >
                <div className="mb-4 grid gap-3 rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
                    <p className="text-[11px] tracking-[0.35px] text-black/45">客户</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={buildRequestsFilterHref({
                          customer: "all",
                          key: selectedRequestKey,
                        })}
                        className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                          selectedRequestCustomer === "all"
                            ? "border-black bg-black text-white"
                            : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                        }`}
                      >
                        全部客户
                      </a>
                      {data.requestFilters.customers.map((customer) => (
                        <a
                          key={customer.slug}
                          href={buildRequestsFilterHref({
                            customer: customer.slug,
                            key: selectedRequestKey,
                          })}
                          className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                            selectedRequestCustomer === customer.slug
                              ? "border-black bg-black text-white"
                              : "border-black/10 bg-white text-black/72 hover:bg-black/[0.03]"
                          }`}
                        >
                          {customer.name}
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
                    <p className="text-[11px] tracking-[0.35px] text-black/45">API Key 筛选</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a
                        href={buildRequestsFilterHref({
                          customer: selectedRequestCustomer,
                          key: "all",
                        })}
                        className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
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
                          className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
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

                  <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
                    <p className="text-[11px] tracking-[0.35px] text-black/45">当前选择</p>
                    <p className="mt-2 text-sm font-medium text-black">
                      {selectedRequestKeyRecord ? selectedRequestKeyRecord.name : "全部 Key"}
                    </p>
                    <p className="mt-1 text-xs text-black/45">
                      {selectedRequestKeyRecord
                        ? `${selectedRequestKeyRecord.keyPrefix} · ${selectedRequestKeyRecord.environment}`
                        : selectedRequestCustomer === "all"
                          ? "全局 · 全部请求记录"
                          : `${selectedRequestCustomer} · 全部请求记录`}
                    </p>
                  </div>
                </div>

                {selectedRequestKeyRecord ? (
                  selectedRequestKeyRecord.workspaceId === data.workspace.id ? (
                    <RequestRecordsClearForm
                      action={clearApiKeyRequestRecords}
                      apiKeyId={selectedRequestKeyRecord.id}
                      apiKeyName={selectedRequestKeyRecord.name}
                    />
                  ) : null
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
                        className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex h-6 items-center rounded-md border border-[#E9E1CF] bg-[#F6F1E7] px-2 text-[11px] text-[#6F5B27]">
                                  {request.status}
                                </span>
                                <span className="inline-flex h-6 items-center rounded-md border border-[#D8E4F8] bg-[#F3F7FF] px-2 text-[11px] text-[#355FB4]">
                                  {request.capability}
                                </span>
                                <span className="inline-flex h-6 items-center rounded-md border border-black/[0.08] bg-white px-2 text-[11px] text-black/55">
                                  {request.createdLabel}
                                </span>
                              </div>
                              <p className="mt-2 truncate text-sm font-medium text-black">{request.public_model_slug}</p>
                              <p className="mt-1 text-xs text-black/50">
                                上游：{request.providerName} / {request.upstreamModelSlug}
                              </p>
                              <p className="mt-1 text-xs text-black/45">
                                调用方：{request.customerName} · {request.apiKeyName} · {request.apiKeyPrefix}
                              </p>
                            </div>
                            <div className="rounded-xl border border-black/[0.06] bg-white px-3 py-2 text-xs text-black/55">
                              请求 ID：{request.id}
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-3">
                            <RequestMetricCard label="客户收费" value={request.customerChargeLabel} />
                            <RequestMetricCard label="供应商成本" value={request.providerCostLabel} />
                            <RequestMetricCard label="利润" value={request.profitLabel} />
                          </div>
                        </div>

                        <details className="mt-4 group rounded-xl border border-black/[0.06] bg-white">
                          <summary className="cursor-pointer list-none px-3 py-2.5 text-sm text-black/70">
                            <span className="inline-flex items-center gap-2">
                              <span className="text-black/50 group-open:hidden">展开明细</span>
                              <span className="hidden text-black/50 group-open:inline">收起明细</span>
                              <span className="text-black/40">·</span>
                              <span>完成时间：{request.completedLabel}</span>
                              <span className="text-black/40">·</span>
                              <span>尝试次数：{request.attemptCount}</span>
                              <span className="text-black/40">·</span>
                              <span>
                                最后延迟：
                                {request.lastAttempt
                                  ? ` ${request.lastAttempt.latency_ms ?? "等待中"} ms`
                                  : " 无尝试"}
                              </span>
                            </span>
                          </summary>

                          <div className="border-t border-black/[0.06] px-3 py-3">
                            {request.lastAttempt ? (
                              <div className="mb-3 rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5 text-xs">
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

                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                              <RequestBreakdownSection
                                title="使用量指标"
                                items={request.usageBreakdown}
                                emptyLabel="没有记录到使用量指标"
                              />
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
                        </details>
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
                title="配置变更历史"
                description=" "
              >
                {hasAudit ? (
                  <div className="space-y-3">
                    {data.auditLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4 shadow-sm"
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

                        <div className="mt-4 rounded-xl border border-black/[0.06] bg-white p-3 text-xs text-black/58">
                          <pre className="overflow-x-auto whitespace-pre-wrap">{log.detailsText}</pre>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="还没有配置变更记录"
                    detail="当你在内部后台创建或修改供应商、供应商密钥、模型、路由规则后，这里会开始沉淀完整的配置变更历史。"
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
