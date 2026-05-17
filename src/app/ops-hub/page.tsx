import { redirect } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { getInternalAdminData } from "@/lib/internal-admin-server";
import { getApiSmokeRecords } from "@/lib/api-smoke-records";
import { getInternalAdminUser } from "@/lib/internal-access";
import { addUserBalance, deleteRegisteredUser } from "./actions";
import { InternalShell } from "./internal-shell";
import { MonitoringAutoRefresh } from "./monitoring-auto-refresh";
import { MonitoringLineChart } from "./monitoring-line-chart";
import { ImageResponseContractPanel } from "./image-response-contract-panel";
import { RegisteredUsersTable } from "./registered-users-table";
import { ApiSmokePanel } from "./api-smoke-panel";
import {
  CreateProviderButton,
  GatewayErrorDefinitionsPanel,
  CreateModelVendorButton,
  CreateSupportedModelButton,
  ModelVendorsPanel,
  InternalModelAiUsageLogsPanel,
  ProvidersPanel,
  PublicModelsPanel,
  WorkerTemplatesPanel,
} from "./internal-management-panels";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const tabs = [
  {
    key: "monitoring-overview",
    group: "overview",
    label: "系统用量总览",
    description: "模型调用趋势与成功率概览。",
  },
  {
    key: "monitoring-problems",
    group: "overview",
    label: "异常请求快查",
    description: "后端分页查看 failed / queued 请求。",
  },
  {
    key: "monitoring-requests",
    group: "overview",
    label: "用户管理",
    description: "注册用户、余额与后台加款。",
  },
  {
    key: "internal-model-ai-usage-logs",
    group: "overview",
    label: "内部 AI 消费记录",
    description: "记录 URL 自动填充能力的调用、token 与估算成本。",
  },
  {
    key: "api-smoke",
    group: "overview",
    label: "API 连通性",
    description: "查看客户 API smoke 脚本的最近运行记录。",
  },
  {
    key: "worker-templates",
    group: "static",
    label: "API 调用格式配置",
    description: "管理供应商模型调用格式模板。",
  },
  {
    key: "image-response-contracts",
    group: "static",
    label: "图片返回结构约定",
    description: "维护 Playground 与 API 两套图片返回结构约定。",
  },
  {
    key: "gateway-error-definitions",
    group: "static",
    label: "统一错误码",
    description: "维护所有对外 API 异常的错误码与用户提示文案。",
  },
  {
    key: "providers",
    group: "dynamic",
    label: "供应商管理",
    description: "同页管理上游厂商与供应商密钥。",
  },
  {
    key: "model-vendors",
    group: "dynamic",
    label: "模型厂商管理",
    description: "维护可售模型里的模型厂商名称列表。",
  },
  {
    key: "public-models",
    group: "dynamic",
    label: "可售模型管理",
    description: "定义用户可售模型、供应商供应模型列表与价格联动。",
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
  if (value === "monitoring") {
    return "monitoring-overview";
  }
  return tabs.some((item) => item.key === value) ? (value as InternalTabKey) : "public-models";
}

function buildRequestsFilterHref(input: {
  scope?: string;
  page?: number;
  monitoringView: MonitoringView;
  monitoringInterval: MonitoringInterval;
  monitoringRange: MonitoringRange;
  monitoringStatus: MonitoringStatus;
}) {
  const params = new URLSearchParams();
  const tab =
    input.monitoringView === "video"
      ? "monitoring-video"
      : input.monitoringView === "image"
        ? "monitoring-image"
        : input.monitoringView === "requests"
          ? "monitoring-requests"
          : "monitoring-overview";
  params.set("tab", tab);
  params.set("monitoringView", input.monitoringView);
  params.set("monitoringInterval", input.monitoringInterval);
  params.set("monitoringRange", input.monitoringRange);
  params.set("monitoringStatus", input.monitoringStatus);
  if (input.scope && input.scope !== "all") {
    params.set("requestScope", input.scope);
  }
  if ((input.page ?? 1) > 1) {
    params.set("requestPage", String(input.page));
  }
  return `/ops-hub?${params.toString()}`;
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
  { value: "requests", label: "用户请求记录" },
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
  model?: string | null;
  problemRequestPage?: number;
}) {
  const params = new URLSearchParams();
  const tab =
    input.view === "video"
      ? "monitoring-video"
      : input.view === "image"
        ? "monitoring-image"
        : input.view === "requests"
          ? "monitoring-requests"
          : "monitoring-overview";
  params.set("tab", tab);
  params.set("monitoringView", input.view);
  params.set("monitoringInterval", input.interval);
  params.set("monitoringRange", input.range);
  params.set("monitoringStatus", input.status);
  if (input.model && input.model !== "all") {
    params.set("monitoringModel", input.model);
  }
  if (input.problemRequestPage && input.problemRequestPage > 1) {
    params.set("problemRequestPage", String(input.problemRequestPage));
  }
  return `/ops-hub?${params.toString()}`;
}

