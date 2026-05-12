import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

type MetricTone = "neutral" | "positive" | "warning";
type BudgetState = "healthy" | "watch" | "critical";
type KeyState = "active" | "warning" | "paused";
type LedgerTone = "positive" | "negative" | "neutral";
type ProviderState = "healthy" | "degraded" | "offline";
type RequestState = "queued" | "processing" | "succeeded" | "failed" | "cancelled";

type DashboardDataOptions = {
  requestsPage?: number;
  requestsApiKeyId?: string | null;
  analyticsLookbackMs?: number;
  analyticsApiKeyId?: string | null;
};

type AnalyticsRequestRow = {
  id: string;
  api_key_id: string | null;
  public_model_slug: string;
  status: string;
  actual_cost: number | null;
  estimated_cost: number | null;
  created_at: string;
};

export type DashboardData = {
  user: {
    id: string;
    email: string | null;
    name: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    monthly_budget: number;
  } | null;
  metrics: Array<{
    label: string;
    value: string;
    change: string;
    tone: MetricTone;
  }>;
  spendTrend: Array<{
    day: string;
    spend: number;
  }>;
  modelSpend: Array<{
    model: string;
    provider: string;
    spend: string;
    share: number;
    requests: string;
  }>;
  budgetRules: Array<{
    scope: string;
    limit: string;
    used: string;
    progress: number;
    state: BudgetState;
  }>;
  workspaceId: string | null;
  apiKeys: Array<{
    id: string;
    name: string;
    prefix: string;
    environment: string;
    budget: string;
    spent: string;
    requests: string;
    lastUsed: string;
    status: KeyState;
    rawStatus: string;
    monthlyBudget: number;
  }>;
  usageRows: Array<{
    time: string;
    apiKey: string;
    model: string;
    endpoint: string;
    units: string;
    cost: string;
    status: string;
  }>;
  ledgerRows: Array<{
    title: string;
    detail: string;
    amount: string;
    tone: LedgerTone;
  }>;
  billingRows: Array<{
    id: string;
    createdAtLabel: string;
    typeLabel: string;
    amountValue: number;
    amountLabel: string;
    description: string;
    stripeSessionId: string | null;
    receiptUrl: string | null;
    invoiceUrl: string | null;
  }>;
  providerSummaries: Array<{
    name: string;
    kind: string;
    regions: string;
    models: number;
    queue: string;
    status: ProviderState;
  }>;
  routingRules: Array<{
    capability: string;
    publicModel: string;
    providerName: string;
    providerKind: string;
    upstreamModelSlug: string;
    primary: string;
    fallback: string;
    strategy: string;
  }>;
  modelCatalogRows: Array<{
    id: string;
    publicModel: string;
    providerName: string;
    providerKind: string;
    upstreamModelSlug: string;
    capability: string;
    strategy: string;
    primary: string;
    fallback: string;
  }>;
  requestFilters: {
    apiKeys: Array<{
      id: string;
      name: string;
      prefix: string;
      environment: string;
    }>;
  };
  analyticsRequests: Array<{
    id: string;
    apiKeyId: string | null;
    apiKeyName: string;
    model: string;
    status: string;
    createdAt: string;
    costValue: number;
  }>;
  requestPagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  requestQueueRows: Array<{
    requestId: string;
    createdAtLabel: string;
    apiKeyId: string | null;
    apiKeyName: string;
    capability: string;
    model: string;
    provider: string;
    status: RequestState;
    latency: string;
    cost: string;
  }>;
};

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatCompactNumber(value: number | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchAnalyticsRequests(
  supabase:
    | Awaited<ReturnType<typeof createClient>>
    | ReturnType<typeof createAdminClient>,
  input: {
    workspaceId: string;
    apiKeyId?: string | null;
    lookbackMs: number;
  }
) {
  const batchSize = 5000;
  const maxBatches = 20;
  const sinceIso = new Date(Date.now() - input.lookbackMs).toISOString();
  const rows: AnalyticsRequestRow[] = [];

  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
    const from = batchIndex * batchSize;
    const to = from + batchSize - 1;
    let query = supabase
      .from("inference_requests")
      .select(
        "id, api_key_id, public_model_slug, status, actual_cost, estimated_cost, created_at"
      )
      .eq("workspace_id", input.workspaceId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (input.apiKeyId) {
      query = query.eq("api_key_id", input.apiKeyId);
    }

    const response = await query;
    if (response.error) {
      break;
    }

    const batchRows = (response.data ?? []) as AnalyticsRequestRow[];
    rows.push(...batchRows);

    if (batchRows.length < batchSize) {
      break;
    }
  }

  return rows;
}

function buildEmptyDashboard(user: DashboardData["user"], workspace: DashboardData["workspace"]): DashboardData {
  return {
    user,
    workspace,
    workspaceId: workspace?.id ?? null,
    metrics: [
      {
        label: "Wallet Balance",
        value: "$0.00",
        change: "No wallet top-ups yet",
        tone: "neutral",
      },
      { label: "Total Top-Ups", value: "$0.00", change: "No recharge recorded", tone: "neutral" },
      { label: "Month Spend", value: "$0.00", change: "No usage recorded", tone: "neutral" },
      { label: "Active API Keys", value: "0", change: "Create your first key", tone: "neutral" },
    ],
    spendTrend: [
      { day: "Mon", spend: 0 },
      { day: "Tue", spend: 0 },
      { day: "Wed", spend: 0 },
      { day: "Thu", spend: 0 },
      { day: "Fri", spend: 0 },
      { day: "Sat", spend: 0 },
      { day: "Sun", spend: 0 },
    ],
    modelSpend: [],
    budgetRules: workspace
      ? [
          {
            scope: "Workspace Monthly Cap",
            limit: formatCurrency(workspace.monthly_budget ?? 0),
            used: "$0.00",
            progress: 0,
            state: "healthy",
          },
        ]
      : [],
    apiKeys: [],
    usageRows: [],
    ledgerRows: [],
    billingRows: [],
    providerSummaries: [],
    routingRules: [],
    modelCatalogRows: [],
    requestFilters: {
      apiKeys: [],
    },
    analyticsRequests: [],
    requestPagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 1,
    },
    requestQueueRows: [],
  };
}

