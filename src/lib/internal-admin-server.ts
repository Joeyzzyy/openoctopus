import "server-only";

import { parseBillingConfig, summarizeBillingConfig } from "@/lib/billing-config";
import { createClient } from "@/lib/supabase/server";

type AdminRole = "owner" | "admin";

type ProviderRow = {
  id: string;
  name: string;
  slug: string;
  kind: "wavespeed" | "partner" | "custom";
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
  api_key_id: string | null;
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
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
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
  error_message: string | null;
  created_at: string;
};

type ApiKeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  environment: string;
  status: string;
  created_at: string;
};

type ApiKeySpendSummaryRow = {
  api_key_id: string;
  workspace_id: string;
  current_month_spend: number | null;
  current_month_requests: number | null;
};

type RequestCostRow = {
  api_key_id: string | null;
  estimated_provider_cost: number | null;
  actual_provider_cost: number | null;
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

function formatJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return "{}";
  }

  return JSON.stringify(value, null, 2);
}

function summarizeBilling(value: Record<string, unknown> | null | undefined) {
  if (!value) {
    return "missing billing config";
  }

  try {
    return summarizeBillingConfig(parseBillingConfig(value));
  } catch {
    return "invalid billing config";
  }
}

function formatRelativeTimestamp(value: string | null) {
  if (!value) {
    return "pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
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
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function getInternalAdminData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, workspaces(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const role = membership?.role as string | undefined;
  const canManage = role === "owner" || role === "admin";

  if (!membership?.workspace_id || !canManage) {
    return {
      authorized: false as const,
      user: {
        id: user.id,
        email: user.email ?? null,
        name:
          user.user_metadata?.full_name ??
          user.user_metadata?.name ??
          user.email?.split("@")[0] ??
          "OpenOctopus Admin",
      },
      workspace: null,
    };
  }

  const workspaceRelation = Array.isArray(membership.workspaces)
    ? membership.workspaces[0]
    : membership.workspaces;
  const currentMonthStart = new Date();
  currentMonthStart.setUTCDate(1);
  currentMonthStart.setUTCHours(0, 0, 0, 0);

  const [
    providersResponse,
    supportedModelsResponse,
    providerCredentialsResponse,
    providerModelsResponse,
    routingRulesResponse,
    requestsResponse,
    apiKeysResponse,
    apiKeySpendSummaryResponse,
    requestCostResponse,
    usageEventsResponse,
    attemptsResponse,
    adminAuditLogsResponse,
  ] =
    await Promise.all([
      supabase
        .from("providers")
        .select(
          "id, name, slug, kind, base_url, status, regions, credentials_ref, config, created_at"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("supported_models")
        .select(
          "id, provider, model_slug, display_name, modality, capability, billing_config, unit_label, default_unit_cost, active, created_at"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("provider_credentials")
        .select(
          "id, provider_id, label, secret_ref, secret_mask, secret_source, secret_last_updated_at, environment, is_active, notes, metadata, created_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("provider_models")
        .select(
          "id, provider_id, supported_model_id, public_model_slug, upstream_model_slug, capability, active, pricing, input_schema, output_schema, created_at"
        )
        .order("created_at", { ascending: true }),
      supabase
        .from("routing_rules")
        .select(
          "id, workspace_id, capability, public_model_slug, primary_provider_model_id, fallback_provider_model_id, route_strategy, active, created_at"
        )
        .or(`workspace_id.eq.${membership.workspace_id},workspace_id.is.null`)
        .order("created_at", { ascending: true }),
      supabase
        .from("inference_requests")
        .select(
          "id, api_key_id, capability, public_model_slug, provider_id, provider_model_id, status, estimated_cost, actual_cost, estimated_customer_charge, actual_customer_charge, estimated_provider_cost, actual_provider_cost, estimated_profit, actual_profit, error_code, error_message, created_at, started_at, completed_at"
        )
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("api_keys")
        .select("id, name, key_prefix, environment, status, created_at")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("v_api_key_spend_summary")
        .select("api_key_id, workspace_id, current_month_spend, current_month_requests")
        .eq("workspace_id", membership.workspace_id),
      supabase
        .from("inference_requests")
        .select("api_key_id, estimated_provider_cost, actual_provider_cost")
        .eq("workspace_id", membership.workspace_id)
        .gte("created_at", currentMonthStart.toISOString()),
      supabase
        .from("usage_events")
        .select("external_request_id, metadata")
        .eq("workspace_id", membership.workspace_id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("provider_attempts")
        .select(
          "id, request_id, provider_id, provider_model_id, attempt_no, status, upstream_request_id, upstream_task_id, latency_ms, error_message, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("admin_audit_logs")
        .select(
          "id, actor_user_id, workspace_id, action, target_type, target_id, summary, details, created_at"
        )
        .or(`workspace_id.eq.${membership.workspace_id},workspace_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(40),
    ]);

  const providers = (providersResponse.error ? [] : providersResponse.data ?? []) as ProviderRow[];
  const supportedModels = (supportedModelsResponse.error
    ? []
    : supportedModelsResponse.data ?? []) as SupportedModelRow[];
  const providerCredentials = (providerCredentialsResponse.error
    ? []
    : providerCredentialsResponse.data ?? []) as ProviderCredentialRow[];
  const providerModels = (providerModelsResponse.error ? [] : providerModelsResponse.data ?? []) as ProviderModelRow[];
  const routingRules = (routingRulesResponse.error ? [] : routingRulesResponse.data ?? []) as RoutingRuleRow[];
  const requests = (requestsResponse.error ? [] : requestsResponse.data ?? []) as RequestRow[];
  const apiKeys = (apiKeysResponse.error ? [] : apiKeysResponse.data ?? []) as ApiKeyRow[];
  const apiKeySpendSummaries = (apiKeySpendSummaryResponse.error
    ? []
    : apiKeySpendSummaryResponse.data ?? []) as ApiKeySpendSummaryRow[];
  const requestCosts = (requestCostResponse.error
    ? []
    : requestCostResponse.data ?? []) as RequestCostRow[];
  const usageEvents = (usageEventsResponse.error
    ? []
    : usageEventsResponse.data ?? []) as UsageEventRow[];
  const attempts = (attemptsResponse.error ? [] : attemptsResponse.data ?? []) as AttemptRow[];
  const adminAuditLogs = (adminAuditLogsResponse.error
    ? []
    : adminAuditLogsResponse.data ?? []) as AdminAuditLogRow[];

  const providerById = new Map(providers.map((row) => [row.id, row]));
  const providerModelById = new Map(providerModels.map((row) => [row.id, row]));
  const supportedModelById = new Map(supportedModels.map((row) => [row.id, row]));
  const apiKeyById = new Map(apiKeys.map((row) => [row.id, row]));
  const apiKeySpendById = new Map(apiKeySpendSummaries.map((row) => [row.api_key_id, row]));
  const usageEventByRequestId = new Map(
    usageEvents
      .filter((row) => row.external_request_id)
      .map((row) => [row.external_request_id as string, row])
  );

  const requestAttempts = new Map<string, AttemptRow[]>();
  for (const attempt of attempts) {
    const list = requestAttempts.get(attempt.request_id) ?? [];
    list.push(attempt);
    requestAttempts.set(attempt.request_id, list);
  }

  const providerSummaries = providers.map((provider) => {
    const models = providerModels.filter((item) => item.provider_id === provider.id);
    const providerRequests = requests.filter((item) => item.provider_id === provider.id);

    return {
      ...provider,
      modelCount: models.length,
      activeModelCount: models.filter((item) => item.active).length,
      credentialCount: providerCredentials.filter((item) => item.provider_id === provider.id).length,
      requestCount: providerRequests.length,
      regionsLabel: (provider.regions ?? []).join(", ") || "global",
      configText: formatJson(provider.config),
    };
  });

  const providerModelSummaries = providerModels.map((providerModel) => {
    const provider = providerById.get(providerModel.provider_id);
    const supportedModel = providerModel.supported_model_id
      ? supportedModelById.get(providerModel.supported_model_id)
      : null;

    return {
      ...providerModel,
      providerName: provider?.name ?? "Unknown provider",
      providerSlug: provider?.slug ?? "unknown",
      supportedModelName: supportedModel?.display_name ?? providerModel.public_model_slug,
      pricingText: formatJson(providerModel.pricing),
      inputSchemaText: formatJson(providerModel.input_schema),
      outputSchemaText: formatJson(providerModel.output_schema),
    };
  });

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
    };
  });

  const recentRequestSummaries = requests.map((request) => {
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

    return {
      ...request,
      providerName: provider?.name ?? "Unknown provider",
      upstreamModelSlug: providerModel?.upstream_model_slug ?? "unknown",
      customerName: workspaceRelation?.name ?? "Workspace",
      workspaceSlug: workspaceRelation?.slug ?? "workspace",
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
      createdLabel: formatRelativeTimestamp(request.created_at),
      completedLabel: formatRelativeTimestamp(request.completed_at),
    };
  });

  const providerCredentialSummaries = providerCredentials.map((credential) => {
    const provider = providerById.get(credential.provider_id);

    return {
      ...credential,
      providerName: provider?.name ?? "Unknown provider",
      providerSlug: provider?.slug ?? "unknown",
      secretMask: credential.secret_mask ?? "[secret not set]",
      secretSourceLabel:
        credential.secret_source === "internal_encrypted"
          ? "managed"
          : "legacy external ref",
      metadataText: formatJson(credential.metadata),
      createdLabel: formatRelativeTimestamp(credential.created_at),
      secretUpdatedLabel: formatRelativeTimestamp(credential.secret_last_updated_at),
    };
  });

  const auditLogSummaries = adminAuditLogs.map((log) => ({
    ...log,
    detailsText: formatJson(log.details),
    createdLabel: formatRelativeTimestamp(log.created_at),
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

  const requestCostByApiKeyId = requestCosts.reduce((map, request) => {
    if (!request.api_key_id) {
      return map;
    }

    map.set(
      request.api_key_id,
      (map.get(request.api_key_id) ?? 0) +
        Number(request.actual_provider_cost ?? request.estimated_provider_cost ?? 0)
    );

    return map;
  }, new Map<string, number>());

  const keyEconomics = apiKeys.map((apiKey) => {
    const spendSummary = apiKeySpendById.get(apiKey.id);
    const cost = requestCostByApiKeyId.get(apiKey.id) ?? 0;
    const revenue = Number(spendSummary?.current_month_spend ?? 0);
    const requestCount = Number(spendSummary?.current_month_requests ?? 0);

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.key_prefix,
      environment: apiKey.environment,
      status: apiKey.status,
      revenue,
      cost,
      profit: revenue - cost,
      requestCount,
      createdLabel: formatRelativeTimestamp(apiKey.created_at),
    };
  });

  return {
    authorized: true as const,
    user: {
      id: user.id,
      email: user.email ?? null,
      name:
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
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
    supportedModels: supportedModelSummaries,
    providerCredentials: providerCredentialSummaries,
    providerModels: providerModelSummaries,
    routingRules: routingRuleSummaries,
    requests: recentRequestSummaries,
    auditLogs: auditLogSummaries,
    requestFilters: {
      customers: [
        {
          id: workspaceRelation?.id ?? membership.workspace_id,
          name: workspaceRelation?.name ?? "Workspace",
          slug: workspaceRelation?.slug ?? "workspace",
        },
      ],
      apiKeys: keyEconomics.map((key) => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        environment: key.environment,
      })),
    },
  };
}