function readMonitoringCount(request: { count?: number }) {
  return Number.isFinite(request.count) && typeof request.count === "number"
    ? Math.max(0, request.count)
    : 1;
}

function buildMonitoringSeries(
  modelLabels: Map<string, string>,
  requests: Array<{ public_model_slug: string; created_at: string; status: string; count?: number }>,
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
    currentSeries[bucketIndex] += readMonitoringCount(request);
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
  requests: Array<{ public_model_slug: string; status: string; count?: number }>
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
    const count = readMonitoringCount(request);
    const current = statsMap.get(request.public_model_slug) ?? {
      total: 0,
      settled: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
      inflight: 0,
    };

    current.total += count;

    if (request.status === "succeeded") {
      current.succeeded += count;
      current.settled += count;
    } else if (request.status === "failed") {
      current.failed += count;
      current.settled += count;
    } else if (request.status === "cancelled") {
      current.cancelled += count;
      current.settled += count;
    } else {
      current.inflight += count;
    }

    statsMap.set(request.public_model_slug, current);
  }

  return statsMap;
}

function OverviewCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string | number;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] px-3 py-2.5 shadow-sm">
      <div className="min-w-0">
        <p className="text-[11px] tracking-[0.35px] text-black/60">{title}</p>
        <p className="text-lg font-medium tracking-tight text-black">{value}</p>
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
            <span>峰值 {maxValue}</span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-black/45">
        <span>已结算 {settledCount}</span>
        <span>进行中 {inflightCount}</span>
      </div>

      <div className="mt-4 rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3">
        <MonitoringLineChart title={title} points={points} labels={labels} />
      </div>
    </div>
  );
}