async function buildStripeBillingLinkMap(paymentIntentIds: string[]) {
  const uniqueIds = Array.from(new Set(paymentIntentIds.filter((id) => id.length > 0)));
  if (uniqueIds.length === 0) {
    return new Map<string, { receiptUrl: string | null; invoiceUrl: string | null }>();
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return new Map<string, { receiptUrl: string | null; invoiceUrl: string | null }>();
  }

  const stripe = new Stripe(stripeSecretKey);
  const billingLinksByPaymentIntentId = new Map<
    string,
    { receiptUrl: string | null; invoiceUrl: string | null }
  >();

  for (const paymentIntentId of uniqueIds) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge", "invoice"],
      });

      let receiptUrl: string | null = null;
      let invoiceUrl: string | null = null;
      const latestCharge = paymentIntent.latest_charge;
      if (latestCharge && typeof latestCharge !== "string" && latestCharge.receipt_url) {
        receiptUrl = latestCharge.receipt_url;
      }

      const paymentIntentLike = paymentIntent as unknown as {
        invoice?: unknown;
      };
      const invoice = paymentIntentLike.invoice;
      if (invoice && typeof invoice === "object") {
        const invoiceLike = invoice as { hosted_invoice_url?: unknown; invoice_pdf?: unknown };
        invoiceUrl =
          (typeof invoiceLike.hosted_invoice_url === "string" && invoiceLike.hosted_invoice_url.length > 0
            ? invoiceLike.hosted_invoice_url
            : null) ??
          (typeof invoiceLike.invoice_pdf === "string" && invoiceLike.invoice_pdf.length > 0
            ? invoiceLike.invoice_pdf
            : null);
      }

      billingLinksByPaymentIntentId.set(paymentIntentId, {
        receiptUrl,
        invoiceUrl,
      });
    } catch {
      continue;
    }
  }

  return billingLinksByPaymentIntentId;
}

async function buildStripeInvoiceUrlMap(invoiceIds: string[]) {
  const uniqueIds = Array.from(new Set(invoiceIds.filter((id) => id.length > 0)));
  if (uniqueIds.length === 0) {
    return new Map<string, string>();
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return new Map<string, string>();
  }

  const stripe = new Stripe(stripeSecretKey);
  const invoiceUrlById = new Map<string, string>();

  for (const invoiceId of uniqueIds) {
    try {
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const url = invoice.hosted_invoice_url ?? invoice.invoice_pdf ?? null;
      if (url) {
        invoiceUrlById.set(invoiceId, url);
      }
    } catch {
      continue;
    }
  }

  return invoiceUrlById;
}

