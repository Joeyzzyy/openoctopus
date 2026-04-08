import "server-only";

import { createClient } from "@/lib/supabase/server";

type MetricTone = "neutral" | "positive" | "warning";
type BudgetState = "healthy" | "watch" | "critical";
type KeyState = "active" | "warning" | "paused";
type LedgerTone = "positive" | "negative" | "neutral";

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
  apiKeys: Array<{
    name: string;
    prefix: string;
    environment: string;
    budget: string;
    spent: string;
    requests: string;
    lastUsed: string;
    status: KeyState;
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

function buildEmptyDashboard(user: DashboardData["user"], workspace: DashboardData["workspace"]): DashboardData {
  return {
    user,
    workspace,
    metrics: [
      { label: "Available Credit", value: "$0.00", change: "No wallet top-ups yet", tone: "neutral" },
      { label: "Month Spend", value: "$0.00", change: "No usage recorded", tone: "neutral" },
      { label: "Active API Keys", value: "0", change: "Create your first key", tone: "neutral" },
      {
        label: "Budget Remaining",
        value: formatCurrency(workspace?.monthly_budget ?? 0),
        change: "Workspace budget has not been used",
        tone: "positive",
      },
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
  };
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
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

    const [
      { data: keySummary },
      { data: modelSummary },
      { data: dailySpend },
      { data: budgetRows },
      { data: keyRows },
      { data: usageEvents },
      { data: walletRows },
    ] = await Promise.all([
      supabase.from("v_api_key_spend_summary").select("*").eq("workspace_id", workspace.id),
      supabase.from("v_model_spend_summary").select("*").eq("workspace_id", workspace.id).order("total_spend", { ascending: false }),
      supabase.from("v_workspace_daily_spend").select("*").eq("workspace_id", workspace.id).order("usage_day", { ascending: false }).limit(7),
      supabase.from("budget_rules").select("id, scope, monthly_limit, api_key_id, model_id").eq("workspace_id", workspace.id).order("created_at", { ascending: true }),
      supabase.from("api_keys").select("id, name, key_prefix, environment, status, monthly_budget, last_used_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }),
      supabase.from("usage_events").select("id, endpoint, request_count, total_cost, status_code, created_at, api_key_id, model_id").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(8),
      supabase.from("wallet_transactions").select("id, entry_type, amount_delta, description, created_at").eq("workspace_id", workspace.id).order("created_at", { ascending: false }).limit(8),
    ]);

    const currentMonthSpend = (keySummary ?? []).reduce((sum, row) => sum + Number(row.current_month_spend ?? 0), 0);
    const walletBalance = (walletRows ?? []).reduce((sum, row) => sum + Number(row.amount_delta ?? 0), 0);
    const remainingBudget = Math.max(workspace.monthly_budget - currentMonthSpend, 0);
    const activeKeys = (keyRows ?? []).filter((row) => row.status === "active").length;

    const keySummaryMap = new Map((keySummary ?? []).map((row) => [row.api_key_id, row]));
    const keyNameById = new Map((keyRows ?? []).map((row) => [row.id, row.name]));
    const modelRows = modelSummary ?? [];
    const modelNameById = new Map(modelRows.map((row) => [row.model_id, row.display_name]));
    const totalModelSpend = modelRows.reduce((sum, row) => sum + Number(row.total_spend ?? 0), 0);

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

    return {
      user: userView,
      workspace,
      metrics: [
        {
          label: "Available Credit",
          value: formatCurrency(walletBalance),
          change: walletBalance > 0 ? "Wallet has available balance" : "No wallet top-ups yet",
          tone: walletBalance > 0 ? "positive" : "neutral",
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
        {
          label: "Budget Remaining",
          value: formatCurrency(remainingBudget),
          change: `${workspace.currency} workspace monthly cap`,
          tone: remainingBudget > 0 ? "positive" : "warning",
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
      ledgerRows: (walletRows ?? []).map((row) => ({
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
    };
  } catch {
    return buildEmptyDashboard(userView, null);
  }
}
