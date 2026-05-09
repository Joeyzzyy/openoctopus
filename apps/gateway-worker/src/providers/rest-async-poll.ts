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

export class RestAsyncPollAdapter implements ProviderAdapter {
  slug = "rest-async-poll-v1";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const cfg = (input.provider.config?.executionConfig ?? {}) as Record<string, unknown>;
    const submitPath = typeof cfg.submitPath === "string" ? cfg.submitPath : "/v1/tasks";
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

    const taskId = readPath(data, typeof cfg.taskIdPath === "string" ? cfg.taskIdPath : "id");
    const status = String(readPath(data, typeof cfg.statusPath === "string" ? cfg.statusPath : "status") ?? "processing");
    const resultUrl = readPath(data, typeof cfg.resultUrlPath === "string" ? cfg.resultUrlPath : "result.url");

    if ((status === "succeeded" || status === "completed") && typeof resultUrl === "string") {
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
    const pollPath = typeof cfg.pollPath === "string" ? cfg.pollPath : "/v1/tasks/{taskId}";
    const pollUrl = new URL(
      fillTemplate(pollPath, { taskId: input.upstreamTaskId }),
      input.provider.baseUrl ?? ""
    ).toString();

    const { data } = await getJson<Record<string, unknown>>(pollUrl, {
      headers: { Authorization: `Bearer ${input.provider.secret}` },
    });
    const status = String(readPath(data, typeof cfg.statusPath === "string" ? cfg.statusPath : "status") ?? "processing");
    const resultUrl = readPath(data, typeof cfg.resultUrlPath === "string" ? cfg.resultUrlPath : "result.url");

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
