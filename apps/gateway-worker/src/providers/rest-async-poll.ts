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
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }
    if (!current || typeof current !== "object") return null;
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

function buildAuthConfig(cfg: Record<string, unknown>, secret: string) {
  const authType = readString(cfg.authType, "bearer");
  if (authType === "query") {
    const key = readString(cfg.authQueryParam, "key");
    return {
      headers: {} as Record<string, string>,
      applyQuery: (url: URL) => {
        url.searchParams.set(key, secret);
      },
    };
  }
  if (authType === "header") {
    const headerName = readString(cfg.authHeaderName, "x-api-key");
    return {
      headers: { [headerName]: secret },
      applyQuery: (_url: URL) => {},
    };
  }
  const headerName = readString(cfg.authHeaderName, "Authorization");
  const headerPrefix = readString(cfg.authHeaderPrefix, "Bearer");
  return {
    headers: {
      [headerName]: headerPrefix ? `${headerPrefix} ${secret}` : secret,
    },
    applyQuery: (_url: URL) => {},
  };
}

function buildAssetFromResult(
  data: Record<string, unknown>,
  resultValuePath: string,
  cfg: Record<string, unknown>
) {
  const resultValue = readPath(data, resultValuePath);
  const resultType = readString(cfg.resultValueType, "url");
  if (resultType === "base64" && typeof resultValue === "string" && resultValue.length > 0) {
    const mimeType = readString(cfg.resultMimeType, "image/png");
    return { url: `data:${mimeType};base64,${resultValue}` };
  }
  if (typeof resultValue === "string" && resultValue.length > 0) {
    return { url: resultValue };
  }
  return null;
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
    );
    const auth = buildAuthConfig(cfg, input.provider.secret);
    auth.applyQuery(submitUrl);

    const body = {
      model: input.upstreamModelSlug,
      prompt: input.prompt,
      ...input.input,
    };

    const { data } = await postJson<Record<string, unknown>>(submitUrl.toString(), {
      headers: auth.headers,
      body,
    });

    const taskId = readPath(data, taskIdPath);
    const status = String(readPath(data, statusPath) ?? "processing");
    const asset = buildAssetFromResult(data, resultUrlPath, cfg);
    const isSyncMode = mode === "sync" || mode === "sync-json-v1";
    const hasPollMode = mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1" || Boolean(pollPath);

    if (
      asset &&
      (isSyncMode || status === "succeeded" || status === "completed" || !hasPollMode)
    ) {
      return {
        mode: "sync",
        upstreamRequestId: String(taskId ?? input.requestId),
        output: { raw: data, assets: [asset] },
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
    );
    const auth = buildAuthConfig(cfg, input.provider.secret);
    auth.applyQuery(pollUrl);

    const { data } = await getJson<Record<string, unknown>>(pollUrl.toString(), {
      headers: auth.headers,
    });
    const statusPath = typeof cfg.statusPath === "string" ? cfg.statusPath : "status";
    const resultUrlPath = typeof cfg.resultUrlPath === "string" ? cfg.resultUrlPath : "result.url";
    const status = String(readPath(data, statusPath) ?? "processing");
    const asset = buildAssetFromResult(data, resultUrlPath, cfg);

    if (status === "failed" || status === "error") {
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage: String(readPath(data, "error.message") ?? "Upstream request failed"),
        raw: data,
      };
    }
    if ((status === "succeeded" || status === "completed") && asset) {
      return {
        done: true,
        success: true,
        output: { raw: data, assets: [asset] },
        actualCost: 0,
        raw: data,
      };
    }
    return { done: false, pollAfterSeconds: 5, raw: data };
  }
}
