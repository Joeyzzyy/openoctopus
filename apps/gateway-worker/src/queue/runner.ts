import { supabaseAdmin } from "../lib/supabase.js";
import { decryptProviderSecret } from "../lib/provider-secret-crypto.js";
import { getProviderAdapter } from "../providers/index.js";
import { persistGeneratedAssets } from "../services/assets-service.js";
import {
  recordRequestSettlement,
  resolveSettlementAmounts,
} from "../services/billing-service.js";

type QueueMessage = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  providerModelId: string;
  credentialId: string;
  providerSlug: string;
  providerBaseUrl: string | null;
  providerConfig: Record<string, unknown> | null;
  capability: "image_generation" | "video_generation";
  publicModelSlug: string;
  upstreamModelSlug: string;
  endpoint: string;
  prompt?: string;
  input: Record<string, unknown>;
};

type PollingMessage = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  providerModelId: string;
  credentialId: string;
  providerSlug: string;
  providerBaseUrl: string | null;
  providerConfig: Record<string, unknown> | null;
  capability: "image_generation" | "video_generation";
  publicModelSlug: string;
  upstreamModelSlug: string;
  endpoint: string;
  input: Record<string, unknown>;
  upstreamTaskId: string;
};

type QueueEnvelope = {
  msg_id: number;
  message: unknown;
};

