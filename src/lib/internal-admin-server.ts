import "server-only";

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
  capability: string;
  public_model_slug: string;
  provider_id: string | null;
  provider_model_id: string | null;
  status: string;
  estimated_cost: number | null;
  actual_cost: number | null;
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

  const [
    providersResponse,
    supportedModelsResponse,
    providerCredentialsResponse,
    providerModelsResponse,
    routingRulesResponse,
    requestsResponse,
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
          "id, provider, model_slug, display_name, modality, capability, unit_label, default_unit_cost, active, created_at"
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
          "id, capability, public_model_slug, provider_id, provider_model_id, status, estimated_cost, actual_cost, error_code, error_message, created_at, started_at, completed_at"
        )
        .order("created_at", { ascending: false })
        .limit(20),
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
  const attempts = (attemptsResponse.error ? [] : attemptsResponse.data ?? []) as AttemptRow[];
  const adminAuditLogs = (adminAuditLogsResponse.error
    ? []
    : adminAuditLogsResponse.data ?? []) as AdminAuditLogRow[];

  const providerById = new Map(providers.map((row) => [row.id, row]));
  const providerModelById = new Map(providerModels.map((row) => [row.id, row]));
  const supportedModelById = new Map(supportedModels.map((row) => [row.id, row]));

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
    const relatedAttempts = requestAttempts.get(request.id) ?? [];

    return {
      ...request,
      providerName: provider?.name ?? "Unknown provider",
      upstreamModelSlug: providerModel?.upstream_model_slug ?? "unknown",
      attemptCount: relatedAttempts.length,
      lastAttempt: relatedAttempts[0] ?? null,
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
      providerModelCount: linkedProviderModels.length,
      activeProviderModelCount: linkedProviderModels.filter((item) => item.active).length,
      createdLabel: formatRelativeTimestamp(model.created_at),
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
  };
}
