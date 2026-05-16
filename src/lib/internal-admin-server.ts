import "server-only";

import { parseBillingConfig, summarizeBillingConfig } from "@/lib/billing-config";
import {
  getProviderModelRuntimeDiagnostics,
  getProviderRuntimeDiagnostics,
  getRoutingRuleRuntimeDiagnostics,
} from "@/lib/provider-runtime-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AdminRole = "owner" | "admin";

type ProviderRow = {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  status: "healthy" | "degraded" | "offline";
  regions: string[] | null;
  credentials_ref: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
};

type SupportedModelRow = {
  id: string;
  provider: string;
  model_slug: string;
  display_name: string;
  modality: "image" | "video" | "audio";
  capability: "image_generation" | "image_edit" | "video_generation" | null;
  billing_config: Record<string, unknown> | null;
  unit_label: string;
  default_unit_cost: number;
  active: boolean;
  created_at: string;
};

type ModelVendorRow = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number | null;
  created_at: string;
};

type WorkerTemplateRow = {
  id: string;
  display_name: string | null;
  slug: string;
  config: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
};

type GatewayErrorDefinitionRow = {
  id: string;
  code: string;
  category: string;
  http_status: number;
  public_message: string;
  retryable: boolean;
  active: boolean;
  sort_order: number;
  operator_notes: string | null;
  created_at: string;
  updated_at: string;
};

type ProviderAdapterAliasRow = {
  id: string;
  alias_slug: string;
  adapter_slug: string;
  active: boolean;
  created_at: string;
};

type ProviderAdapterCatalogRow = {
  id: string;
  slug: string;
  active: boolean;
  created_at: string;
};

type ProviderModelRow = {
  id: string;
  provider_id: string;
  supported_model_id: string | null;
  public_model_slug: string;
  upstream_model_slug: string;
  capability: "image_generation" | "image_edit" | "video_generation";
  active: boolean;
  pricing: Record<string, unknown> | null;
  input_schema: Record<string, unknown> | null;
  output_schema: Record<string, unknown> | null;
  execution_template: string | null;
  execution_config: Record<string, unknown> | null;
  created_at: string;
};