export async function getDashboardData({
  requestsPage = 1,
  requestsApiKeyId = null,
  analyticsLookbackMs = 24 * 60 * 60 * 1000,
  analyticsApiKeyId = null,
}: DashboardDataOptions = {}): Promise<DashboardData | null> {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const userView = {
    id: user.id,
    email: user.email ?? null,
    name:
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "OpenOctopus User",
  };

  try {
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership?.workspace_id) {
      return buildEmptyDashboard(userView, null);
    }

    const { data: workspaceRow } = await supabase
      .from("workspaces")
      .select("id, name, slug, currency, monthly_budget")
      .eq("id", membership.workspace_id)
      .maybeSingle();

    if (!workspaceRow) {
      return buildEmptyDashboard(userView, null);
    }

    const workspace = {
      id: workspaceRow.id,
      name: workspaceRow.name,
      slug: workspaceRow.slug,
      currency: workspaceRow.currency,
      monthly_budget: Number(workspaceRow.monthly_budget ?? 0),
    };

    const pageSize = 10;
    const normalizedRequestsPage = Math.max(1, Math.floor(requestsPage));
    const requestFrom = (normalizedRequestsPage - 1) * pageSize;
    const requestTo = requestFrom + pageSize - 1;

    const [
      { data: keySummary },
      { data: modelSummary },
      { data: dailySpend },
      { data: budgetRows },
      { data: keyRows },
      { data: usageEvents },
      { data: walletSummaryRows },
      { data: walletLedgerRows },
      providerResponse,
      providerModelResponse,
      supportedModelResponse,
      routingRuleResponse,
    ] = await Promise.all([
      supabaseAdmin.from("v_api_key_spend_summary").select("*").eq("workspace_id", workspace.id),
      supabaseAdmin.from("v_model_spend_summary").select("*").eq("workspace_id", workspace.id).order("total_spend", { ascending: false }),
      supabaseAdmin.from("v_workspace_daily_spend").select("*").eq("workspace_id", workspace.id).order("usage_day", { ascending: false }).limit(7),
      supabaseAdmin.from("budget_rules").select("id, scope, monthly_limit, api_key_id, model_id").eq("workspace_id", workspace.id).order("created_at", { ascending: true }),
      supabaseAdmin.from("api_keys").select("id, name, key_prefix, environment, status, monthly_budget, last_used_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
      supabaseAdmin.from("usage_events").select("id, endpoint, request_count, total_cost, status_code, created_at, api_key_id, model_id").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(8),
      supabaseAdmin.from("wallet_transactions").select("amount_delta").eq("workspace_id", workspace.id),
      supabaseAdmin.from("wallet_transactions").select("id, entry_type, amount_delta, description, created_at, metadata").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("providers").select("id, name, regions, status"),
      supabaseAdmin
        .from("provider_models")
        .select("id, provider_id, upstream_model_slug, public_model_slug, supported_model_id, capability, active"),
      supabaseAdmin
        .from("supported_models")
        .select("id, model_slug, display_name, capability, active"),
      supabaseAdmin.from("routing_rules").select("id, capability, public_model_slug, primary_provider_model_id, fallback_provider_model_id, route_strategy").or(`workspace_id.eq.${workspace.id},workspace_id.is.null`).eq("active", true).order("created_at", { ascending: true }),
    ]);

    const keyIdSet = new Set((keyRows ?? []).map((row) => row.id));
    const safeRequestsApiKeyId =
      requestsApiKeyId && keyIdSet.has(requestsApiKeyId) ? requestsApiKeyId : null;
    const safeAnalyticsApiKeyId =
      analyticsApiKeyId && keyIdSet.has(analyticsApiKeyId) ? analyticsApiKeyId : null;

    const [requestResponse, analyticsRequestRows] = await Promise.all([
      (() => {
        let query = supabaseAdmin
          .from("inference_requests")
          .select(
            "id, api_key_id, capability, public_model_slug, provider_id, status, estimated_cost, actual_cost, created_at, queued_at, started_at, completed_at",
            { count: "exact" }
          )
          .eq("workspace_id", workspace.id)
          .order("created_at", { ascending: false })
          .range(requestFrom, requestTo);

        if (safeRequestsApiKeyId) {
          query = query.eq("api_key_id", safeRequestsApiKeyId);
        }

        return query;
      })(),
      fetchAnalyticsRequests(supabaseAdmin, {
        workspaceId: workspace.id,
        apiKeyId: safeAnalyticsApiKeyId,
        lookbackMs: analyticsLookbackMs,
      }),
    ]);

    const currentMonthSpend = (keySummary ?? []).reduce((sum, row) => sum + Number(row.current_month_spend ?? 0), 0);
    const walletBalance = (walletSummaryRows ?? []).reduce((sum, row) => sum + Number(row.amount_delta ?? 0), 0);
    const totalTopUps = (walletSummaryRows ?? []).reduce((sum, row) => {
      const delta = Number(row.amount_delta ?? 0);
      return delta > 0 ? sum + delta : sum;
    }, 0);
    const activeKeys = (keyRows ?? []).filter((row) => row.status === "active").length;

    const keySummaryMap = new Map((keySummary ?? []).map((row) => [row.api_key_id, row]));
    const keyNameById = new Map((keyRows ?? []).map((row) => [row.id, row.name]));
    const modelRows = modelSummary ?? [];
    const modelNameById = new Map(modelRows.map((row) => [row.model_id, row.display_name]));
    const totalModelSpend = modelRows.reduce((sum, row) => sum + Number(row.total_spend ?? 0), 0);
    const providers = providerResponse.error ? [] : providerResponse.data ?? [];
    const providerModels = providerModelResponse.error ? [] : providerModelResponse.data ?? [];
    const supportedModels = supportedModelResponse.error ? [] : supportedModelResponse.data ?? [];
    const routingRuleRows = routingRuleResponse.error ? [] : routingRuleResponse.data ?? [];
    const requestRows = requestResponse.error ? [] : requestResponse.data ?? [];
    const requestTotal = requestResponse.error ? 0 : requestResponse.count ?? 0;
    const analyticsRows = analyticsRequestRows ?? [];
    const providerNameById = new Map(providers.map((row) => [row.id, row.name]));
    const providerById = new Map(providers.map((row) => [row.id, row]));
    const providerModelById = new Map(providerModels.map((row) => [row.id, row]));
    const modelsPerProvider = providerModels.reduce((acc, row) => {
      acc.set(row.provider_id, (acc.get(row.provider_id) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());
    const queuePerProvider = requestRows.reduce((acc, row) => {
      if (!row.provider_id || (row.status !== "queued" && row.status !== "processing")) {
        return acc;
      }

      acc.set(row.provider_id, (acc.get(row.provider_id) ?? 0) + 1);
      return acc;
    }, new Map<string, number>());

    const stripePaymentIntentIds = (walletLedgerRows ?? [])
      .map((row) => {
        const metadata = (row as { metadata?: Record<string, unknown> }).metadata;
        const paymentIntentId = metadata?.stripe_payment_intent_id;
        return typeof paymentIntentId === "string" ? paymentIntentId : "";
      })
      .filter((id) => id.length > 0);
    const stripeInvoiceIds = (walletLedgerRows ?? [])
      .map((row) => {
        const metadata = (row as { metadata?: Record<string, unknown> }).metadata;
        const invoiceId = metadata?.stripe_invoice_id;
        return typeof invoiceId === "string" ? invoiceId : "";
      })
      .filter((id) => id.length > 0);
    const billingLinksByPaymentIntentId = await buildStripeBillingLinkMap(stripePaymentIntentIds);
    const invoiceUrlById = await buildStripeInvoiceUrlMap(stripeInvoiceIds);

    const spendTrend = Array.from({ length: 7 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const dayKey = date.toISOString().slice(0, 10);
      const row = (dailySpend ?? []).find(
        (item) => new Date(item.usage_day).toISOString().slice(0, 10) === dayKey
      );

      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        spend: Number(row?.total_spend ?? 0),
      };
    });

    const providerSummaries = providers.map((provider) => ({
      name: provider.name,
      kind:
        (provider as { kind?: string }).kind === "wavespeed"
          ? "Primary upstream"
          : (provider as { kind?: string }).kind === "partner"
            ? "Fallback upstream"
            : "Custom upstream",
      regions: Array.isArray(provider.regions) && provider.regions.length > 0 ? provider.regions.join(" · ") : "unassigned",
      models: modelsPerProvider.get(provider.id) ?? 0,
      queue: `${queuePerProvider.get(provider.id) ?? 0} queued`,
      status: provider.status as ProviderState,
    }));

    const routingRules = routingRuleRows.map((row) => {
      const primaryProviderModel = row.primary_provider_model_id
        ? providerModelById.get(row.primary_provider_model_id)
        : null;
      const fallbackProviderModel = row.fallback_provider_model_id
        ? providerModelById.get(row.fallback_provider_model_id)
        : null;

      return {
        capability: row.capability.replaceAll("_", " "),
        publicModel: row.public_model_slug,
        providerName: primaryProviderModel
          ? providerNameById.get(primaryProviderModel.provider_id) ?? "Unknown provider"
          : "Unassigned",
        providerKind: primaryProviderModel
          ? (providerById.get(primaryProviderModel.provider_id) as { kind?: string } | undefined)
              ?.kind ?? "custom"
          : "custom",
        upstreamModelSlug: primaryProviderModel?.upstream_model_slug ?? row.public_model_slug,
        primary: primaryProviderModel
          ? `${providerNameById.get(primaryProviderModel.provider_id) ?? "Unknown provider"} / ${primaryProviderModel.upstream_model_slug}`
          : "unassigned",
        fallback: fallbackProviderModel
          ? `${providerNameById.get(fallbackProviderModel.provider_id) ?? "Unknown provider"} / ${fallbackProviderModel.upstream_model_slug}`
          : "manual failover only",
        strategy: row.route_strategy.replaceAll("_", " "),
      };
    });

    const firstRouteByPublicModel = new Map<string, (typeof routingRules)[number]>();
    for (const route of routingRules) {
      if (!firstRouteByPublicModel.has(route.publicModel)) {
        firstRouteByPublicModel.set(route.publicModel, route);
      }
    }
    const providerModelsByPublicModel = providerModels.reduce((map, row) => {
      if (!row.active) {
        return map;
      }

      const list = map.get(row.public_model_slug) ?? [];
      list.push(row);
      map.set(row.public_model_slug, list);
      return map;
    }, new Map<string, typeof providerModels>());

    const modelCatalogRows = supportedModels
      .filter((item) => item.active)
      .map((model, index) => {
        const route = firstRouteByPublicModel.get(model.model_slug) ?? null;
        const linkedProviderModels = providerModelsByPublicModel.get(model.model_slug) ?? [];
        const primaryProviderModel = linkedProviderModels[0] ?? null;
        const primaryProvider = primaryProviderModel
          ? providerById.get(primaryProviderModel.provider_id) ?? null
          : null;

        return {
          id: `${model.id}-${index}`,
          publicModel: model.model_slug,
          providerName: route
            ? route.providerName
            : primaryProvider?.name ?? "Unassigned",
          providerKind: route
            ? route.providerKind
            : (primaryProvider as { kind?: string } | null)?.kind ?? "custom",
          upstreamModelSlug: route
            ? route.upstreamModelSlug
            : primaryProviderModel?.upstream_model_slug ?? "-",
          capability: model.capability ? model.capability.replaceAll("_", " ") : "unknown",
          strategy: route ? route.strategy : "not routed",
          primary: route
            ? route.primary
            : linkedProviderModels.length > 0
              ? linkedProviderModels
                  .map((item) => {
                    const providerName = providerNameById.get(item.provider_id) ?? "Unknown provider";
                    return `${providerName} / ${item.upstream_model_slug}`;
                  })
                  .join(" | ")
              : "unassigned",
          fallback: route ? route.fallback : "manual failover only",
        };
      });

    const requestQueueRows = requestRows.map((row) => {
      const startedAt = row.started_at ? new Date(row.started_at).getTime() : null;
      const completedAt = row.completed_at ? new Date(row.completed_at).getTime() : null;
      const queuedAt = row.queued_at ? new Date(row.queued_at).getTime() : new Date(row.created_at).getTime();

      let latency = "pending";
      if (startedAt && completedAt && completedAt >= startedAt) {
        latency = `${Math.round((completedAt - startedAt) / 1000)}s`;
      } else if (startedAt) {
        latency = `${Math.max(1, Math.round((Date.now() - startedAt) / 1000))}s`;
      } else if (queuedAt) {
        latency = "queueing";
      }

      const costValue = Number(row.actual_cost ?? row.estimated_cost ?? 0);

      return {
        requestId: row.id,
        createdAtLabel: formatTimestamp(row.created_at),
        apiKeyId: row.api_key_id ?? null,
        apiKeyName: row.api_key_id ? keyNameById.get(row.api_key_id) ?? "Unknown key" : "No key",
        capability: row.capability,
        model: row.public_model_slug,
        provider: row.provider_id ? providerNameById.get(row.provider_id) ?? "Unknown provider" : "Unrouted",
        status:
          row.status === "queued" || row.status === "processing" || row.status === "succeeded" || row.status === "failed"
            ? (row.status as RequestState)
            : row.status === "submitted"
              ? "processing"
              : "failed",
        latency,
        cost: costValue > 0 ? formatCurrency(costValue) : "pending",
      };
    });

    return {
      user: userView,
      workspace,
      workspaceId: workspace.id,
      metrics: [
        {
          label: "Wallet Balance",
          value: formatCurrency(walletBalance),
          change: walletBalance > 0 ? "Available to spend right now" : "No wallet top-ups yet",
          tone: walletBalance > 0 ? "positive" : "neutral",
        },
        {
          label: "Total Top-Ups",
          value: formatCurrency(totalTopUps),
          change: totalTopUps > 0 ? "Total recharge recorded in wallet" : "No recharge recorded",
          tone: totalTopUps > 0 ? "positive" : "neutral",
        },
        {
          label: "Month Spend",
          value: formatCurrency(currentMonthSpend),
          change: currentMonthSpend > 0 ? "Real usage synced from Supabase" : "No usage recorded",
          tone: currentMonthSpend > 0 ? "warning" : "neutral",
        },
        {
          label: "Active API Keys",
          value: String(activeKeys),
          change: activeKeys > 0 ? `${activeKeys} key(s) currently active` : "Create your first key",
          tone: activeKeys > 0 ? "positive" : "neutral",
        },
      ],
      spendTrend,
      modelSpend: modelRows.slice(0, 5).map((row) => {
        const spend = Number(row.total_spend ?? 0);
        return {
          model: row.display_name ?? "Unknown model",
          provider: row.provider ?? "Unknown provider",
          spend: formatCurrency(spend),
          share: totalModelSpend > 0 ? Number(((spend / totalModelSpend) * 100).toFixed(0)) : 0,
          requests: `${formatCompactNumber(Number(row.total_requests ?? 0))} req`,
        };
      }),
      budgetRules: (budgetRows ?? []).map((row) => {
        const used =
          row.scope === "api_key" && row.api_key_id
            ? Number(keySummaryMap.get(row.api_key_id)?.current_month_spend ?? 0)
            : currentMonthSpend;
        const limit = Number(row.monthly_limit ?? 0);
        const progress = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

        return {
          scope:
            row.scope === "api_key"
              ? `Key Budget / ${keyNameById.get(row.api_key_id) ?? "unknown"}`
              : row.scope === "model"
                ? `Model Budget / ${modelNameById.get(row.model_id) ?? "unknown"}`
                : "Workspace Monthly Cap",
          limit: formatCurrency(limit),
          used: formatCurrency(used),
          progress: Number(progress.toFixed(1)),
          state: progress >= 80 ? "critical" : progress >= 50 ? "watch" : "healthy",
        };
      }),
      apiKeys: (keyRows ?? []).map((row) => {
        const summary = keySummaryMap.get(row.id);
        const spent = Number(summary?.current_month_spend ?? 0);
        const budget = Number(row.monthly_budget ?? 0);
        const usagePct = budget > 0 ? (spent / budget) * 100 : 0;

        return {
          id: row.id,
          name: row.name,
          prefix: row.key_prefix,
          environment: row.environment,
          budget: formatCurrency(budget),
          spent: formatCurrency(spent),
          requests: formatCompactNumber(Number(summary?.current_month_requests ?? 0)),
          lastUsed: row.last_used_at
            ? new Date(row.last_used_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "never",
          status:
            row.status === "paused" || row.status === "revoked"
              ? "paused"
              : usagePct >= 80
                ? "warning"
                : "active",
          rawStatus: row.status as string,
          monthlyBudget: budget,
        };
      }),
      usageRows: (usageEvents ?? []).map((row) => ({
        time: new Date(row.created_at).toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        apiKey: keyNameById.get(row.api_key_id) ?? "unknown",
        model: modelNameById.get(row.model_id) ?? "unknown",
        endpoint: row.endpoint,
        units: `${formatCompactNumber(Number(row.request_count ?? 0))} req`,
        cost: formatCurrency(Number(row.total_cost ?? 0)),
        status: row.status_code ? String(row.status_code) : "n/a",
      })),
      ledgerRows: (walletLedgerRows ?? []).map((row) => ({
        title:
          row.entry_type === "topup"
            ? "Wallet top-up"
            : row.entry_type === "refund"
              ? "Refund"
              : row.entry_type === "adjustment"
                ? "Adjustment"
                : "Usage settlement",
        detail: row.description,
        amount: `${Number(row.amount_delta) >= 0 ? "+" : ""}${formatCurrency(Number(row.amount_delta ?? 0))}`,
        tone:
          Number(row.amount_delta ?? 0) > 0
            ? "positive"
            : Number(row.amount_delta ?? 0) < 0
              ? "negative"
            : "neutral",
      })),
      billingRows: (walletLedgerRows ?? []).map((row) => {
        const metadata = (row as { metadata?: Record<string, unknown> }).metadata;
        const stripeSessionId =
          metadata && typeof metadata.stripe_checkout_session_id === "string"
            ? metadata.stripe_checkout_session_id
            : null;
        const stripePaymentIntentId =
          metadata && typeof metadata.stripe_payment_intent_id === "string"
            ? metadata.stripe_payment_intent_id
            : null;
        const stripeInvoiceId =
          metadata && typeof metadata.stripe_invoice_id === "string"
            ? metadata.stripe_invoice_id
            : null;

        return {
          id: row.id,
          createdAtLabel: formatTimestamp(row.created_at),
          typeLabel:
            row.entry_type === "topup"
              ? "Top-up (Credit)"
              : row.entry_type === "refund"
                ? "Refund"
              : row.entry_type === "adjustment"
                  ? Number(row.amount_delta ?? 0) < 0
                    ? "Adjustment (Debit)"
                    : "Adjustment (Credit)"
                  : Number(row.amount_delta ?? 0) < 0
                    ? "Usage Charge"
                    : "Settlement Credit",
          amountValue: Number(row.amount_delta ?? 0),
          amountLabel: `${Number(row.amount_delta) >= 0 ? "+" : ""}${formatCurrency(Number(row.amount_delta ?? 0))}`,
          description: "Balance Topup Through Stripe",
          stripeSessionId,
          receiptUrl: stripePaymentIntentId
            ? (billingLinksByPaymentIntentId.get(stripePaymentIntentId)?.receiptUrl ?? null)
            : null,
          invoiceUrl:
            (stripeInvoiceId ? invoiceUrlById.get(stripeInvoiceId) ?? null : null) ??
            (stripePaymentIntentId
              ? (billingLinksByPaymentIntentId.get(stripePaymentIntentId)?.invoiceUrl ?? null)
              : null),
        };
      }),
      providerSummaries,
      routingRules,
      modelCatalogRows,
      requestFilters: {
        apiKeys: (keyRows ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          prefix: row.key_prefix,
          environment: row.environment,
        })),
      },
      analyticsRequests: analyticsRows.map((row) => ({
        id: row.id,
        apiKeyId: row.api_key_id ?? null,
        apiKeyName: row.api_key_id ? keyNameById.get(row.api_key_id) ?? "Unknown key" : "No key",
        model: row.public_model_slug,
        status: row.status,
        createdAt: row.created_at,
        costValue: Number(row.actual_cost ?? row.estimated_cost ?? 0),
      })),
      requestPagination: {
        page: normalizedRequestsPage,
        pageSize,
        total: requestTotal,
        totalPages: Math.max(1, Math.ceil(requestTotal / pageSize)),
      },
      requestQueueRows,
    };
  } catch {
    return buildEmptyDashboard(userView, null);
  }
}
