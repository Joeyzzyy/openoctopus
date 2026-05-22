import { supabaseAdmin } from "../lib/supabase.js";
import {
  parseBillingConfig,
  resolveBillingBreakdown,
  type BillingResolution,
} from "../lib/billing-config.js";

type SettlementAmounts = {
  customer: BillingResolution;
  provider: BillingResolution;
  estimatedProfit: number;
  actualProfit: number;
};

type ResolveSettlementInput = {
  providerModelId: string;
  publicModelSlug: string;
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
  providerReportedAmount?: number | null;
};

type RecordSettlementInput = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  publicModelSlug: string;
  endpoint: string;
  customerCharge: number;
  providerCost: number;
  statusCode: number;
  breakdown?: Record<string, unknown>;
};

function roundCurrency(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function normalizeReportedAmount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
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

function extractMetricsFromBreakdown(breakdown: Record<string, unknown> | undefined) {
  const directMetrics = asRecord(asRecord(breakdown?.customerBreakdown)?.metrics);
  const nestedMetrics = asRecord(
    asRecord(asRecord(breakdown?.economics)?.customer)?.metrics
  );
  return directMetrics ?? nestedMetrics;
}

function deriveUsageUnitsFromBreakdown(breakdown: Record<string, unknown> | undefined) {
  const metrics = extractMetricsFromBreakdown(breakdown);

  if (!metrics) {
    return { inputUnits: 0, outputUnits: 0 };
  }

  const inputUnits =
    readNumber(metrics.inputCharacters) ??
    readNumber(metrics.inputTokens) ??
    0;

  const outputUnits =
    readNumber(metrics.outputTokens) ??
    readNumber(metrics.imageCount) ??
    readNumber(metrics.videoCount) ??
    readNumber(metrics.durationSeconds) ??
    0;

  return { inputUnits, outputUnits };
}

export async function validateProviderPricing(input: { providerModelId: string }) {
  const { data, error } = await supabaseAdmin
    .from("provider_models")
    .select("pricing")
    .eq("id", input.providerModelId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.pricing) {
    throw new Error("Provider pricing is missing");
  }

  parseBillingConfig(data.pricing);
}

export async function resolveSettlementAmounts(
  input: ResolveSettlementInput
): Promise<SettlementAmounts> {
  const [{ data: supportedModelRow, error: supportedModelError }, { data: providerModelRow, error: providerModelError }] =
    await Promise.all([
      supabaseAdmin
        .from("supported_models")
        .select("billing_config")
        .eq("model_slug", input.publicModelSlug)
        .maybeSingle(),
      supabaseAdmin
        .from("provider_models")
        .select("pricing")
        .eq("id", input.providerModelId)
        .maybeSingle(),
    ]);

  if (supportedModelError) {
    throw new Error(supportedModelError.message);
  }

  if (providerModelError) {
    throw new Error(providerModelError.message);
  }

  if (!supportedModelRow?.billing_config) {
    throw new Error(`Billing config is missing for ${input.publicModelSlug}`);
  }

  if (!providerModelRow?.pricing) {
    throw new Error(`Provider pricing is missing for provider model ${input.providerModelId}`);
  }

  const customerConfig = parseBillingConfig(supportedModelRow.billing_config);
  const providerConfig = parseBillingConfig(providerModelRow.pricing);

  const customer = resolveBillingBreakdown({
    config: customerConfig,
    requestInput: input.requestInput,
    output: input.output,
    providerRaw: input.providerRaw,
  });

  const providerComputed = resolveBillingBreakdown({
    config: providerConfig,
    requestInput: input.requestInput,
    output: input.output,
    providerRaw: input.providerRaw,
  });

  const providerReportedAmount = normalizeReportedAmount(input.providerReportedAmount);
  const provider: BillingResolution = providerReportedAmount
    ? {
        ...providerComputed,
        total: providerReportedAmount,
      }
    : providerComputed;

  const customerTotal = roundCurrency(customer.total);
  const providerTotal = roundCurrency(provider.total);

  return {
    customer: {
      ...customer,
      total: customerTotal,
    },
    provider: {
      ...provider,
      total: providerTotal,
    },
    estimatedProfit: roundCurrency(customerTotal - providerTotal),
    actualProfit: roundCurrency(customerTotal - providerTotal),
  };
}

export async function recordRequestSettlement(input: RecordSettlementInput) {
  const { data: modelRow, error: modelError } = await supabaseAdmin
    .from("supported_models")
    .select("id")
    .eq("model_slug", input.publicModelSlug)
    .maybeSingle();

  if (modelError) {
    throw new Error(modelError.message);
  }

  const usageUnits = deriveUsageUnitsFromBreakdown(input.breakdown);

  const { error } = await supabaseAdmin.rpc("record_request_settlement", {
    p_workspace_id: input.workspaceId,
    p_api_key_id: input.apiKeyId,
    p_model_id: modelRow?.id ?? null,
    p_external_request_id: input.requestId,
    p_endpoint: input.endpoint,
    p_request_count: 1,
    p_input_units: usageUnits.inputUnits,
    p_output_units: usageUnits.outputUnits,
    p_customer_charge: input.customerCharge,
    p_provider_cost: input.providerCost,
    p_status_code: input.statusCode,
    p_metadata: {
      source: "gateway-worker",
      ...(input.breakdown ?? {}),
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
