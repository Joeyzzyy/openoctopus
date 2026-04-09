import { supabaseAdmin } from "../lib/supabase.js";

type RecordUsageInput = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  publicModelSlug: string;
  endpoint: string;
  totalCost: number;
  statusCode: number;
};

export async function recordUsageEvent(input: RecordUsageInput) {
  const { data: modelRow } = await supabaseAdmin
    .from("supported_models")
    .select("id")
    .eq("model_slug", input.publicModelSlug)
    .maybeSingle();

  const { error } = await supabaseAdmin.from("usage_events").insert({
    workspace_id: input.workspaceId,
    api_key_id: input.apiKeyId,
    model_id: modelRow?.id ?? null,
    external_request_id: input.requestId,
    endpoint: input.endpoint,
    request_count: 1,
    total_cost: input.totalCost,
    status_code: input.statusCode,
    metadata: {
      source: "gateway-worker",
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function recordWalletSettlement(input: {
  requestId: string;
  workspaceId: string;
  amount: number;
  description: string;
}) {
  if (input.amount <= 0) {
    return;
  }

  const { error } = await supabaseAdmin.from("wallet_transactions").insert({
    workspace_id: input.workspaceId,
    entry_type: "usage",
    amount_delta: -Math.abs(input.amount),
    description: input.description,
    metadata: {
      source: "gateway-worker",
      request_id: input.requestId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
