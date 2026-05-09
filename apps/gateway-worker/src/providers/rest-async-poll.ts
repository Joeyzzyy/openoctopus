import { getJson, postJson } from "../lib/http.js";
import type {
  PollRequestInput,
  PollRequestResult,
  ProviderAdapter,
  SubmitRequestInput,
  SubmitRequestResult,
} from "./types.js";

function readPath(source: Record<string, unknown>, path: string | undefined) {
  if (!path) return null;
  let current: unknown = source;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[key];
  }
  return current ?? null;
}

function fillTemplate(input: string, values: Record<string, string>) {
  return input.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, k) => values[k] ?? "");
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

export class RestAsyncPollAdapter implements ProviderAdapter {
  slug = "rest-async-poll-v1";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const cfg = (input.provider.config?.executionConfig ?? {}) as Record<string, unknown>;
    const mode = readString(cfg.mode, "auto");
    const submitPath = readString(cfg.submitPath, "/v1/tasks");
    const statusPath = typeof cfg.statusPath === "string" ? cfg.statusPath : undefined;
    const taskIdPath = typeof cfg.taskIdPath === "string" ? cfg.taskIdPath : "id";
    const resultUrlPath = typeof cfg.resultUrlPath === "string" ? cfg.resultUrlPath : "result.url";
    const pollPath = typeof cfg.pollPath === "string" ? cfg.pollPath : undefined;
    const submitUrl = new URL(
      fillTemplate(submitPath, { upstreamModel: input.upstreamModelSlug }),
      input.provider.baseUrl ?? ""
    ).toString();

    const body = {
      model: input.upstreamModelSlug,
      prompt: input.prompt,
      ...input.input,
    };

    const { data } = await postJson<Record<string, unknown>>(submitUrl, {
      headers: { Authorization: `Bearer ${input.provider.secret}` },
      body,
    });

    const taskId = readPath(data, taskIdPath);
    const status = String(readPath(data, statusPath) ?? "processing");
    const resultUrl = readPath(data, resultUrlPath);
    const isSyncMode = mode === "sync" || mode === "sync-json-v1";
    const hasPollMode = mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1" || Boolean(pollPath);

    if (
      typeof resultUrl === "string" &&
      (isSyncMode || status === "succeeded" || status === "completed" || !hasPollMode)
    ) {
      return {
        mode: "sync",
        upstreamRequestId: String(taskId ?? input.requestId),
        output: { raw: data, assets: [{ url: resultUrl }] },
        estimatedCost: 0,
      };
    }

    return {
      mode: "async",
      upstreamRequestId: String(taskId ?? input.requestId),
      upstreamTaskId: String(taskId ?? input.requestId),
      pollAfterSeconds: 5,
      estimatedCost: 0,
    };
  }

  async poll(input: PollRequestInput): Promise<PollRequestResult> {
    const cfg = (input.provider.config?.executionConfig ?? {}) as Record<string, unknown>;
    const pollPath = readString(cfg.pollPath, "/v1/tasks/{taskId}");
    const pollUrl = new URL(
      fillTemplate(pollPath, { taskId: input.upstreamTaskId }),
      input.provider.baseUrl ?? ""
    ).toString();

    const { data } = await getJson<Record<string, unknown>>(pollUrl, {
      headers: { Authorization: `Bearer ${input.provider.secret}` },
    });
    const statusPath = typeof cfg.statusPath === "string" ? cfg.statusPath : "status";
    const resultUrlPath = typeof cfg.resultUrlPath === "string" ? cfg.resultUrlPath : "result.url";
    const status = String(readPath(data, statusPath) ?? "processing");
    const resultUrl = readPath(data, resultUrlPath);

    if (status === "failed" || status === "error") {
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage: String(readPath(data, "error.message") ?? "Upstream request failed"),
        raw: data,
      };
    }
    if ((status === "succeeded" || status === "completed") && typeof resultUrl === "string") {
      return {
        done: true,
        success: true,
        output: { raw: data, assets: [{ url: resultUrl }] },
        actualCost: 0,
        raw: data,
      };
    }
    return { done: false, pollAfterSeconds: 5, raw: data };
  }
}
