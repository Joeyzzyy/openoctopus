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

function fillMustacheTemplate(input: string, values: Record<string, unknown>) {
  return input.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value);
  });
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function renderTemplateValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    return fillMustacheTemplate(value, variables);
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderTemplateValue(item, variables));
  }
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      output[key] = renderTemplateValue(child, variables);
    }
    return output;
  }
  return value;
}

function parseTemplateConfig(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }
  return null;
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

function readStatusFlags(data: Record<string, unknown>, statusPath: string) {
  const statusValue = readPath(data, statusPath);
  const statusText = String(statusValue ?? "processing").toLowerCase();
  const doneBoolean = typeof statusValue === "boolean" ? statusValue : null;
  const hasErrorObject = Boolean(readPath(data, "error"));

  const isSuccessByText = statusText === "succeeded" || statusText === "completed";
  const isFailedByText = statusText === "failed" || statusText === "error";
  const isDone = doneBoolean === true || isSuccessByText || isFailedByText;
  const isSuccess = doneBoolean === true ? !hasErrorObject : isSuccessByText;
  const isFailed = hasErrorObject || isFailedByText || (isDone && !isSuccess);

  return {
    statusValue,
    statusText,
    isDone,
    isSuccess,
    isFailed,
    hasErrorObject,
  };
}

export class RestAsyncPollAdapter implements ProviderAdapter {
  slug = "rest-async-poll-v1";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const cfg = (input.provider.config?.executionConfig ?? {}) as Record<string, unknown>;
    const mode = readString(cfg.mode, "auto");
    const submitPath = readString(cfg.submitPath, "/v1/tasks");
    const statusPath = typeof cfg.statusPath === "string" ? cfg.statusPath : undefined;
    const resolvedStatusPath = statusPath ?? "status";
    const taskIdPath = typeof cfg.taskIdPath === "string" ? cfg.taskIdPath : "id";
    const resultUrlPath = typeof cfg.resultUrlPath === "string" ? cfg.resultUrlPath : "result.url";
    const pollPath = typeof cfg.pollPath === "string" ? cfg.pollPath : undefined;
    const submitUrl = new URL(
      fillTemplate(submitPath, { upstreamModel: input.upstreamModelSlug }),
      input.provider.baseUrl ?? ""
    );
    const auth = buildAuthConfig(cfg, input.provider.secret);
    auth.applyQuery(submitUrl);

    const submitBodyTemplate = parseTemplateConfig(cfg.submitBodyTemplate);
    const templateVariables: Record<string, unknown> = {
      prompt: input.prompt ?? "",
      upstreamModel: input.upstreamModelSlug,
      publicModel: input.publicModelSlug,
      capability: input.capability,
      requestId: input.requestId,
      ...input.input,
    };
    const body = submitBodyTemplate
      ? (renderTemplateValue(submitBodyTemplate, templateVariables) as Record<string, unknown>)
      : {
          model: input.upstreamModelSlug,
          prompt: input.prompt,
          ...input.input,
        };

    const { data } = await postJson<Record<string, unknown>>(submitUrl.toString(), {
      headers: auth.headers,
      body,
    });

    const taskId = readPath(data, taskIdPath);
    const status = readStatusFlags(data, resolvedStatusPath);
    const asset = buildAssetFromResult(data, resultUrlPath, cfg);
    const isSyncMode = mode === "sync" || mode === "sync-json-v1";
    const hasPollMode = mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1" || Boolean(pollPath);

    if (
      asset &&
      (isSyncMode || status.isSuccess || !hasPollMode)
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
    const status = readStatusFlags(data, statusPath);
    const asset = buildAssetFromResult(data, resultUrlPath, cfg);

    if (status.isFailed && !asset) {
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage: String(readPath(data, "error.message") ?? "Upstream request failed"),
        raw: data,
      };
    }
    if (status.isSuccess && asset) {
      return {
        done: true,
        success: true,
        output: { raw: data, assets: [asset] },
        actualCost: 0,
        raw: data,
      };
    }
    if (status.isDone && !asset) {
      return {
        done: true,
        success: false,
        errorCode: "upstream_result_missing",
        errorMessage: "Upstream operation completed but no result asset URL was found.",
        raw: data,
      };
    }
    return { done: false, pollAfterSeconds: 5, raw: data };
  }
}
