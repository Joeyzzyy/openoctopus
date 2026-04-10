import { supabaseAdmin } from "../lib/supabase.js";
import { getProviderAdapter } from "../providers/index.js";
import { persistGeneratedAssets } from "../services/assets-service.js";
import {
  recordUsageEvent,
  recordWalletSettlement,
} from "../services/billing-service.js";

type QueueMessage = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  providerSlug: string;
  capability: "image_generation" | "video_generation";
  model: string;
  endpoint: string;
  prompt?: string;
  input: Record<string, unknown>;
};

type PollingMessage = {
  requestId: string;
  workspaceId: string;
  apiKeyId: string | null;
  providerSlug: string;
  model: string;
  endpoint: string;
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
        model: message.model,
        prompt: message.prompt,
        input: message.input,
      },
    });

  if (attemptInsertError) {
    throw new Error(attemptInsertError.message);
  }

  const result = await adapter.submit({
    requestId: message.requestId,
    capability: message.capability,
    publicModelSlug: message.model,
    prompt: message.prompt,
    input: message.input,
  });

  if (result.mode === "sync") {
    const totalCost = Number(result.estimatedCost ?? 0);
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "succeeded",
        output_payload: result.output,
        actual_cost: totalCost,
        started_at: new Date(attemptStartedAt).toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "succeeded",
        upstream_request_id: result.upstreamRequestId,
        response_payload: result.output,
        latency_ms: Date.now() - attemptStartedAt,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await persistGeneratedAssets({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      output: result.output,
    });

    await recordUsageEvent({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.model,
      endpoint: message.endpoint,
      totalCost,
      statusCode: 200,
    });

    await recordWalletSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      amount: totalCost,
      description: `${message.model} usage settlement`,
    });
  } else {
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        estimated_cost: result.estimatedCost,
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
        providerSlug: message.providerSlug,
        model: message.model,
        endpoint: message.endpoint,
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

  if (!adapter.poll) {
    await supabaseAdmin.rpc("queue_delete", {
      queue_name: "inference_polling",
      message_id: row.msg_id,
    });
    return true;
  }

  const result = await adapter.poll(message.upstreamTaskId);

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
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "succeeded",
        output_payload: result.output,
        actual_cost: result.actualCost,
        completed_at: new Date().toISOString(),
      })
      .eq("id", message.requestId);

    await supabaseAdmin
      .from("provider_attempts")
      .update({
        status: "succeeded",
        response_payload: result.raw,
      })
      .eq("request_id", message.requestId)
      .eq("attempt_no", 1);

    await persistGeneratedAssets({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      output: result.output,
    });

    await recordUsageEvent({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.model,
      endpoint: message.endpoint,
      totalCost: result.actualCost,
      statusCode: 200,
    });

    await recordWalletSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      amount: result.actualCost,
      description: `${message.model} usage settlement`,
    });
  } else {
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "failed",
        error_code: result.errorCode,
        error_message: result.errorMessage,
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
  }

  await supabaseAdmin.rpc("queue_delete", {
    queue_name: "inference_polling",
    message_id: row.msg_id,
  });

  return true;
}
