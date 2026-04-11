import { supabaseAdmin } from "../lib/supabase.js";
import { decryptProviderSecret } from "../lib/provider-secret-crypto.js";
import { getProviderAdapter } from "../providers/index.js";
import { persistGeneratedAssets } from "../services/assets-service.js";
import {
  recordUsageEvent,
  recordWalletSettlement,
  resolveBillableCost,
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
    throw new Error("Provider credential secret is missing or not managed internally");
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

    await recordUsageEvent({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      apiKeyId: message.apiKeyId,
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      totalCost: 0,
      statusCode: 500,
    });

    await supabaseAdmin.rpc("queue_delete", {
      queue_name: "inference_jobs",
      message_id: row.msg_id,
    });

    return true;
  }

  if (result.mode === "sync") {
    const totalCost = await resolveBillableCost({
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
      output: result.output,
      providerRaw: typeof result.output.raw === "object" && result.output.raw !== null && !Array.isArray(result.output.raw)
        ? (result.output.raw as Record<string, unknown>)
        : null,
    });
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
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      totalCost,
      statusCode: 200,
    });

    await recordWalletSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      amount: totalCost,
      description: `${message.publicModelSlug} usage settlement`,
    });
  } else {
    const estimatedCost = await resolveBillableCost({
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
    });
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        estimated_cost: estimatedCost,
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
    throw new Error("Provider credential secret is missing or not managed internally");
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
    const totalCost = await resolveBillableCost({
      publicModelSlug: message.publicModelSlug,
      requestInput: message.input,
      output: result.output,
      providerRaw: result.raw,
    });
    await supabaseAdmin
      .from("inference_requests")
      .update({
        status: "succeeded",
        output_payload: result.output,
        actual_cost: totalCost,
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
      publicModelSlug: message.publicModelSlug,
      endpoint: message.endpoint,
      totalCost,
      statusCode: 200,
    });

    await recordWalletSettlement({
      requestId: message.requestId,
      workspaceId: message.workspaceId,
      amount: totalCost,
      description: `${message.publicModelSlug} usage settlement`,
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