type ProviderModelShowcaseAssetRow = {
  id: string;
  provider_model_id: string;
  asset_kind: "cover" | "gallery";
  storage_bucket: string;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

type RoutingRuleRow = {
  id: string;
  workspace_id: string | null;
  capability: "image_generation" | "image_edit" | "video_generation";
  public_model_slug: string;
  primary_provider_model_id: string;
  fallback_provider_model_id: string | null;
  route_strategy: string;
  active: boolean;
  created_at: string;
};

type RequestRow = {
  id: string;
  workspace_id: string | null;
  user_id: string | null;
  api_key_id: string | null;
  request_source: string | null;
  capability: string;
  public_model_slug: string;
  provider_id: string | null;
  provider_model_id: string | null;
  status: string;
  estimated_cost: number | null;
  actual_cost: number | null;
  estimated_customer_charge: number | null;
  actual_customer_charge: number | null;
  estimated_provider_cost: number | null;
  actual_provider_cost: number | null;
  estimated_profit: number | null;
  actual_profit: number | null;
  error_code: string | null;
  error_message: string | null;
  output_payload: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  workspaces:
    | {
        name: string | null;
        slug: string | null;
      }
    | Array<{
        name: string | null;
        slug: string | null;
      }>
    | null;
};

type MonitoringRequestRow = {
  id: string;
  capability: string;
  public_model_slug: string;
  status: string;
  created_at: string;
  count?: number;
};

type GlobalMonitoringRequestRow = {
  id: string;
  workspace_id: string | null;
  capability: string;
  public_model_slug: string;
  status: string;
  error_code: string | null;
  error_message: string | null;
  output_payload: Record<string, unknown> | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  workspaces:
    | {
        name: string | null;
        slug: string | null;
      }
    | Array<{
        name: string | null;
        slug: string | null;
      }>
    | null;
};

type AttemptRow = {
  id: string;
  request_id: string;
  provider_id: string;
  provider_model_id: string | null;
  attempt_no: number;
  status: string;
  upstream_request_id: string | null;
  upstream_task_id: string | null;
  latency_ms: number | null;
  response_payload: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
};

type InternalUserRequestSummary = {
  id: string;
  status: string;
  capability: string;
  public_model_slug: string;
  sourceLabel: string;
  apiKeyName: string;
  apiKeyPrefix: string;
  apiKeyEnvironment: string;
  customerChargeLabel: string;
  providerCostLabel: string;
  profitLabel: string;
  createdLabel: string;
  completedLabel: string;
  error_code: string | null;
  error_message: string | null;
  upstreamRawText: string;
  packagedOutputText: string;
};

type MonitoringAttemptRow = {
  request_id: string;
  attempt_no: number;
  status: string;
  upstream_request_id: string | null;
  upstream_task_id: string | null;
  latency_ms: number | null;
  error_message: string | null;
  updated_at: string;
};

type ApiKeyRow = {
  id: string;
  workspace_id: string;
  created_by: string | null;
  name: string;
  key_prefix: string;
  environment: string;
  status: string;
  created_at: string;
};

type UsageEventRow = {
  external_request_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ProviderCredentialRow = {
  id: string;
  provider_id: string;
  label: string;
  secret_ref: string | null;
  secret_mask: string | null;
  secret_source: string;
  secret_ciphertext: string | null;
  secret_iv: string | null;
  secret_auth_tag: string | null;
  secret_last_updated_at: string | null;
  environment: string;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type AdminAuditLogRow = {
  id: string;
  actor_user_id: string | null;
  workspace_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

type InternalModelAiUsageLogRow = {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  source_url: string;
  model: string;
  status: "succeeded" | "failed";
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost_usd: number | null;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
};

type InternalAdminDataOptions = {
  monitoringLookbackMs?: number;
  monitoringStatus?:
    | "all"
    | "succeeded"
    | "failed"
    | "cancelled"
    | "inflight";
  monitoringModelSlug?: string | null;
  monitoringView?: "overview" | "video" | "image" | "requests";
  requestScope?: string;
  requestPage?: number;
  requestPageSize?: number;
  userPage?: number;
  userPageSize?: number;
  userSearch?: string | null;
  modelPage?: number;
  modelPageSize?: number;
  modelTypeFilter?: string | null;
  modelStatusFilter?: "all" | "active" | "inactive";
  internalAiUsagePage?: number;
  internalAiUsagePageSize?: number;
  activeTab?: string;
  bypassAuth?: boolean;
};

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "{}";
  }

  return JSON.stringify(value, null, 2);
}

function summarizeBilling(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return "缺少计费配置";
  }

  try {
    return summarizeBillingConfig(parseBillingConfig(value));
  } catch {
    return "计费配置无效";
  }
}

function formatRelativeTimestamp(value: string | null) {
  if (!value) {
    return "等待中";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date) + " CST";
}

function formatCurrency(value: number | null | undefined) {
  const normalizedValue = value ?? 0;
  const absValue = Math.abs(normalizedValue);
  const fractionDigits = absValue > 0 && absValue < 0.1 ? 6 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(normalizedValue);
}

function formatInternalBalance(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value ?? 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function formatUnknownJson(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function sanitizeOutputPayloadForCustomer(value: unknown) {
  const payload = asRecord(value);
  if (!payload) return null;
  const { raw: _raw, ...rest } = payload;
  const assets = Array.isArray(rest.assets)
    ? rest.assets.map((item) => {
        const asset = asRecord(item);
        if (!asset) return item;
        const { sourceUrl: _sourceUrl, ...assetRest } = asset;
        return assetRest;
      })
    : rest.assets;
  return { ...rest, assets };
}

function extractOutputPayloadFromUsageMetadata(metadata: unknown) {
  const record = asRecord(metadata);
  if (!record) return null;
  const candidates = [
    record.output_payload,
    record.outputPayload,
    record.customer_output_payload,
    asRecord(record.response)?.output_payload,
    asRecord(record.result)?.output_payload,
  ];
  for (const candidate of candidates) {
    const payload = asRecord(candidate);
    if (payload) return payload;
  }
  return null;
}

function extractUpstreamPayloadFromUsageMetadata(metadata: unknown) {
  const record = asRecord(metadata);
  if (!record) return null;
  const candidates = [
    record.upstream_raw,
    record.upstream_response,
    record.provider_response,
    record.raw,
    asRecord(record.response)?.upstream_raw,
    asRecord(record.result)?.upstream_raw,
  ];
  for (const candidate of candidates) {
    if (candidate !== null && candidate !== undefined) {
      return candidate;
    }
  }
  return null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function formatMetricValue(key: string, value: number) {
  if (key.toLowerCase().includes("token")) {
    return new Intl.NumberFormat("en-US").format(Math.round(value));
  }

  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2);
}

function labelBreakdownKey(key: string) {
  const labels: Record<string, string> = {
    requestCount: "请求数",
    imageCount: "图片数",
    videoCount: "视频数",
    durationSeconds: "时长（秒）",
    inputTokens: "输入 Token",
    outputTokens: "输出 Token",
    perRequest: "按请求",
    perImage: "按图片",
    perVideo: "按视频",
    perSecond: "按秒",
    inputTextTokens: "输入 Token",
    outputTextTokens: "输出 Token",
  };

  if (labels[key]) {
    return labels[key];
  }

  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizeInternalRequest(input: {
  request: RequestRow;
  apiKey: ApiKeyRow | null;
  attempts: AttemptRow[];
  usageEvent: UsageEventRow | null;
}) {
  const { request, apiKey, attempts: relatedAttempts, usageEvent } = input;
  const economics = asRecord(usageEvent?.metadata)?.economics;
  const economicsRecord = asRecord(economics);
  const customerBreakdown = asRecord(economicsRecord?.customer);
  const providerBreakdown = asRecord(economicsRecord?.provider);
  const customerComponents = asRecord(customerBreakdown?.components);
  const providerComponents = asRecord(providerBreakdown?.components);
  const metricsRecord = asRecord(customerBreakdown?.metrics) ?? asRecord(providerBreakdown?.metrics);
  const customerCharge = Number(
    request.actual_customer_charge ?? request.actual_cost ?? request.estimated_customer_charge ?? request.estimated_cost ?? 0
  );
  const providerCost = Number(
    request.actual_provider_cost ?? request.estimated_provider_cost ?? 0
  );
  const profit = Number(
    request.actual_profit ??
      request.estimated_profit ??
      customerCharge - providerCost
  );
  const usageBreakdown = Object.entries(metricsRecord ?? {})
    .map(([key, rawValue]) => {
      const value = readNumber(rawValue);
      if (value === null || value <= 0) return null;
      return {
        label: labelBreakdownKey(key),
        value: formatMetricValue(key, value),
      };
    })
    .filter((item) => item !== null);
  const customerComponentBreakdown = Object.entries(customerComponents ?? {})
    .map(([key, rawValue]) => {
      const value = readNumber(rawValue);
      if (value === null || value <= 0) return null;
      return {
        label: labelBreakdownKey(key),
        value: formatCurrency(value),
      };
    })
    .filter((item) => item !== null);
  const providerComponentBreakdown = Object.entries(providerComponents ?? {})
    .map(([key, rawValue]) => {
      const value = readNumber(rawValue);
      if (value === null || value <= 0) return null;
      return {
        label: labelBreakdownKey(key),
        value: formatCurrency(value),
      };
    })
    .filter((item) => item !== null);
  const outputPayloadFromRequest = asRecord(request.output_payload);
  const outputPayloadFromUsage = extractOutputPayloadFromUsageMetadata(usageEvent?.metadata);
  const packagedOutputPayload =
    sanitizeOutputPayloadForCustomer(outputPayloadFromRequest) ??
    sanitizeOutputPayloadForCustomer(outputPayloadFromUsage);
  const upstreamRawPayload =
    outputPayloadFromRequest?.raw ??
    extractUpstreamPayloadFromUsageMetadata(usageEvent?.metadata) ??
    relatedAttempts.find((attempt) => attempt.response_payload)?.response_payload ??
    null;

  return {
    ...request,
    sourceLabel: request.request_source === "playground" ? "Playground" : "API",
    apiKeyName: apiKey?.name ?? "Unknown key",
    apiKeyPrefix: apiKey?.key_prefix ?? "unknown",
    apiKeyEnvironment: apiKey?.environment ?? "unknown",
    attemptCount: relatedAttempts.length,
    lastAttempt: relatedAttempts[0] ?? null,
    customerCharge,
    providerCost,
    profit,
    customerChargeLabel: formatCurrency(customerCharge),
    providerCostLabel: formatCurrency(providerCost),
    profitLabel: formatCurrency(profit),
    usageBreakdown,
    customerComponentBreakdown,
    providerComponentBreakdown,
    upstreamRawText: formatUnknownJson(upstreamRawPayload) ?? "null",
    packagedOutputText: formatUnknownJson(packagedOutputPayload) ?? "null",
    createdLabel: formatRelativeTimestamp(request.created_at),
    completedLabel: formatRelativeTimestamp(request.completed_at),
  };
}

async function fetchMonitoringRequests(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lookbackMs: number,
  filters: {
    status?:
      | "all"
      | "succeeded"
      | "failed"
      | "cancelled"
      | "inflight";
    modelSlug?: string | null;
    interval?: "minute" | "hour" | "day";
  } = {}
) {
  const sinceIso = new Date(Date.now() - lookbackMs).toISOString();
  const aggregateResponse = await supabase.rpc("get_internal_monitoring_buckets", {
    p_since: sinceIso,
    p_interval: filters.interval ?? "hour",
    p_status: filters.status ?? "all",
    p_model_slug: filters.modelSlug?.trim() || null,
  });

  if (!aggregateResponse.error) {
    return ((aggregateResponse.data ?? []) as Array<{
      public_model_slug: string | null;
      status: string | null;
      bucket_start: string | null;
      total_count: number | string | null;
    }>).map((row, index) => ({
      id: `aggregate-${index}`,
      capability: "",
      public_model_slug: row.public_model_slug ?? "unknown",
      status: row.status ?? "unknown",
      created_at: row.bucket_start ?? sinceIso,
      count: Number(row.total_count ?? 0),
    }));
  }

  const batchSize = 2000;
  const maxBatches = 1;
  const rows: MonitoringRequestRow[] = [];

  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
    const from = batchIndex * batchSize;
    const to = from + batchSize - 1;
    let query = supabase
      .from("inference_requests")
      .select("id, capability, public_model_slug, status, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });

    if (filters.modelSlug && filters.modelSlug.trim().length > 0) {
      query = query.eq("public_model_slug", filters.modelSlug.trim());
    }

    if (filters.status && filters.status !== "all") {
      if (filters.status === "inflight") {
        query = query.in("status", ["queued", "submitted", "processing"]);
      } else {
        query = query.eq("status", filters.status);
      }
    }

    const response = await query.range(from, to);

    if (response.error) {
      break;
    }

    const batchRows = (response.data ?? []) as MonitoringRequestRow[];
    rows.push(...batchRows);

    if (batchRows.length < batchSize) {
      break;
    }
  }

  return rows;
}

async function fetchGlobalMonitoringData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  lookbackMs: number
) {
  const sinceIso = new Date(Date.now() - lookbackMs).toISOString();
  const [videoInflightResponse, videoRecentResponse, imageRecentResponse] =
    await Promise.all([
      supabase
        .from("inference_requests")
        .select(
          "id, workspace_id, capability, public_model_slug, status, error_code, error_message, output_payload, created_at, started_at, completed_at"
        )
        .eq("capability", "video_generation")
        .gte("created_at", sinceIso)
        .in("status", ["queued", "submitted", "processing"])
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("inference_requests")
        .select(
          "id, workspace_id, capability, public_model_slug, status, error_code, error_message, output_payload, created_at, started_at, completed_at"
        )
        .eq("capability", "video_generation")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("inference_requests")
        .select(
          "id, workspace_id, capability, public_model_slug, status, error_code, error_message, output_payload, created_at, started_at, completed_at"
        )
        .in("capability", ["image_generation", "image_edit"])
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(120),
    ]);

  const videoInflightRequests = (videoInflightResponse.error
    ? []
    : videoInflightResponse.data ?? []) as GlobalMonitoringRequestRow[];
  const recentVideoRequests = (videoRecentResponse.error
    ? []
    : videoRecentResponse.data ?? []) as GlobalMonitoringRequestRow[];
  const recentImageRequests = (imageRecentResponse.error
    ? []
    : imageRecentResponse.data ?? []) as GlobalMonitoringRequestRow[];
  const latestAttemptByRequestId = new Map<string, MonitoringAttemptRow>();

  const toWorkspace = (
    value: GlobalMonitoringRequestRow["workspaces"]
  ): { name: string; slug: string } => {
    const row = Array.isArray(value) ? value[0] ?? null : value;
    return {
      name: row?.name ?? "Unknown workspace",
      slug: row?.slug ?? "unknown-workspace",
    };
  };

  const enrichRequest = (request: GlobalMonitoringRequestRow) => {
    const workspace = toWorkspace(request.workspaces);
    const lastAttempt = latestAttemptByRequestId.get(request.id) ?? null;

    return {
      id: request.id,
      capability: request.capability,
      publicModelSlug: request.public_model_slug,
      status: request.status,
      errorCode: request.error_code,
      errorMessage: request.error_message,
      createdAt: request.created_at,
      startedAt: request.started_at,
      completedAt: request.completed_at,
      createdLabel: formatRelativeTimestamp(request.created_at),
      startedLabel: formatRelativeTimestamp(request.started_at),
      completedLabel: formatRelativeTimestamp(request.completed_at),
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      upstreamRawText: formatUnknownJson(asRecord(request.output_payload)?.raw ?? null),
      packagedOutputText: formatUnknownJson(
        sanitizeOutputPayloadForCustomer(request.output_payload)
      ),
      lastAttempt: lastAttempt
        ? {
            attemptNo: lastAttempt.attempt_no,
            status: lastAttempt.status,
            upstreamRequestId: lastAttempt.upstream_request_id,
            upstreamTaskId: lastAttempt.upstream_task_id,
            latencyMs: lastAttempt.latency_ms,
            errorMessage: lastAttempt.error_message,
            updatedLabel: formatRelativeTimestamp(lastAttempt.updated_at),
          }
        : null,
    };
  };

  const imageStatusSummary = recentImageRequests.reduce(
    (summary, request) => {
      summary.total += 1;

      if (request.status === "succeeded") {
        summary.succeeded += 1;
      } else if (request.status === "failed") {
        summary.failed += 1;
      } else if (request.status === "cancelled") {
        summary.cancelled += 1;
      } else {
        summary.inflight += 1;
      }

      return summary;
    },
    {
      total: 0,
      inflight: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
    }
  );

  return {
    videoInflightRequests: videoInflightRequests.map(enrichRequest),
    recentVideoRequests: recentVideoRequests.map(enrichRequest),
    imageSummary: imageStatusSummary,
    recentImageRequests: recentImageRequests.map(enrichRequest),
  };
}

export async function getInternalAdminData(options: InternalAdminDataOptions = {}) {
  const bypassAuth = options.bypassAuth === true;
  const supabase = bypassAuth ? createAdminClient() : await createClient();
  const user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
  } | null = bypassAuth
    ? {
        id: "internal-password-access",
        email: "internal@openoctopus.local",
        user_metadata: { name: "Internal Access" },
      }
    : ((await supabase.auth.getUser()).data.user as {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      } | null);

  if (!user) {
    return null;
  }

  const membership = bypassAuth
    ? ({
        workspace_id: "00000000-0000-0000-0000-000000000000",
        role: "owner",
        workspaces: {
          id: "00000000-0000-0000-0000-000000000000",
          name: "Internal Workspace",
          slug: "internal-workspace",
        },
      } as const)
    : (
        await supabase
          .from("workspace_members")
          .select("workspace_id, role, workspaces(id, name, slug)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()
      ).data;

  const role = membership?.role as string | undefined;
  const canManage = role === "owner" || role === "admin";

  if (!membership?.workspace_id || !canManage) {
    return {
      authorized: false as const,
      user: {
        id: user.id,
        email: user.email ?? null,
        name:
          (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
          (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
          user.email?.split("@")[0] ??
          "OpenOctopus Admin",
      },
      workspace: null,
    };
  }

  const workspaceRelation = Array.isArray(membership.workspaces)
    ? membership.workspaces[0]
    : membership.workspaces;
  const monitoringLookbackMs =
    options.monitoringLookbackMs ?? 90 * 24 * 60 * 60 * 1000;
  const monitoringSinceIso = new Date(Date.now() - monitoringLookbackMs).toISOString();
  const monitoringStatus = options.monitoringStatus ?? "all";
  const monitoringModelSlug = options.monitoringModelSlug ?? null;
  const monitoringView = options.monitoringView ?? "overview";
  const requestScope = options.requestScope ?? "all";
  const requestPageSize = Math.min(Math.max(options.requestPageSize ?? 20, 1), 100);
  const requestPage = Math.max(Math.floor(options.requestPage ?? 1), 1);
  const userPageSize = Math.min(Math.max(options.userPageSize ?? 10, 1), 50);
  const userPage = Math.max(Math.floor(options.userPage ?? 1), 1);
  const userSearch = options.userSearch?.trim() ?? "";
  const modelPageSize = Math.min(Math.max(options.modelPageSize ?? 10, 1), 50);
  const modelPage = Math.max(Math.floor(options.modelPage ?? 1), 1);
  const modelTypeFilter = options.modelTypeFilter?.trim() ?? "all";
  const modelStatusFilter = options.modelStatusFilter ?? "all";
  const internalAiUsagePageSize = Math.min(Math.max(options.internalAiUsagePageSize ?? 10, 1), 50);
  const internalAiUsagePage = Math.max(Math.floor(options.internalAiUsagePage ?? 1), 1);
  const activeTab = options.activeTab ?? "public-models";
  const shouldPaginatePublicModels = activeTab === "public-models";
  const shouldPaginateInternalAiUsageLogs = activeTab === "internal-model-ai-usage-logs";
  const shouldLoadMonitoring =
    activeTab === "monitoring" ||
    activeTab === "monitoring-overview" ||
    activeTab === "monitoring-requests";
  const shouldLoadManagementData = !shouldLoadMonitoring;
  const shouldLoadRequestRecords = shouldLoadMonitoring && monitoringView === "requests";
  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);

  const [
    providersResponse,
    supportedModelsResponse,
    modelVendorsResponse,
    workerTemplatesResponse,
    gatewayErrorDefinitionsResponse,
    providerAdapterCatalogResponse,
    providerAdapterAliasesResponse,
    providerCredentialsResponse,
    providerModelsResponse,
    providerModelShowcaseAssetsResponse,
    routingRulesResponse,
    requestsResponse,
    apiKeysResponse,
    usageEventsResponse,
    attemptsResponse,
    adminAuditLogsResponse,
    internalModelAiUsageLogsResponse,
  ] =
    await Promise.all([
      shouldLoadManagementData
        ? supabase
            .from("providers")
            .select(
              "id, name, slug, base_url, status, regions, credentials_ref, config, created_at"
            )
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? (() => {
            let query = supabase
              .from("supported_models")
              .select(
                "id, provider, model_slug, display_name, modality, capability, billing_config, unit_label, default_unit_cost, active, created_at",
                shouldPaginatePublicModels ? { count: "exact" } : undefined
              )
              .order("created_at", { ascending: true });
            if (shouldPaginatePublicModels && modelStatusFilter !== "all") {
              query = query.eq("active", modelStatusFilter === "active");
            }
            if (shouldPaginatePublicModels && modelTypeFilter !== "all") {
              query = query.filter("billing_config->metadata->>modelType", "eq", modelTypeFilter);
            }
            return shouldPaginatePublicModels
              ? query.range((modelPage - 1) * modelPageSize, modelPage * modelPageSize - 1)
              : query;
          })()
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? supabase
            .from("model_vendors")
            .select("id, name, active, sort_order, created_at")
            .order("sort_order", { ascending: true })
            .order("name", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? supabase
            .from("worker_templates")
            .select("id, display_name, slug, config, active, created_at")
            .eq("active", true)
            .order("slug", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? supabase
            .from("gateway_error_definitions")
            .select("id, code, category, http_status, public_message, retryable, active, sort_order, operator_notes, created_at, updated_at")
            .order("sort_order", { ascending: true })
            .order("code", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? supabase
            .from("provider_adapter_catalog")
            .select("id, slug, active, created_at")
            .eq("active", true)
            .order("slug", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? supabase
            .from("provider_adapter_aliases")
            .select("id, alias_slug, adapter_slug, active, created_at")
            .eq("active", true)
            .order("alias_slug", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? supabase
            .from("provider_credentials")
            .select(
              "id, provider_id, label, secret_ref, secret_mask, secret_source, secret_ciphertext, secret_iv, secret_auth_tag, secret_last_updated_at, environment, is_active, notes, metadata, created_at"
            )
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? (shouldPaginatePublicModels
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from("provider_models")
                .select(
                  "id, provider_id, supported_model_id, public_model_slug, upstream_model_slug, capability, active, pricing, input_schema, output_schema, execution_template, execution_config, created_at"
                )
                .order("created_at", { ascending: true }))
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? (shouldPaginatePublicModels
            ? Promise.resolve({ data: [], error: null })
            : supabase
                .from("provider_model_showcase_assets")
                .select("id, provider_model_id, asset_kind, storage_bucket, storage_path, public_url, alt_text, sort_order, created_at")
                .order("sort_order", { ascending: true })
                .order("created_at", { ascending: true }))
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? (bypassAuth
            ? supabase
                .from("routing_rules")
                .select(
                  "id, workspace_id, capability, public_model_slug, primary_provider_model_id, fallback_provider_model_id, route_strategy, active, created_at"
                )
                .order("created_at", { ascending: true })
            : supabase
                .from("routing_rules")
                .select(
                  "id, workspace_id, capability, public_model_slug, primary_provider_model_id, fallback_provider_model_id, route_strategy, active, created_at"
                )
                .or(`workspace_id.eq.${membership.workspace_id},workspace_id.is.null`)
                .order("created_at", { ascending: true }))
        : Promise.resolve({ data: [], error: null }),
      shouldLoadRequestRecords
        ? Promise.resolve({ data: [], error: null })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadRequestRecords
        ? Promise.resolve({ data: [], error: null })
        : Promise.resolve({ data: [], error: null }),
      shouldLoadRequestRecords
        ? Promise.resolve({ data: [], error: null })
        : Promise.resolve({ data: [], error: null }),
      Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? (bypassAuth
            ? supabase
                .from("admin_audit_logs")
                .select(
                  "id, actor_user_id, workspace_id, action, target_type, target_id, summary, details, created_at"
                )
                .order("created_at", { ascending: false })
                .limit(40)
            : supabase
                .from("admin_audit_logs")
                .select(
                  "id, actor_user_id, workspace_id, action, target_type, target_id, summary, details, created_at"
                )
                .or(`workspace_id.eq.${membership.workspace_id},workspace_id.is.null`)
                .order("created_at", { ascending: false })
                .limit(40))
        : Promise.resolve({ data: [], error: null }),
      shouldLoadManagementData
        ? (() => {
            let query = supabase
              .from("internal_model_ai_usage_logs")
              .select(
                "id, workspace_id, actor_user_id, source_url, model, status, input_tokens, output_tokens, total_tokens, estimated_cost_usd, latency_ms, error_message, created_at",
                shouldPaginateInternalAiUsageLogs ? { count: "exact" } : undefined
              )
              .order("created_at", { ascending: false });
            if (!bypassAuth) {
              query = query.or(`workspace_id.eq.${membership.workspace_id},workspace_id.is.null`);
            }
            return shouldPaginateInternalAiUsageLogs
              ? query.range(
                  (internalAiUsagePage - 1) * internalAiUsagePageSize,
                  internalAiUsagePage * internalAiUsagePageSize - 1
                )
              : query.limit(200);
          })()
        : Promise.resolve({ data: [], error: null }),
    ]);

  const providers = (providersResponse.error ? [] : providersResponse.data ?? []) as ProviderRow[];
  let supportedModels = (supportedModelsResponse.error
    ? []
    : supportedModelsResponse.data ?? []) as SupportedModelRow[];
  const supportedModelTotalCount = supportedModelsResponse.error
    ? 0
    : "count" in supportedModelsResponse
      ? supportedModelsResponse.count ?? supportedModels.length
      : supportedModels.length;
  const modelVendors = (modelVendorsResponse.error
    ? []
    : modelVendorsResponse.data ?? []) as ModelVendorRow[];
  const workerTemplates = (workerTemplatesResponse.error
    ? []
    : workerTemplatesResponse.data ?? []) as WorkerTemplateRow[];
  const gatewayErrorDefinitions = (gatewayErrorDefinitionsResponse.error
    ? []
    : gatewayErrorDefinitionsResponse.data ?? []) as GatewayErrorDefinitionRow[];
  const providerAdapterCatalog = (providerAdapterCatalogResponse.error
    ? []
    : providerAdapterCatalogResponse.data ?? []) as ProviderAdapterCatalogRow[];
  const providerAdapterAliases = (providerAdapterAliasesResponse.error
    ? []
    : providerAdapterAliasesResponse.data ?? []) as ProviderAdapterAliasRow[];
  const providerCredentials = (providerCredentialsResponse.error
    ? []
    : providerCredentialsResponse.data ?? []) as ProviderCredentialRow[];
  let providerModels = (providerModelsResponse.error ? [] : providerModelsResponse.data ?? []) as ProviderModelRow[];
  let providerModelShowcaseAssets =
    (providerModelShowcaseAssetsResponse.error
      ? []
      : providerModelShowcaseAssetsResponse.data ?? []) as ProviderModelShowcaseAssetRow[];
  if (shouldPaginatePublicModels && supportedModels.length > 0) {
    const supportedModelIdsForPage = supportedModels.map((model) => model.id);
    const pageProviderModelsResponse = await supabase
      .from("provider_models")
      .select(
        "id, provider_id, supported_model_id, public_model_slug, upstream_model_slug, capability, active, pricing, input_schema, output_schema, execution_template, execution_config, created_at"
      )
      .in("supported_model_id", supportedModelIdsForPage)
      .order("created_at", { ascending: true });
    providerModels = (pageProviderModelsResponse.error
      ? []
      : pageProviderModelsResponse.data ?? []) as ProviderModelRow[];
    const providerModelIdsForPage = providerModels.map((model) => model.id);
    if (providerModelIdsForPage.length > 0) {
      const pageShowcaseAssetsResponse = await supabase
        .from("provider_model_showcase_assets")
        .select("id, provider_model_id, asset_kind, storage_bucket, storage_path, public_url, alt_text, sort_order, created_at")
        .in("provider_model_id", providerModelIdsForPage)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      providerModelShowcaseAssets = (pageShowcaseAssetsResponse.error
        ? []
        : pageShowcaseAssetsResponse.data ?? []) as ProviderModelShowcaseAssetRow[];
    }
  }
  const derivedWorkerTemplates =
    workerTemplates.length > 0
      ? workerTemplates
      : Array.from(
          new Map(
            providerModels
              .map((item) => item.execution_template?.trim())
              .filter((slug): slug is string => Boolean(slug))
              .map((slug) => [
                slug,
                {
                  id: `derived-${slug}`,
                  display_name: slug,
                  slug,
                  config: {},
                  active: true,
                  created_at: new Date().toISOString(),
                } satisfies WorkerTemplateRow,
              ])
          ).values()
        );
  const routingRules = (routingRulesResponse.error ? [] : routingRulesResponse.data ?? []) as RoutingRuleRow[];
  void requestsResponse;
  let requests: RequestRow[] = [];
  let requestTotalCount = 0;
  let registeredUserTotalCount = 0;
  let apiKeys = (apiKeysResponse.error ? [] : apiKeysResponse.data ?? []) as ApiKeyRow[];
  let usageEvents = (usageEventsResponse.error
    ? []
    : usageEventsResponse.data ?? []) as UsageEventRow[];
  let attempts = (attemptsResponse.error ? [] : attemptsResponse.data ?? []) as AttemptRow[];
  const adminAuditLogs = (adminAuditLogsResponse.error
    ? []
    : adminAuditLogsResponse.data ?? []) as AdminAuditLogRow[];
  const internalModelAiUsageLogs = (internalModelAiUsageLogsResponse.error
    ? []
    : internalModelAiUsageLogsResponse.data ?? []) as InternalModelAiUsageLogRow[];
  const internalModelAiUsageLogTotalCount = internalModelAiUsageLogsResponse.error
    ? 0
    : "count" in internalModelAiUsageLogsResponse
      ? internalModelAiUsageLogsResponse.count ?? internalModelAiUsageLogs.length
      : internalModelAiUsageLogs.length;
  const monitoringRequests =
    shouldLoadMonitoring && monitoringView === "overview"
      ? await fetchMonitoringRequests(supabase, monitoringLookbackMs, {
          status: monitoringStatus,
          modelSlug: monitoringModelSlug,
          interval:
            monitoringLookbackMs <= 90 * 60 * 1000
              ? "minute"
              : monitoringLookbackMs <= 48 * 60 * 60 * 1000
                ? "hour"
                : "day",
        })
      : [];

  const providerById = new Map(providers.map((row) => [row.id, row]));
  const providerAdapterAliasMap = new Map(
    providerAdapterAliases.map((row) => [row.alias_slug, row.adapter_slug])
  );
  const providerModelById = new Map(providerModels.map((row) => [row.id, row]));
  const workerTemplatesBySlug = new Map(
    derivedWorkerTemplates.map((item) => [item.slug, item] as const)
  );
  const supportedModelById = new Map(supportedModels.map((row) => [row.id, row]));
  const credentialsByProviderId = providerCredentials.reduce((map, credential) => {
    const list = map.get(credential.provider_id) ?? [];
    list.push(credential);
    map.set(credential.provider_id, list);
    return map;
  }, new Map<string, ProviderCredentialRow[]>());
  const showcaseAssetsByProviderModelId = providerModelShowcaseAssets.reduce((map, asset) => {
    const list = map.get(asset.provider_model_id) ?? [];
    list.push(asset);
    map.set(asset.provider_model_id, list);
    return map;
  }, new Map<string, ProviderModelShowcaseAssetRow[]>());
  const userProfileById = new Map<string, { id: string; email: string | null; name: string }>();
  if (shouldLoadRequestRecords) {
    const userFrom = (userPage - 1) * userPageSize;
    const userTo = userFrom + userPageSize - 1;
    const normalizedUserSearch = userSearch.replace(/[%,]/g, " ").trim();
    let profilesQuery = supabase
      .from("profiles")
      .select("id, email, full_name", { count: "exact" })
      .order("created_at", { ascending: false });

    if (normalizedUserSearch) {
      profilesQuery = profilesQuery.or(
        `email.ilike.%${normalizedUserSearch}%,full_name.ilike.%${normalizedUserSearch}%`
      );
    }

    const profilesResponse = await profilesQuery.range(userFrom, userTo);
    const profileRows = profilesResponse.error ? [] : profilesResponse.data ?? [];
    registeredUserTotalCount = profilesResponse.error
      ? 0
      : profilesResponse.count ?? profileRows.length;

    for (const row of profileRows) {
      const name =
        (typeof row.full_name === "string" && row.full_name.trim()
          ? row.full_name.trim()
          : null) ??
        row.email?.split("@")[0] ??
        `用户 ${row.id.slice(0, 8)}`;
      userProfileById.set(row.id, {
        id: row.id,
        email: row.email ?? null,
        name,
      });
    }
  }

  if (shouldLoadRequestRecords) {
    const requestFrom = (requestPage - 1) * requestPageSize;
    const requestTo = requestFrom + requestPageSize - 1;
    const selectedRequestUserId = requestScope.startsWith("u:")
      ? requestScope.slice(2)
      : null;
    const selectedRequestKeyId = requestScope.startsWith("k:")
      ? requestScope.slice(2)
      : null;

    let requestQuery = supabase
      .from("inference_requests")
      .select(
        "id, workspace_id, user_id, api_key_id, request_source, capability, public_model_slug, provider_id, provider_model_id, status, estimated_cost, actual_cost, estimated_customer_charge, actual_customer_charge, estimated_provider_cost, actual_provider_cost, estimated_profit, actual_profit, error_code, error_message, output_payload, created_at, started_at, completed_at",
        { count: "exact" }
      )
      .gte("created_at", monitoringSinceIso)
      .order("created_at", { ascending: false });

    if (monitoringStatus !== "all") {
      if (monitoringStatus === "inflight") {
        requestQuery = requestQuery.in("status", ["queued", "submitted", "processing"]);
      } else {
        requestQuery = requestQuery.eq("status", monitoringStatus);
      }
    }

    if (selectedRequestKeyId) {
      requestQuery = requestQuery.eq("api_key_id", selectedRequestKeyId);
    } else if (selectedRequestUserId) {
      const userApiKeyIds = apiKeys
        .filter((apiKey) => apiKey.created_by === selectedRequestUserId)
        .map((apiKey) => apiKey.id);
      if (userApiKeyIds.length > 0) {
        requestQuery = requestQuery.or(
          `user_id.eq.${selectedRequestUserId},api_key_id.in.(${userApiKeyIds.join(",")})`
        );
      } else {
        requestQuery = requestQuery.eq("user_id", selectedRequestUserId);
      }
    }

    const requestsPageResponse = await requestQuery.range(requestFrom, requestTo);
    requests = (requestsPageResponse.error ? [] : requestsPageResponse.data ?? []) as RequestRow[];
    requestTotalCount = requestsPageResponse.error ? 0 : requestsPageResponse.count ?? requests.length;

    const requestIds = requests.map((request) => request.id);
    if (requestIds.length > 0) {
      const [usageEventsPageResponse, attemptsPageResponse] = await Promise.all([
        supabase
          .from("usage_events")
          .select("external_request_id, metadata")
          .in("external_request_id", requestIds),
        supabase
          .from("provider_attempts")
          .select(
            "id, request_id, provider_id, provider_model_id, attempt_no, status, upstream_request_id, upstream_task_id, latency_ms, response_payload, error_message, created_at"
          )
          .in("request_id", requestIds)
          .order("created_at", { ascending: false }),
      ]);
      usageEvents = (usageEventsPageResponse.error
        ? []
        : usageEventsPageResponse.data ?? []) as UsageEventRow[];
      attempts = (attemptsPageResponse.error
        ? []
        : attemptsPageResponse.data ?? []) as AttemptRow[];
    }
  }

  const userMemberships =
    shouldLoadRequestRecords && userProfileById.size > 0
      ? await supabase
          .from("workspace_members")
          .select("workspace_id, user_id, role, created_at, workspaces(id, name, slug)")
          .in("user_id", Array.from(userProfileById.keys()))
      : { data: [], error: null };
  const userMembershipRows = (userMemberships.error
    ? []
    : userMemberships.data ?? []) as Array<{
    workspace_id: string;
    user_id: string;
    role: string;
    created_at: string;
    workspaces:
      | { id: string; name: string | null; slug: string | null }
      | Array<{ id: string; name: string | null; slug: string | null }>
      | null;
  }>;
  const primaryMembershipByUserId = new Map<string, (typeof userMembershipRows)[number]>();
  for (const row of userMembershipRows) {
    if (!primaryMembershipByUserId.has(row.user_id)) {
      primaryMembershipByUserId.set(row.user_id, row);
    }
  }
  const userWorkspaceIds = Array.from(
    new Set(userMembershipRows.map((row) => row.workspace_id).filter(Boolean))
  );
  if (shouldLoadRequestRecords && userProfileById.size > 0) {
    const pageUserIds = Array.from(userProfileById.keys());
    const [workspaceApiKeysResponse, ownerApiKeysResponse] = await Promise.all([
      userWorkspaceIds.length > 0
        ? supabase
            .from("api_keys")
            .select("id, workspace_id, created_by, name, key_prefix, environment, status, created_at")
            .in("workspace_id", userWorkspaceIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("api_keys")
        .select("id, workspace_id, created_by, name, key_prefix, environment, status, created_at")
        .in("created_by", pageUserIds)
        .order("created_at", { ascending: false }),
    ]);
    const apiKeysByIdForPage = new Map<string, ApiKeyRow>();
    for (const row of (workspaceApiKeysResponse.error ? [] : workspaceApiKeysResponse.data ?? []) as ApiKeyRow[]) {
      apiKeysByIdForPage.set(row.id, row);
    }
    for (const row of (ownerApiKeysResponse.error ? [] : ownerApiKeysResponse.data ?? []) as ApiKeyRow[]) {
      apiKeysByIdForPage.set(row.id, row);
    }
    apiKeys = Array.from(apiKeysByIdForPage.values());
  }
  const userWalletSummary =
    shouldLoadRequestRecords && userWorkspaceIds.length > 0
      ? await supabase
          .from("v_workspace_wallet_summary")
          .select("workspace_id, balance, topup, system_credit, usage")
          .in("workspace_id", userWorkspaceIds)
      : { data: [], error: null };
  const walletSummaryRowsForUsers = (userWalletSummary.error
    ? []
    : userWalletSummary.data ?? []) as Array<{
    workspace_id: string;
    balance: number | string | null;
    topup: number | string | null;
    system_credit: number | string | null;
    usage: number | string | null;
  }>;
  const walletSummaryByWorkspaceId = new Map(
    walletSummaryRowsForUsers.map((row) => [
      row.workspace_id,
      {
        balance: Number(row.balance ?? 0),
        topup: Number(row.topup ?? 0),
        systemCredit: Number(row.system_credit ?? 0),
        usage: Number(row.usage ?? 0),
      },
    ])
  );
  const apiKeysByWorkspaceId = apiKeys.reduce((map, apiKey) => {
    const list = map.get(apiKey.workspace_id) ?? [];
    list.push(apiKey);
    map.set(apiKey.workspace_id, list);
    return map;
  }, new Map<string, ApiKeyRow[]>());
  const apiKeysByOwnerUserId = apiKeys.reduce((map, apiKey) => {
    if (!apiKey.created_by) return map;
    const list = map.get(apiKey.created_by) ?? [];
    list.push(apiKey);
    map.set(apiKey.created_by, list);
    return map;
  }, new Map<string, ApiKeyRow[]>());
  const usageEventByRequestId = new Map(
    usageEvents
      .filter((row) => row.external_request_id)
      .map((row) => [row.external_request_id as string, row])
  );
  const apiKeyById = new Map(apiKeys.map((row) => [row.id, row]));
  const apiKeyWorkspaceById = new Map(
    apiKeys.map((row) => [row.id, row.workspace_id] as const)
  );

  const requestAttempts = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    const list = requestAttempts.get(attempt.request_id) ?? [];
    list.push(attempt);
    requestAttempts.set(attempt.request_id, list);
  }

  const registeredUserBase = Array.from(userProfileById.values())
    .map((profile) => {
      const membership = primaryMembershipByUserId.get(profile.id) ?? null;
      const workspace = Array.isArray(membership?.workspaces)
        ? membership?.workspaces[0] ?? null
        : membership?.workspaces ?? null;
      const walletSummary = membership?.workspace_id
        ? walletSummaryByWorkspaceId.get(membership.workspace_id) ?? {
            balance: 0,
            topup: 0,
            systemCredit: 0,
            usage: 0,
          }
        : { balance: 0, topup: 0, systemCredit: 0, usage: 0 };
      const userApiKeyMap = new Map<string, ApiKeyRow>();
      for (const apiKey of apiKeysByOwnerUserId.get(profile.id) ?? []) {
        userApiKeyMap.set(apiKey.id, apiKey);
      }
      if (membership?.workspace_id) {
        for (const apiKey of apiKeysByWorkspaceId.get(membership.workspace_id) ?? []) {
          userApiKeyMap.set(apiKey.id, apiKey);
        }
      }
      const userApiKeys = Array.from(userApiKeyMap.values()).sort((a, b) => {
        const byStatus = a.status.localeCompare(b.status, "en-US");
        if (byStatus !== 0) return byStatus;
        return b.created_at.localeCompare(a.created_at);
      });
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        workspaceId: membership?.workspace_id ?? null,
        workspaceName: workspace?.name ?? "未创建 workspace",
        workspaceSlug: workspace?.slug ?? null,
        role: membership?.role ?? "none",
        balance: walletSummary.balance,
        balanceLabel: formatInternalBalance(walletSummary.balance),
        walletBreakdown: {
          topup: walletSummary.topup,
          topupLabel: formatInternalBalance(walletSummary.topup),
          systemCredit: walletSummary.systemCredit,
          systemCreditLabel: formatInternalBalance(walletSummary.systemCredit),
          usage: walletSummary.usage,
          usageLabel: formatInternalBalance(walletSummary.usage),
        },
        apiKeys: userApiKeys.map((apiKey) => ({
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.key_prefix,
          environment: apiKey.environment,
          status: apiKey.status,
          createdLabel: formatRelativeTimestamp(apiKey.created_at),
        })),
      };
    });

  const providerSummaries = providers.map((provider) => {
    const models = providerModels.filter((item) => item.provider_id === provider.id);
    const providerRequests = requests.filter((item) => item.provider_id === provider.id);
    const credentials = credentialsByProviderId.get(provider.id) ?? [];

    return {
      ...provider,
      modelCount: models.length,
      activeModelCount: models.filter((item) => item.active).length,
      credentialCount: credentials.length,
      requestCount: providerRequests.length,
      regionsLabel: (provider.regions ?? []).join(", ") || "global",
      configText: formatJson(provider.config),
      runtimeDiagnostics: getProviderRuntimeDiagnostics({
        provider,
        adapterAliases: providerAdapterAliasMap,
        credentials: credentials.map((credential) => ({
          id: credential.id,
          label: credential.label,
          provider_id: credential.provider_id,
          secret_source: credential.secret_source,
          environment: credential.environment,
          is_active: credential.is_active,
          has_encrypted_secret_material: Boolean(
            credential.secret_ciphertext && credential.secret_iv && credential.secret_auth_tag
          ),
        })),
        models,
      }),
    };
  });

  const providerModelSummaries = await Promise.all(providerModels.map(async (providerModel) => {
    const provider = providerById.get(providerModel.provider_id);
    const supportedModel = providerModel.supported_model_id
      ? supportedModelById.get(providerModel.supported_model_id)
      : null;
    const credentials = credentialsByProviderId.get(providerModel.provider_id) ?? [];
    const showcaseAssets = showcaseAssetsByProviderModelId.get(providerModel.id) ?? [];

    return {
      ...providerModel,
      providerName: provider?.name ?? "Unknown provider",
      providerSlug: provider?.slug ?? "unknown",
      supportedModelName: supportedModel?.display_name ?? providerModel.public_model_slug,
      pricingText: formatJson(providerModel.pricing),
      pricingSummary: summarizeBilling(providerModel.pricing),
      pricingSourceUrl: null,
      pricingSourceNote: null,
      pricingSourceEvidence: [],
      executionTemplate: providerModel.execution_template ?? "rest-async-poll-v1",
      executionConfigText: formatJson(providerModel.execution_config),
      inputSchemaText: formatJson(providerModel.input_schema),
      outputSchemaText: formatJson(providerModel.output_schema),
      showcaseAssets: showcaseAssets.map((asset) => ({
        id: asset.id,
        kind: asset.asset_kind,
        publicUrl: asset.public_url,
        storageBucket: asset.storage_bucket,
        storagePath: asset.storage_path,
        altText: asset.alt_text,
        sortOrder: asset.sort_order,
      })),
      runtimeDiagnostics: getProviderModelRuntimeDiagnostics({
        providerModel,
        provider: provider ?? null,
        supportedModel: supportedModel ?? null,
        adapterAliases: providerAdapterAliasMap,
        workerTemplatesBySlug,
        credentials: credentials.map((credential) => ({
          id: credential.id,
          label: credential.label,
          provider_id: credential.provider_id,
          secret_source: credential.secret_source,
          environment: credential.environment,
          is_active: credential.is_active,
          has_encrypted_secret_material: Boolean(
            credential.secret_ciphertext && credential.secret_iv && credential.secret_auth_tag
          ),
        })),
      }),
    };
  }));

  const routingRuleSummaries = routingRules.map((rule) => {
    const primaryModel = providerModelById.get(rule.primary_provider_model_id) ?? null;
    const fallbackModel = rule.fallback_provider_model_id
      ? providerModelById.get(rule.fallback_provider_model_id) ?? null
      : null;
    const primaryProvider = primaryModel
      ? providerById.get(primaryModel.provider_id) ?? null
      : null;
    const fallbackProvider = fallbackModel
      ? providerById.get(fallbackModel.provider_id) ?? null
      : null;

    return {
      ...rule,
      supportedModelId: primaryModel?.supported_model_id ?? fallbackModel?.supported_model_id ?? null,
      primaryLabel: primaryModel
        ? `${primaryProvider?.name ?? "Unknown"} / ${primaryModel.upstream_model_slug}`
        : "Missing primary model",
      fallbackLabel: fallbackModel
        ? `${fallbackProvider?.name ?? "Unknown"} / ${fallbackModel.upstream_model_slug}`
        : "No fallback",
      scopeLabel: rule.workspace_id ? "workspace" : "global",
      runtimeDiagnostics: getRoutingRuleRuntimeDiagnostics({
        routingRule: rule,
        providerModelsById: providerModelById,
        providersById: providerById,
        supportedModelsById: supportedModelById,
        adapterAliases: providerAdapterAliasMap,
        workerTemplatesBySlug,
        credentialsByProviderId: new Map(
          Array.from(credentialsByProviderId.entries()).map(([providerId, credentials]) => [
            providerId,
            credentials.map((credential) => ({
              id: credential.id,
              label: credential.label,
              provider_id: credential.provider_id,
              secret_source: credential.secret_source,
              environment: credential.environment,
              is_active: credential.is_active,
              has_encrypted_secret_material: Boolean(
                credential.secret_ciphertext && credential.secret_iv && credential.secret_auth_tag
              ),
            })),
          ])
        ),
      }),
    };
  });

  const summarizeRequest = (request: RequestRow) => {
    const provider = request.provider_id ? providerById.get(request.provider_id) ?? null : null;
    const providerModel = request.provider_model_id
      ? providerModelById.get(request.provider_model_id) ?? null
      : null;
    const apiKey = request.api_key_id ? apiKeyById.get(request.api_key_id) ?? null : null;
    const relatedAttempts = requestAttempts.get(request.id) ?? [];
    const usageEvent = usageEventByRequestId.get(request.id) ?? null;
    const economics = asRecord(usageEvent?.metadata)?.economics;
    const economicsRecord = asRecord(economics);
    const customerBreakdown = asRecord(economicsRecord?.customer);
    const providerBreakdown = asRecord(economicsRecord?.provider);
    const customerComponents = asRecord(customerBreakdown?.components);
    const providerComponents = asRecord(providerBreakdown?.components);
    const metricsRecord = asRecord(customerBreakdown?.metrics) ?? asRecord(providerBreakdown?.metrics);
    const workspaceRow = Array.isArray(request.workspaces)
      ? request.workspaces[0] ?? null
      : request.workspaces;
    const workspaceId =
      request.workspace_id ??
      (request.api_key_id ? apiKeyWorkspaceById.get(request.api_key_id) ?? null : null);
    const actorUserId = request.user_id ?? apiKey?.created_by ?? null;
    const actorUser = actorUserId ? userProfileById.get(actorUserId) ?? null : null;
    const requestSource = request.request_source === "playground" ? "playground" : "api";
    const actorName =
      actorUser?.name ??
      (requestSource === "playground" ? "Playground" : null) ??
      (apiKey?.name ? `Key: ${apiKey.name}` : null) ??
      workspaceRow?.name ??
      "未标识调用方";
    const sourceLabel = requestSource === "playground" ? "Playground" : "API";

    const customerCharge = Number(
      request.actual_customer_charge ?? request.actual_cost ?? request.estimated_customer_charge ?? request.estimated_cost ?? 0
    );
    const providerCost = Number(
      request.actual_provider_cost ?? request.estimated_provider_cost ?? 0
    );
    const profit = Number(
      request.actual_profit ??
        request.estimated_profit ??
        customerCharge - providerCost
    );
    const usageBreakdown = Object.entries(metricsRecord ?? {})
      .map(([key, rawValue]) => {
        const value = readNumber(rawValue);
        if (value === null || value <= 0) {
          return null;
        }

        return {
          label: labelBreakdownKey(key),
          value: formatMetricValue(key, value),
        };
      })
      .filter((item) => item !== null);
    const customerComponentBreakdown = Object.entries(customerComponents ?? {})
      .map(([key, rawValue]) => {
        const value = readNumber(rawValue);
        if (value === null || value <= 0) {
          return null;
        }

        return {
          label: labelBreakdownKey(key),
          value: formatCurrency(value),
        };
      })
      .filter((item) => item !== null);
    const providerComponentBreakdown = Object.entries(providerComponents ?? {})
      .map(([key, rawValue]) => {
        const value = readNumber(rawValue);
        if (value === null || value <= 0) {
          return null;
        }

        return {
          label: labelBreakdownKey(key),
          value: formatCurrency(value),
        };
      })
      .filter((item) => item !== null);
    const outputPayloadFromRequest = asRecord(request.output_payload);
    const outputPayloadFromUsage = extractOutputPayloadFromUsageMetadata(usageEvent?.metadata);
    const packagedOutputPayload =
      sanitizeOutputPayloadForCustomer(outputPayloadFromRequest) ??
      sanitizeOutputPayloadForCustomer(outputPayloadFromUsage);
    const upstreamRawPayload =
      outputPayloadFromRequest?.raw ??
      extractUpstreamPayloadFromUsageMetadata(usageEvent?.metadata) ??
      relatedAttempts.find((attempt) => attempt.response_payload)?.response_payload ??
      null;
    const upstreamRawText = formatUnknownJson(upstreamRawPayload) ?? "null";
    const packagedOutputText = formatUnknownJson(packagedOutputPayload) ?? "null";

    return {
      ...request,
      providerName: provider?.name ?? "Unknown provider",
      upstreamModelSlug: providerModel?.upstream_model_slug ?? "unknown",
      customerName: actorName,
      workspaceSlug: workspaceRow?.slug ?? "workspace",
      workspaceId,
      customerUserId: actorUserId,
      customerUserName: actorName,
      actorUserId,
      actorName,
      sourceLabel,
      requestSource,
      apiKeyName: apiKey?.name ?? "Unknown key",
      apiKeyPrefix: apiKey?.key_prefix ?? "unknown",
      apiKeyEnvironment: apiKey?.environment ?? "unknown",
      attemptCount: relatedAttempts.length,
      lastAttempt: relatedAttempts[0] ?? null,
      customerCharge,
      providerCost,
      profit,
      customerChargeLabel: formatCurrency(customerCharge),
      providerCostLabel: formatCurrency(providerCost),
      profitLabel: formatCurrency(profit),
      usageBreakdown,
      customerComponentBreakdown,
      providerComponentBreakdown,
      upstreamRawText,
      packagedOutputText,
      createdLabel: formatRelativeTimestamp(request.created_at),
      completedLabel: formatRelativeTimestamp(request.completed_at),
    };
  };
  const recentRequestSummaries = requests.map(summarizeRequest);
  const registeredUsers = registeredUserBase.map((user) => ({
    ...user,
    recentRequests: [],
  }));

  const providerCredentialSummaries = providerCredentials.map((credential) => {
    const provider = providerById.get(credential.provider_id);

    return {
      ...credential,
      providerName: provider?.name ?? "Unknown provider",
      providerSlug: provider?.slug ?? "unknown",
      secretMask: credential.secret_mask ?? "[secret not set]",
      hasEncryptedSecretMaterial: Boolean(
        credential.secret_ciphertext && credential.secret_iv && credential.secret_auth_tag
      ),
      secretSourceLabel:
        credential.secret_source === "internal_encrypted"
          ? "managed"
          : "legacy external ref",
      metadataText: formatJson(credential.metadata),
      createdLabel: formatRelativeTimestamp(credential.created_at),
      secretUpdatedLabel: formatRelativeTimestamp(credential.secret_last_updated_at),
      runtimeDiagnostics: [
        ...(credential.secret_source !== "internal_encrypted"
          ? ["当前密钥仍是 legacy external ref，worker 不会把它当作可运行的 managed 密钥。"]
          : []),
        ...(!credential.is_active ? [] : !credential.secret_ciphertext || !credential.secret_iv || !credential.secret_auth_tag
          ? ["当前启用密钥缺少可解密的密文字段，worker 无法实际调用。"]
          : []),
      ],
    };
  });

  const auditLogSummaries = adminAuditLogs.map((log) => ({
    ...log,
    detailsText: formatJson(log.details),
    createdLabel: formatRelativeTimestamp(log.created_at),
  }));

  const internalModelAiUsageLogSummaries = internalModelAiUsageLogs.map((log) => ({
    ...log,
    createdLabel: formatRelativeTimestamp(log.created_at),
    estimatedCostUsd: Number(log.estimated_cost_usd ?? 0),
    inputTokens: Number(log.input_tokens ?? 0),
    outputTokens: Number(log.output_tokens ?? 0),
    totalTokens: Number(log.total_tokens ?? 0),
    latencyMs: Number(log.latency_ms ?? 0),
  }));

  const supportedModelSummaries = supportedModels.map((model) => {
    const linkedProviderModels = providerModels.filter(
      (item) => item.supported_model_id === model.id
    );

    return {
      ...model,
      defaultUnitCost: Number(model.default_unit_cost ?? 0),
      billingConfigText: formatJson(model.billing_config),
      billingSummary: summarizeBilling(model.billing_config),
      providerModelCount: linkedProviderModels.length,
      activeProviderModelCount: linkedProviderModels.filter((item) => item.active).length,
      createdLabel: formatRelativeTimestamp(model.created_at),
    };
  });

  const globalMonitoring = {
    videoInflightRequests: [],
    recentVideoRequests: [],
    imageSummary: {
      total: 0,
      inflight: 0,
      succeeded: 0,
      failed: 0,
      cancelled: 0,
    },
    recentImageRequests: [],
  };
  return {
    authorized: true as const,
    user: {
      id: user.id,
      email: user.email ?? null,
      name:
        (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ??
        (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null) ??
        user.email?.split("@")[0] ??
        "OpenOctopus Admin",
    },
    role: role as AdminRole,
    workspace: {
      id: workspaceRelation?.id ?? membership.workspace_id,
      name: workspaceRelation?.name ?? "Workspace",
      slug: workspaceRelation?.slug ?? "workspace",
    },
    metrics: {
      providers: providers.length,
      publicModels: supportedModels.filter((item) => item.active).length,
      providerModels: providerModels.length,
      credentials: providerCredentials.filter((item) => item.is_active).length,
      activeRoutes: routingRules.filter((item) => item.active).length,
      queuedRequests: requests.filter(
        (item) => item.status === "queued" || item.status === "processing"
      ).length,
    },
    providers: providerSummaries,
    modelVendors: modelVendors.map((vendor) => ({
      ...vendor,
      createdLabel: formatRelativeTimestamp(vendor.created_at),
    })),
    workerTemplates: derivedWorkerTemplates.map((worker) => ({
      ...worker,
      display_name: worker.display_name ?? worker.slug,
      createdLabel: formatRelativeTimestamp(worker.created_at),
    })),
    gatewayErrorDefinitions: gatewayErrorDefinitions.map((definition) => ({
      id: definition.id,
      code: definition.code,
      category: definition.category,
      httpStatus: Number(definition.http_status ?? 500),
      publicMessage: definition.public_message,
      retryable: definition.retryable === true,
      active: definition.active === true,
      sortOrder: Number(definition.sort_order ?? 100),
      operatorNotes: definition.operator_notes,
      createdLabel: formatRelativeTimestamp(definition.created_at),
      updatedLabel: formatRelativeTimestamp(definition.updated_at),
    })),
    providerAdapterCatalog: providerAdapterCatalog.map((item) => ({
      ...item,
      createdLabel: formatRelativeTimestamp(item.created_at),
    })),
    providerAdapterAliases: providerAdapterAliases.map((alias) => ({
      ...alias,
      createdLabel: formatRelativeTimestamp(alias.created_at),
    })),
    supportedModels: supportedModelSummaries,
    supportedModelPagination: {
      page: modelPage,
      pageSize: modelPageSize,
      totalCount: supportedModelTotalCount,
      totalPages: Math.max(1, Math.ceil(supportedModelTotalCount / modelPageSize)),
    },
    providerCredentials: providerCredentialSummaries,
    providerModels: providerModelSummaries,
    routingRules: routingRuleSummaries,
    requests: recentRequestSummaries,
    registeredUsers,
    registeredUserPagination: {
      page: userPage,
      pageSize: userPageSize,
      totalCount: registeredUserTotalCount,
      totalPages: Math.max(1, Math.ceil(registeredUserTotalCount / userPageSize)),
      search: userSearch,
    },
    requestPagination: {
      page: requestPage,
      pageSize: requestPageSize,
      totalCount: requestTotalCount,
      totalPages: Math.max(1, Math.ceil(requestTotalCount / requestPageSize)),
    },
    monitoringRequests,
    globalMonitoring,
    auditLogs: auditLogSummaries,
    internalModelAiUsageLogs: internalModelAiUsageLogSummaries,
    internalModelAiUsageLogPagination: {
      page: internalAiUsagePage,
      pageSize: internalAiUsagePageSize,
      totalCount: internalModelAiUsageLogTotalCount,
      totalPages: Math.max(1, Math.ceil(internalModelAiUsageLogTotalCount / internalAiUsagePageSize)),
    },
    requestFilters: {
      customers: Array.from(userProfileById.values())
        .map((profile) => ({
          id: profile.id,
          name: profile.email ? `${profile.name} · ${profile.email}` : profile.name,
          slug: profile.id,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "en-US")),
      apiKeys: Array.from(
        recentRequestSummaries.reduce((map, request) => {
          if (!request.api_key_id) return map;
          if (map.has(request.api_key_id)) return map;
          map.set(request.api_key_id, {
            id: request.api_key_id,
            workspaceId: request.workspaceId ?? "",
            name: request.apiKeyName,
            keyPrefix: request.apiKeyPrefix,
            environment: request.apiKeyEnvironment,
            ownerUserId: request.actorUserId,
            ownerName: request.actorName,
          });
          return map;
        }, new Map<string, { id: string; workspaceId: string; name: string; keyPrefix: string; environment: string; ownerUserId: string | null; ownerName: string }>())
      )
        .map(([, value]) => value)
        .sort((a, b) => a.name.localeCompare(b.name, "en-US")),
    },
  };
}

export async function getInternalUserRequests(input: {
  userId: string;
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.min(Math.max(input.pageSize ?? 10, 1), 50);
  const page = Math.max(Math.floor(input.page ?? 1), 1);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = createAdminClient();

  const membershipResponse = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", input.userId)
    .limit(1)
    .maybeSingle();

  if (membershipResponse.error) {
    throw new Error(membershipResponse.error.message);
  }

  const workspaceId = membershipResponse.data?.workspace_id as string | undefined;
  if (!workspaceId) {
    return {
      rows: [] as InternalUserRequestSummary[],
      pagination: { page, pageSize, totalCount: 0, totalPages: 1 },
    };
  }

  const requestsResponse = await supabase
    .from("inference_requests")
    .select(
      "id, workspace_id, user_id, api_key_id, request_source, capability, public_model_slug, provider_id, provider_model_id, status, estimated_cost, actual_cost, estimated_customer_charge, actual_customer_charge, estimated_provider_cost, actual_provider_cost, estimated_profit, actual_profit, error_code, error_message, output_payload, created_at, started_at, completed_at",
      { count: "exact" }
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (requestsResponse.error) {
    throw new Error(requestsResponse.error.message);
  }

  const requests = (requestsResponse.data ?? []) as RequestRow[];
  const requestIds = requests.map((request) => request.id);
  const apiKeyIds = Array.from(
    new Set(requests.map((request) => request.api_key_id).filter((value): value is string => Boolean(value)))
  );
  const [usageEventsResponse, attemptsResponse, apiKeysResponse] =
    requestIds.length > 0
      ? await Promise.all([
          supabase
            .from("usage_events")
            .select("external_request_id, metadata")
            .in("external_request_id", requestIds),
          supabase
            .from("provider_attempts")
            .select(
              "id, request_id, provider_id, provider_model_id, attempt_no, status, upstream_request_id, upstream_task_id, latency_ms, response_payload, error_message, created_at"
            )
            .in("request_id", requestIds)
            .order("created_at", { ascending: false }),
          apiKeyIds.length > 0
            ? supabase
                .from("api_keys")
                .select("id, workspace_id, created_by, name, key_prefix, environment, status, created_at")
                .in("id", apiKeyIds)
            : Promise.resolve({ data: [], error: null }),
        ])
      : [
          { data: [], error: null },
          { data: [], error: null },
          { data: [], error: null },
        ];

  const usageEvents = (usageEventsResponse.error ? [] : usageEventsResponse.data ?? []) as UsageEventRow[];
  const attempts = (attemptsResponse.error ? [] : attemptsResponse.data ?? []) as AttemptRow[];
  const apiKeys = (apiKeysResponse.error ? [] : apiKeysResponse.data ?? []) as ApiKeyRow[];
  const usageEventByRequestId = new Map(
    usageEvents
      .filter((row) => row.external_request_id)
      .map((row) => [row.external_request_id as string, row])
  );
  const attemptsByRequestId = attempts.reduce((map, attempt) => {
    const list = map.get(attempt.request_id) ?? [];
    list.push(attempt);
    map.set(attempt.request_id, list);
    return map;
  }, new Map<string, AttemptRow[]>());
  const apiKeyById = new Map(apiKeys.map((apiKey) => [apiKey.id, apiKey]));

  return {
    rows: requests.map((request) =>
      summarizeInternalRequest({
        request,
        apiKey: request.api_key_id ? apiKeyById.get(request.api_key_id) ?? null : null,
        attempts: attemptsByRequestId.get(request.id) ?? [],
        usageEvent: usageEventByRequestId.get(request.id) ?? null,
      })
    ),
    pagination: {
      page,
      pageSize,
      totalCount: requestsResponse.count ?? requests.length,
      totalPages: Math.max(1, Math.ceil((requestsResponse.count ?? requests.length) / pageSize)),
    },
  };
}