function UnifiedTaskCard({
  request,
  showFinancial = false,
}: {
  request: {
    id: string;
    capability: string;
    modelSlug: string;
    status: string;
    createdAt?: string;
    createdLabel: string;
    startedLabel?: string;
    completedLabel?: string;
    workspaceName?: string;
    workspaceSlug?: string;
    providerLabel?: string;
    callerLabel?: string;
    errorMessage?: string | null;
    lastAttempt?: {
      attemptNo: number;
      status: string;
      upstreamTaskId?: string | null;
      latencyMs?: number | null;
      errorMessage?: string | null;
      updatedLabel?: string;
    } | null;
    upstreamRawText?: string | null;
    packagedOutputText?: string | null;
    customerChargeLabel?: string;
    providerCostLabel?: string;
    profitLabel?: string;
  };
  showFinancial?: boolean;
}) {
  const inflight = isInflightRequestStatus(request.status);
  const elapsedLabel =
    inflight && request.createdAt
      ? formatElapsedDuration(request.createdAt)
      : request.completedLabel ?? "等待中";
  const attempt = request.lastAttempt ?? null;
  const startedDisplayLabel =
    request.startedLabel ?? (request.status === "failed" ? "未开始（提交失败）" : "等待中");

  return (
    <article className="rounded-xl border border-black/[0.08] bg-white px-3 py-3">
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
              {request.capability}
            </span>
            <span className="inline-flex h-6 items-center rounded-md border border-black/[0.08] bg-white px-2 text-[11px] text-black/55">
              {request.createdLabel}
            </span>
          </div>
          <p className="mt-1 break-all text-sm font-medium text-black">{request.modelSlug}</p>
          {request.providerLabel ? (
            <p className="mt-0.5 break-all text-xs text-black/50">{request.providerLabel}</p>
          ) : null}
          {request.callerLabel ? (
            <p className="mt-0.5 text-xs text-black/45">{request.callerLabel}</p>
          ) : null}
          {!request.callerLabel && request.workspaceName ? (
            <p className="mt-0.5 text-xs text-black/45">
              {request.workspaceName} · {request.workspaceSlug}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-black/45">
            创建时间：{request.createdLabel}
            <span className="px-1.5 text-black/30">·</span>
            已运行：{elapsedLabel}
            <span className="px-1.5 text-black/30">·</span>
            开始处理：{startedDisplayLabel}
            <span className="px-1.5 text-black/30">·</span>
            最后尝试：{attempt ? `#${attempt.attemptNo} · ${attempt.status}` : "无尝试"}
          </p>
          {request.status === "failed" && (request.errorMessage || attempt?.errorMessage) ? (
            <p className="mt-1 line-clamp-2 break-all text-xs leading-5 text-[#b54432]">
              {request.errorMessage ?? attempt?.errorMessage}
            </p>
          ) : null}
        </div>

        <div className="rounded-md border border-black/[0.06] bg-[#FCFCFA] px-2.5 py-1.5 text-[11px] text-black/55">
          <span className="font-medium text-black/60">请求 ID：</span>
          <span className="font-mono">{request.id}</span>
        </div>
      </div>

      {showFinancial ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="text-black/60">
            客户收费 <span className="font-semibold text-black">{request.customerChargeLabel}</span>
          </span>
          <span className="text-black/60">
            供应商成本 <span className="font-semibold text-black">{request.providerCostLabel}</span>
          </span>
          <span className="text-black/60">
            利润 <span className="font-semibold text-black">{request.profitLabel}</span>
          </span>
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5">
          {attempt ? (
            <div className="mt-3 rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-black/58">最后一次尝试 #{attempt.attemptNo}</span>
                <span className="text-black/50">{attempt.updatedLabel ?? "等待中"}</span>
              </div>
              <p className="mt-2 break-all font-mono text-[11px] text-black/45">
                {attempt.upstreamTaskId ?? "尚无 upstream task id"}
              </p>
              {request.errorMessage || attempt.errorMessage ? (
                <div className="mt-2 rounded-md border border-[#F4C9C4] bg-[#FDF0EE] px-2.5 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.5px] text-[#B54432]">
                    上游原始错误
                  </p>
                  <pre className="mt-1 max-h-44 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-[#B54432]">
                    {request.errorMessage ?? attempt.errorMessage}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <details className="rounded-lg border border-black/[0.06] bg-white px-3 py-2">
              <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.5px] text-black/55">
                上游完整返回
              </summary>
              <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-black/75">
                {request.upstreamRawText ?? "null"}
              </pre>
            </details>
            <details className="rounded-lg border border-black/[0.06] bg-white px-3 py-2">
              <summary className="cursor-pointer list-none text-[11px] font-medium uppercase tracking-[0.5px] text-black/55">
                对客返回 JSON
              </summary>
              <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-black/75">
                {request.packagedOutputText ?? "null"}
              </pre>
            </details>
          </div>
      </div>
    </article>
  );
}

export default async function InternalPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const internalAdminUser = await getInternalAdminUser();

  if (!internalAdminUser) {
    redirect("/login?next=/ops-hub");
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
  const requestedMonitoringView = parseMonitoringView(
    getSearchValue(resolvedSearchParams, "monitoringView")
  );
  const requestedMonitoringModel = getSearchValue(resolvedSearchParams, "monitoringModel") ?? "";
  const activeTab = getTabValue(getSearchValue(resolvedSearchParams, "tab"));
  const effectiveMonitoringView: MonitoringView =
    activeTab === "monitoring-requests"
          ? "requests"
          : activeTab === "monitoring-overview" || activeTab === "monitoring-problems"
            ? "overview"
            : requestedMonitoringView;
  const selectedRequestScope = getSearchValue(resolvedSearchParams, "requestScope") ?? "all";
  const selectedRequestKey = selectedRequestScope.startsWith("k:")
    ? selectedRequestScope.slice(2)
    : "all";
  const selectedRequestPageRaw = Number(getSearchValue(resolvedSearchParams, "requestPage") ?? "1");
  const selectedRequestPage = Number.isFinite(selectedRequestPageRaw) && selectedRequestPageRaw >= 1
    ? Math.floor(selectedRequestPageRaw)
    : 1;
  const selectedProblemRequestPageRaw = Number(getSearchValue(resolvedSearchParams, "problemRequestPage") ?? "1");
  const selectedProblemRequestPage =
    Number.isFinite(selectedProblemRequestPageRaw) && selectedProblemRequestPageRaw >= 1
      ? Math.floor(selectedProblemRequestPageRaw)
      : 1;
  const selectedUserPageRaw = Number(getSearchValue(resolvedSearchParams, "userPage") ?? "1");
  const selectedUserPage = Number.isFinite(selectedUserPageRaw) && selectedUserPageRaw >= 1
    ? Math.floor(selectedUserPageRaw)
    : 1;
  const selectedUserSearch = getSearchValue(resolvedSearchParams, "userSearch") ?? "";
  const selectedModelPageRaw = Number(getSearchValue(resolvedSearchParams, "modelPage") ?? "1");
  const selectedModelPage = Number.isFinite(selectedModelPageRaw) && selectedModelPageRaw >= 1
    ? Math.floor(selectedModelPageRaw)
    : 1;
  const selectedModelType = getSearchValue(resolvedSearchParams, "modelType") ?? "all";
  const selectedModelStatusRaw = getSearchValue(resolvedSearchParams, "modelStatus") ?? "all";
  const selectedModelStatus =
    selectedModelStatusRaw === "active" || selectedModelStatusRaw === "inactive"
      ? selectedModelStatusRaw
      : "all";
  const selectedInternalAiUsagePageRaw = Number(getSearchValue(resolvedSearchParams, "aiUsagePage") ?? "1");
  const selectedInternalAiUsagePage =
    Number.isFinite(selectedInternalAiUsagePageRaw) && selectedInternalAiUsagePageRaw >= 1
      ? Math.floor(selectedInternalAiUsagePageRaw)
      : 1;
  const data = await getInternalAdminData({
    monitoringLookbackMs: parseMonitoringRangeMs(selectedMonitoringRange),
    monitoringStatus: selectedMonitoringStatus,
    monitoringModelSlug: requestedMonitoringModel,
    monitoringView: effectiveMonitoringView,
    requestScope: selectedRequestScope,
    requestPage: selectedRequestPage,
    requestPageSize: 20,
    problemRequestPage: selectedProblemRequestPage,
    problemRequestPageSize: 10,
    userPage: selectedUserPage,
    userPageSize: 10,
    userSearch: selectedUserSearch,
    modelPage: selectedModelPage,
    modelPageSize: 10,
    modelTypeFilter: selectedModelType,
    modelStatusFilter: selectedModelStatus,
    internalAiUsagePage: selectedInternalAiUsagePage,
    internalAiUsagePageSize: 10,
    activeTab,
  });
  if (!data) redirect("/login?next=/ops-hub");
  if (!data.authorized) redirect("/login?next=/ops-hub");
  const apiSmokeRecords = activeTab === "api-smoke" ? await getApiSmokeRecords(100) : [];

  const selectedTemplateKey = getSearchValue(resolvedSearchParams, "template");
  const filteredRequests = data.requests;
  const requestScopeOptions = [
    { value: "all", label: "全部用户 / 全部 Key" },
    ...data.requestFilters.customers.map((customer) => ({
      value: `u:${customer.id}`,
      label: `${customer.name} / 全部 Key`,
    })),
    ...data.requestFilters.apiKeys.map((item) => ({
      value: `k:${item.id}`,
      label: `${item.ownerName ?? "未标识调用方"} / ${item.name}`,
    })),
  ];
  const requestSummary = {
    customerCharge: filteredRequests.reduce((sum, request) => sum + request.customerCharge, 0),
    providerCost: filteredRequests.reduce((sum, request) => sum + request.providerCost, 0),
    profit: filteredRequests.reduce((sum, request) => sum + request.profit, 0),
    requestCount: filteredRequests.length,
  };
  const hasFilteredRequests = filteredRequests.length > 0;
  const requestTotalPages = data.requestPagination.totalPages;
  const requestCurrentPage = data.requestPagination.page;
  const pagedRequests = filteredRequests;
  const hasPagedRequests = pagedRequests.length > 0;
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
  const selectedMonitoringSeries =
    monitoringSeries.find((series) => series.modelSlug === requestedMonitoringModel) ??
    monitoringSeries[0] ??
    null;
  const selectedMonitoringModel = selectedMonitoringSeries?.modelSlug ?? "";
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
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#FCFCFA] text-[#111111]">
      <header className="fixed left-0 right-0 top-0 z-50 w-full border-b border-black/[0.06] bg-[#FCFCFA]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-[1960px] items-center px-3 xl:px-4">
          <div className="relative flex w-full items-center text-sm md:text-base">
            <Link
              href="/"
              className="-ml-2 rounded-md px-2 py-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
            >
              <Logo className="text-[#111827]" />
            </Link>
            <span className="ml-3 inline-flex items-center rounded-md border border-black/[0.08] bg-white px-2.5 py-1 text-[12px] font-medium text-black/65">
              内部控制台
            </span>
          </div>
        </div>
      </header>
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

      <div className="relative mx-auto w-full max-w-[1960px] px-3 pb-10 pt-[72px] xl:px-4">
        <section className="min-h-[calc(100vh-108px)] py-4">
          <InternalShell activeTab={activeTab} selectedTemplateKey={selectedTemplateKey} tabs={tabs}>
          {activeTab === "public-models" ? (
            <>
              <section className="mb-6">
                <SectionShell
                id="public-models-panel"
                title="可售模型管理"
                description=" "
                headerRight={
                  <div className="flex items-center gap-2">
                    <CreateSupportedModelButton
                      capabilityOptions={capabilityOptions}
                      modelVendors={data.modelVendors}
                      models={data.supportedModels}
                    />
                  </div>
                }
                >
                <PublicModelsPanel
                  models={data.supportedModels}
                  modelPagination={data.supportedModelPagination}
                  modelTypeFilter={selectedModelType}
                  modelStatusFilter={selectedModelStatus}
                  providerModels={data.providerModels}
                  routingRules={data.routingRules}
                  providers={data.providers}
                  workerTemplates={data.workerTemplates ?? []}
                  modelVendors={data.modelVendors}
                  capabilityOptions={capabilityOptions}
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

          {activeTab === "image-response-contracts" ? (
            <>
              <SectionShell
                id="image-response-contracts-panel"
                title="图片返回结构约定"
                description="维护 internal Playground 与对外 API 的图片返回结构契约。"
              >
                <ImageResponseContractPanel />
              </SectionShell>
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

          {activeTab === "gateway-error-definitions" ? (
            <>
              <SectionShell
                id="gateway-error-definitions-panel"
                title="统一错误码"
                description="维护所有对外请求失败时返回的错误码、HTTP 状态码、用户文案与可重试标记。"
              >
                <GatewayErrorDefinitionsPanel definitions={data.gatewayErrorDefinitions} />
              </SectionShell>
            </>
          ) : null}

          {activeTab === "internal-model-ai-usage-logs" ? (
            <section>
              <SectionShell
                id="internal-model-ai-usage-logs-panel"
                title="内部 AI 消费记录"
                description="仅 internal 使用：记录文档 URL 自动解析的调用轨迹、token 与估算成本。"
              >
                <InternalModelAiUsageLogsPanel
                  logs={data.internalModelAiUsageLogs}
                  pagination={data.internalModelAiUsageLogPagination}
                />
              </SectionShell>
            </section>
          ) : null}

          {activeTab === "api-smoke" ? (
            <section>
              <SectionShell
                id="api-smoke-panel"
                title="API 连通性"
                description=""
              >
                <ApiSmokePanel records={apiSmokeRecords} />
              </SectionShell>
            </section>
          ) : null}

          {activeTab === "monitoring-overview" ||
          activeTab === "monitoring-problems" ||
          activeTab === "monitoring-requests" ? (
            <section>
              <SectionShell
                id="monitoring-panel"
                title=""
                description=""
              >
                <MonitoringAutoRefresh enabled={false} />

                {activeTab === "monitoring-overview" ? (
                  <>
                    <div className="mb-4 rounded-2xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                      <div className="grid gap-3 lg:grid-cols-4">
                        <div>
                          <p className="text-[11px] tracking-[0.35px] text-black/45">时间粒度</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {monitoringIntervalOptions.map((option) => (
                              <a
                                key={option.value}
                                href={buildMonitoringHref({
                                  view: effectiveMonitoringView,
                                  interval: option.value,
                                  range: selectedMonitoringRange,
                                  status: selectedMonitoringStatus,
                                  model: selectedMonitoringModel,
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
                                  view: effectiveMonitoringView,
                                  interval: selectedMonitoringInterval,
                                  range: option.value,
                                  status: selectedMonitoringStatus,
                                  model: selectedMonitoringModel,
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
                                  view: effectiveMonitoringView,
                                  interval: selectedMonitoringInterval,
                                  range: selectedMonitoringRange,
                                  status: option.value,
                                  model: selectedMonitoringModel,
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

                        <div>
                          <p className="text-[11px] tracking-[0.35px] text-black/45">模型</p>
                          <form action="/ops-hub" className="mt-2 flex gap-1.5">
                            <input type="hidden" name="tab" value={activeTab} />
                            <input type="hidden" name="monitoringView" value={effectiveMonitoringView} />
                            <input type="hidden" name="monitoringInterval" value={selectedMonitoringInterval} />
                            <input type="hidden" name="monitoringRange" value={selectedMonitoringRange} />
                            <input type="hidden" name="monitoringStatus" value={selectedMonitoringStatus} />
                            <select
                              name="monitoringModel"
                              disabled={monitoringSeries.length === 0}
                              defaultValue={selectedMonitoringModel}
                              className="h-8 w-full rounded-md border border-black/10 bg-white px-2.5 text-[11px] font-medium text-black/72 outline-none"
                            >
                              {monitoringSeries.map((series) => (
                                <option key={series.modelSlug} value={series.modelSlug}>
                                  {series.title}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              disabled={monitoringSeries.length === 0}
                              className="h-8 shrink-0 rounded-md border border-black/10 bg-white px-2.5 text-[11px] font-medium text-black/72 hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:text-black/35"
                            >
                              应用
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>

                    <div className="mb-5 grid gap-3 md:grid-cols-6">
                      <OverviewCard
                        title="模型总数"
                        value={monitoringSummary.modelCount}
                        note="通过模型筛选查看单张折线图"
                      />
                      <OverviewCard
                        title="活跃模型"
                        value={monitoringSummary.activeModelCount}
                        note={`${selectedMonitoringRangeLabel} 内至少调用过一次`}
                      />
                      <OverviewCard
                        title="总调用量"
                        value={monitoringSummary.requestCount}
                        note={`${selectedMonitoringRangeLabel} · ${selectedMonitoringStatusLabel}`}
                      />
                      <OverviewCard
                        title="单桶峰值"
                        value={monitoringSummary.peakValue}
                        note={`${selectedMonitoringIntervalLabel}`}
                      />
                      <OverviewCard
                        title="成功率"
                        value={formatPercent(monitoringSuccessRate)}
                        note={`已结算 ${monitoringHealthSummary.settled} 条`}
                      />
                      <OverviewCard
                        title="失败率"
                        value={formatPercent(monitoringFailureRate)}
                        note={`失败 ${monitoringHealthSummary.failed} · 取消 ${monitoringHealthSummary.cancelled}`}
                      />
                    </div>
                  </>
                ) : null}

                {activeTab === "monitoring-overview" ? (
                  <>
                    {selectedMonitoringSeries ? (
                      <div className="grid gap-5">
                        {(() => {
                          const series = selectedMonitoringSeries;
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
                        })()}
                      </div>
                    ) : (
                      <EmptyState
                        title="还没有模型监控数据"
                        detail="先创建可售模型，或者等待网关产生新的 inference_requests。这里会按模型筛选展示单张调用折线图。"
                      />
                    )}

                  </>
                ) : null}

                {activeTab === "monitoring-problems" ? (
                  <div className="rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-black">异常请求快查</p>
                          <p className="mt-0.5 text-xs text-black/50">
                            只拉取 failed / queued，后端分页每页 10 条，用于快速定位超时和失败请求。
                          </p>
                        </div>
                        <p className="text-xs text-black/45">
                          共 {data.problemRequestPagination.totalCount} 条
                        </p>
                      </div>

                      {data.problemRequests.length > 0 ? (
                        <div className="grid gap-3">
                          {data.problemRequests.map((request) => (
                            <UnifiedTaskCard
                              key={request.id}
                              showFinancial
                              request={{
                                id: request.id,
                                capability: request.capability,
                                modelSlug: request.public_model_slug,
                                status: request.status,
                                createdAt: request.created_at,
                                createdLabel: request.createdLabel,
                                startedLabel: request.startedLabel,
                                completedLabel: request.completedLabel,
                                providerLabel: `上游：${request.providerName} / ${request.upstreamModelSlug}`,
                                callerLabel: `调用方：${request.actorName} · ${request.apiKeyName} · ${request.apiKeyPrefix} · ${request.sourceLabel}`,
                                errorMessage: request.error_message,
                                lastAttempt: request.lastAttempt,
                                upstreamRawText: request.upstreamRawText,
                                packagedOutputText: request.packagedOutputText,
                                customerChargeLabel: request.customerChargeLabel,
                                providerCostLabel: request.providerCostLabel,
                                profitLabel: request.profitLabel,
                              }}
                            />
                          ))}
                        </div>
                      ) : (
                        <EmptyState
                          title="没有 failed / queued 请求"
                          detail="当前没有需要优先排查的问题请求。"
                        />
                      )}

                      {data.problemRequestPagination.totalPages > 1 ? (
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-black/55">
                          <span>
                            第 {data.problemRequestPagination.page} / {data.problemRequestPagination.totalPages} 页
                          </span>
                          <div className="flex gap-2">
                            <a
                              aria-disabled={data.problemRequestPagination.page <= 1}
                              href={buildMonitoringHref({
                                view: "overview",
                                interval: selectedMonitoringInterval,
                                range: selectedMonitoringRange,
                                status: selectedMonitoringStatus,
                                model: selectedMonitoringModel,
                                problemRequestPage: Math.max(1, data.problemRequestPagination.page - 1),
                              })}
                              className={`rounded-md border border-black/10 px-3 py-1.5 ${
                                data.problemRequestPagination.page <= 1
                                  ? "pointer-events-none text-black/25"
                                  : "bg-white text-black/65 hover:bg-black/[0.03]"
                              }`}
                            >
                              上一页
                            </a>
                            <a
                              aria-disabled={data.problemRequestPagination.page >= data.problemRequestPagination.totalPages}
                              href={buildMonitoringHref({
                                view: "overview",
                                interval: selectedMonitoringInterval,
                                range: selectedMonitoringRange,
                                status: selectedMonitoringStatus,
                                model: selectedMonitoringModel,
                                problemRequestPage: Math.min(
                                  data.problemRequestPagination.totalPages,
                                  data.problemRequestPagination.page + 1
                                ),
                              })}
                              className={`rounded-md border border-black/10 px-3 py-1.5 ${
                                data.problemRequestPagination.page >= data.problemRequestPagination.totalPages
                                  ? "pointer-events-none text-black/25"
                                  : "bg-white text-black/65 hover:bg-black/[0.03]"
                              }`}
                            >
                              下一页
                            </a>
                          </div>
                        </div>
                          ) : null}
                    </div>
                ) : null}

                {effectiveMonitoringView === "requests" ? (
                  <RegisteredUsersTable
                    users={data.registeredUsers}
                    userPagination={data.registeredUserPagination}
                    userSearch={selectedUserSearch}
                    addUserBalanceAction={addUserBalance}
                    deleteRegisteredUserAction={deleteRegisteredUser}
                  />
                ) : null}

              </SectionShell>
            </section>
          ) : null}

          </InternalShell>
        </section>
      </div>
    </main>
  );
}