function normalizeQueueRows(data: unknown): QueueEnvelope[] {
  if (!Array.isArray(data)) {
    return [];
  }

  return data.filter(
    (row): row is QueueEnvelope =>
      typeof row === "object" &&
      row !== null &&
      "msg_id" in row &&
      "message" in row
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumericCandidate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function getNestedNumber(source: Record<string, unknown> | null, path: string[]) {
  let current: unknown = source;

  for (const key of path) {
    const record = asRecord(current);
    if (!record || !(key in record)) {
      return null;
    }
    current = record[key];
  }

  return readNumericCandidate(current);
}

function resolveVideoDurationSeconds(input: {
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}) {
  const requestInput = input.requestInput ?? null;
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;

  return (
    readNumericCandidate(requestInput?.durationSeconds) ??
    readNumericCandidate(requestInput?.duration_seconds) ??
    readNumericCandidate(requestInput?.duration) ??
    getNestedNumber(output, ["durationSeconds"]) ??
    getNestedNumber(output, ["duration_seconds"]) ??
    getNestedNumber(providerRaw, ["durationSeconds"]) ??
    getNestedNumber(providerRaw, ["duration_seconds"]) ??
    null
  );
}

function withNormalizedVideoDuration(input: {
  capability: "image_generation" | "video_generation";
  requestInput?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  providerRaw?: Record<string, unknown> | null;
}) {
  const output = input.output ?? null;
  const providerRaw = input.providerRaw ?? null;

  if (input.capability !== "video_generation" || !output) {
    return {
      output,
      providerRaw,
    };
  }

  const durationSeconds = resolveVideoDurationSeconds(input);
  if (durationSeconds === null) {
    return {
      output,
      providerRaw,
    };
  }

  return {
    output: {
      ...output,
      durationSeconds,
    },
    providerRaw: providerRaw
      ? {
          ...providerRaw,
          durationSeconds,
        }
      : {
          durationSeconds,
        },
  };
}

function buildSettlementBreakdown(input: {
  customerCharge: number;
  providerCost: number;
  profit: number;
  customerBreakdown?: Record<string, unknown>;
  providerBreakdown?: Record<string, unknown>;
}) {
  return {
    economics: {
      customerCharge: input.customerCharge,
      providerCost: input.providerCost,
      profit: input.profit,
      customer: input.customerBreakdown ?? {},
      provider: input.providerBreakdown ?? {},
    },
  };
}

async function failRequestAndDeleteQueueMessage(input: {
  queueName: "inference_jobs" | "inference_polling";
  messageId: number;
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  publicModelSlug: string;
  endpoint: string;
  errorCode: string;
  errorMessage: string;
  startedAt?: Date;
}) {
  await supabaseAdmin
    .from("inference_requests")
    .update({
      status: "failed",
      error_code: input.errorCode,
      error_message: input.errorMessage,
      actual_cost: 0,
      actual_customer_charge: 0,
      actual_provider_cost: 0,
      actual_profit: 0,
      ...(input.startedAt ? { started_at: input.startedAt.toISOString() } : {}),
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);

  await recordRequestSettlement({
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    apiKeyId: input.apiKeyId,
    publicModelSlug: input.publicModelSlug,
    endpoint: input.endpoint,
    customerCharge: 0,
    providerCost: 0,
    statusCode: 500,
    breakdown: buildSettlementBreakdown({
      customerCharge: 0,
      providerCost: 0,
      profit: 0,
    }),
  });

  await supabaseAdmin.rpc("queue_delete", {
    queue_name: input.queueName,
    message_id: input.messageId,
  });
}

export async function queueRpcAvailable() {
  const { error } = await supabaseAdmin.rpc("queue_read", {
    queue_name: "inference_jobs",
    vt: 1,
    qty: 1,
  });

  return !error;
}

export async function enqueueInferenceJob(message: QueueMessage) {
  const { error } = await supabaseAdmin.rpc("queue_send", {
    queue_name: "inference_jobs",
    msg: message,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function processNextInferenceJob() {
  const { data, error } = await supabaseAdmin.rpc("queue_read", {
    queue_name: "inference_jobs",
    vt: 30,
    qty: 1,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = normalizeQueueRows(data)[0] ?? null;
  if (!row) {
    return false;
  }

  const message = row.message as QueueMessage;
  const adapter = getProviderAdapter(message.providerSlug);
  const { data: credentialRow, error: credentialError } = await supabaseAdmin
    .from("provider_credentials")
    .select("secret_ciphertext, secret_iv, secret_auth_tag")
    .eq("id", message.credentialId)
    .maybeSingle();

  if (credentialError) {
    throw new Error(credentialError.message);
  }

  if (!credentialRow?.secret_ciphertext || !credentialRow.secret_iv || !credentialRow.secret_auth_tag) {
    await failRequestAndDeleteQueueMessage({
      queueName: "inference_jobs",
      messageId: row.msg_id,
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_credential_unavailable",
      errorMessage: "Provider credential secret is missing or not managed internally",
      startedAt: new Date(),
    });

    return true;
  }

  const providerSecret = decryptProviderSecret({
    ciphertext: credentialRow.secret_ciphertext,
    iv: credentialRow.secret_iv,
    authTag: credentialRow.secret_auth_tag,
  });
  const attemptStartedAt = Date.now();
  const { data: requestRow, error: requestRowError } = await supabaseAdmin
    .from("inference_requests")
    .select("provider_id, provider_model_id")
    .eq("id", message.requestId)
    .maybeSingle();

  if (requestRowError) {
    throw new Error(requestRowError.message);
  }

  const { error: attemptInsertError } = await supabaseAdmin
    .from("provider_attempts")
    .insert({
      request_id: message.requestId,
      provider_id: requestRow?.provider_id,
      provider_model_id: requestRow?.provider_model_id,
      attempt_no: 1,
      status: "sent",
      request_payload: {
        publicModelSlug: message.publicModelSlug,
        upstreamModelSlug: message.upstreamModelSlug,
        prompt: message.prompt,
        input: message.input,
      },
    });

  if (attemptInsertError) {
    throw new Error(attemptInsertError.message);
  }

  let result;
  try {
    result = await adapter.submit({
      requestId: message.requestId,
      capability: message.capability,
      publicModelSlug: message.publicModelSlug,
      upstreamModelSlug: message.upstreamModelSlug,
      prompt: message.prompt,
      input: message.input,
      provider: {
        slug: message.providerSlug,
        baseUrl: message.providerBaseUrl,
        config: message.providerConfig,
        secret: providerSecret,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown provider submit error";

    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: "provider_submit_failed",
        error_message: errorMessage,
        started_at: new Date(attemptStartedAt).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "failed",
        error_message: errorMessage,
        latency_ms: Date.now() - attemptStartedAt,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await recordRequestSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      customerCharge: 0,
      providerCost: 0,
      statusCode: 500,
      breakdown: buildSettlementBreakdown({
        customerCharge: 0,
        providerCost: 0,
        profit: 0,
      }),
    });

    await supabaseAdmin.rpc("queue_delete", {
      queue_name: "inference_jobs",
      message_id: row.msg_id,
    });

    return true;
  }

  if (result.mode === "sync") {
    const normalizedSyncResult = withNormalizedVideoDuration({
      capability: message.capability,
      requestInput: message.input,
      output: result.output,
      providerRaw: asRecord(result.output.raw),
    });
    const providerRaw = normalizedSyncResult.providerRaw;
    const normalizedOutput = normalizedSyncResult.output ?? result.output;
    const settlement = await resolveSettlementAmounts({
      providerModelId: message.providerModelId,
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
      output: normalizedOutput,
      providerRaw,
      providerReportedAmount: result.estimatedCost,
    });
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "succeeded",
        output_payload: normalizedOutput,
        actual_cost: settlement.customer.total,
        actual_customer_charge: settlement.customer.total,
        actual_provider_cost: settlement.provider.total,
        actual_profit: settlement.actualProfit,
        estimated_cost: settlement.customer.total,
        estimated_customer_charge: settlement.customer.total,
        estimated_provider_cost: settlement.provider.total,
        estimated_profit: settlement.actualProfit,
        started_at: new Date(attemptStartedAt).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "succeeded",
        upstream_request_id: result.upstreamRequestId,
        response_payload: normalizedOutput,
        latency_ms: Date.now() - attemptStartedAt,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await persistGeneratedAssets({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      output: normalizedOutput,
    });

    await recordRequestSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      customerCharge: settlement.customer.total,
      providerCost: settlement.provider.total,
      statusCode: 200,
      breakdown: buildSettlementBreakdown({
        customerCharge: settlement.customer.total,
        providerCost: settlement.provider.total,
        profit: settlement.actualProfit,
        customerBreakdown: {
          currency: settlement.customer.currency,
          components: settlement.customer.components,
          metrics: settlement.customer.metrics,
        },
        providerBreakdown: {
          currency: settlement.provider.currency,
          components: settlement.provider.components,
          metrics: settlement.provider.metrics,
        },
      }),
    });
  } else {
    const settlement = await resolveSettlementAmounts({
      providerModelId: message.providerModelId,
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
      providerReportedAmount: result.estimatedCost,
    });
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        estimated_cost: settlement.customer.total,
        estimated_customer_charge: settlement.customer.total,
        estimated_provider_cost: settlement.provider.total,
        estimated_profit: settlement.estimatedProfit,
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "processing",
        upstream_request_id: result.upstreamRequestId,
        upstream_task_id: result.upstreamTaskId,
        latency_ms: Date.now() - attemptStartedAt,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await supabaseAdmin.rpc("pgmq_send", {
      queue_name: "inference_polling",
      msg: {
        requestId: message.requestId,
        workspaceId: message.workspaceId,
        apiKeyId: message.apiKeyId,
        providerModelId: message.providerModelId,
        credentialId: message.credentialId,
        providerSlug: message.providerSlug,
        providerBaseUrl: message.providerBaseUrl,
        providerConfig: message.providerConfig,
        capability: message.capability,
        publicModelSlug: message.publicModelSlug,
        upstreamModelSlug: message.upstreamModelSlug,
        endpoint: message.endpoint,
        input: message.input,
        upstreamTaskId: result.upstreamTaskId,
      },
    });
  }

  await supabaseAdmin.rpc("queue_delete", {
    queue_name: "inference_jobs",
    message_id: row.msg_id,
  });

  return true;
}

export async function processNextPollingJob() {
  const { data, error } = await supabaseAdmin.rpc("queue_read", {
    queue_name: "inference_polling",
    vt: 30,
    qty: 1,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = normalizeQueueRows(data)[0] ?? null;
  if (!row) {
    return false;
  }

  const message = row.message as PollingMessage;
  const adapter = getProviderAdapter(message.providerSlug);
  const { data: credentialRow, error: credentialError } = await supabaseAdmin
    .from("provider_credentials")
    .select("secret_ciphertext, secret_iv, secret_auth_tag")
    .eq("id", message.credentialId)
    .maybeSingle();

  if (credentialError) {
    throw new Error(credentialError.message);
  }

  if (!credentialRow?.secret_ciphertext || !credentialRow.secret_iv || !credentialRow.secret_auth_tag) {
    await failRequestAndDeleteQueueMessage({
      queueName: "inference_polling",
      messageId: row.msg_id,
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      errorCode: "provider_credential_unavailable",
      errorMessage: "Provider credential secret is missing or not managed internally",
    });

    return true;
  }

  const providerSecret = decryptProviderSecret({
    ciphertext: credentialRow.secret_ciphertext,
    iv: credentialRow.secret_iv,
    authTag: credentialRow.secret_auth_tag,
  });

  if (!adapter.poll) {
    await supabaseAdmin.rpc("queue_delete", {
      queue_name: "inference_polling",
      message_id: row.msg_id,
    });
    return true;
  }

  let result;
  try {
    result = await adapter.poll({
      upstreamTaskId: message.upstreamTaskId,
      provider: {
        slug: message.providerSlug,
        baseUrl: message.providerBaseUrl,
        config: message.providerConfig,
        secret: providerSecret,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown provider poll error";

    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: "provider_poll_failed",
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "failed",
        error_message: errorMessage,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await recordRequestSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      customerCharge: 0,
      providerCost: 0,
      statusCode: 500,
      breakdown: buildSettlementBreakdown({
        customerCharge: 0,
        providerCost: 0,
        profit: 0,
      }),
    });

    await supabaseAdmin.rpc("queue_delete", {
      queue_name: "inference_polling",
      message_id: row.msg_id,
    });

    return true;
  }

  if (!result.done) {
    await supabaseAdmin.rpc("queue_delete", {
      queue_name: "inference_polling",
      message_id: row.msg_id,
    });

    await supabaseAdmin.rpc("queue_send", {
      queue_name: "inference_polling",
      msg: message,
    });

    return true;
  }

  if (result.success) {
    const normalizedPollingResult = withNormalizedVideoDuration({
      capability: message.capability,
      requestInput: message.input,
      output: result.output,
      providerRaw: result.raw,
    });
    const normalizedOutput = normalizedPollingResult.output ?? result.output;
    const normalizedProviderRaw = normalizedPollingResult.providerRaw ?? result.raw;
    const settlement = await resolveSettlementAmounts({
      providerModelId: message.providerModelId,
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
      output: normalizedOutput,
      providerRaw: normalizedProviderRaw,
      providerReportedAmount: result.actualCost,
    });
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "succeeded",
        output_payload: normalizedOutput,
        actual_cost: settlement.customer.total,
        actual_customer_charge: settlement.customer.total,
        actual_provider_cost: settlement.provider.total,
        actual_profit: settlement.actualProfit,
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "succeeded",
        response_payload: normalizedProviderRaw,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await persistGeneratedAssets({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      output: normalizedOutput,
    });

    await recordRequestSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      customerCharge: settlement.customer.total,
      providerCost: settlement.provider.total,
      statusCode: 200,
      breakdown: buildSettlementBreakdown({
        customerCharge: settlement.customer.total,
        providerCost: settlement.provider.total,
        profit: settlement.actualProfit,
        customerBreakdown: {
          currency: settlement.customer.currency,
          components: settlement.customer.components,
          metrics: settlement.customer.metrics,
        },
        providerBreakdown: {
          currency: settlement.provider.currency,
          components: settlement.provider.components,
          metrics: settlement.provider.metrics,
        },
      }),
    });
  } else {
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: result.errorCode,
        error_message: result.errorMessage,
        actual_cost: 0,
        actual_customer_charge: 0,
        actual_provider_cost: 0,
        actual_profit: 0,
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "failed",
        response_payload: result.raw,
        error_message: result.errorMessage,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await recordRequestSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      customerCharge: 0,
      providerCost: 0,
      statusCode: 500,
      breakdown: buildSettlementBreakdown({
        customerCharge: 0,
        providerCost: 0,
        profit: 0,
      }),
    });
  }

  await supabaseAdmin.rpc("queue_delete", {
    queue_name: "inference_polling",
    message_id: row.msg_id,
  });

  return true;
}
