import { getJson, postJson } from "../lib/http.js";
import { env } from "../config.js";
import { classifyUpstreamError } from "./upstream-error.js";
import type {
  Capability,
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

function getExactMustacheValue(input: string, values: Record<string, unknown>) {
  const match = input.match(/^\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}$/);
  if (!match?.[1]) {
    return { matched: false as const, value: undefined };
  }
  return { matched: true as const, value: values[match[1]] };
}

const INTEGER_TEMPLATE_PARAM_KEYS = new Set([
  "max_tokens",
  "max_output_tokens",
  "seed",
  "n",
  "num_images",
  "top_k",
]);

const NUMBER_TEMPLATE_PARAM_KEYS = new Set([
  "temperature",
  "top_p",
  "presence_penalty",
  "frequency_penalty",
]);

function sanitizeRenderedTemplateValue(key: string | null, value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    if (key && INTEGER_TEMPLATE_PARAM_KEYS.has(key) && /^-?\d+$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    if (key && NUMBER_TEMPLATE_PARAM_KEYS.has(key) && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeRenderedTemplateValue(null, item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [childKey, childValue] of Object.entries(value)) {
      const sanitized = sanitizeRenderedTemplateValue(childKey, childValue);
      if (sanitized !== undefined) {
        output[childKey] = sanitized;
      }
    }
    return output;
  }

  return value;
}

function sanitizeRenderedTemplateRecord(value: Record<string, unknown>) {
  return (sanitizeRenderedTemplateValue(null, value) as Record<string, unknown>) ?? {};
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function renderTemplateValue(value: unknown, variables: Record<string, unknown>): unknown {
  if (typeof value === "string") {
    const exactMatch = getExactMustacheValue(value, variables);
    if (exactMatch.matched) {
      return exactMatch.value;
    }
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
  cfg: Record<string, unknown>,
  requestId?: string,
  capability?: Capability
) {
  if (capability === "image_recognition" || capability === "text_generation") {
    return null;
  }

  const inferredType = (() => {
    if (capability === "video_generation") return "video";
    if (capability === "image_generation" || capability === "image_edit") return "image";
    const configuredMimeType = readString(cfg.resultMimeType, "").toLowerCase();
    if (configuredMimeType.startsWith("video/")) return "video";
    if (resultValuePath.toLowerCase().includes("generatevideoresponse")) return "video";
    return "image";
  })();
  const resultValue = readPath(data, resultValuePath);
  const resultType = readString(cfg.resultValueType, "url");
  const looksLikeHttpUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://");
  if (resultType === "base64" && typeof resultValue === "string" && resultValue.length > 0) {
    if (looksLikeHttpUrl(resultValue)) {
      return { url: resultValue, type: inferredType };
    }
    const mimeType = readString(cfg.resultMimeType, "image/png");
    return { url: `data:${mimeType};base64,${resultValue}`, type: inferredType };
  }
  if (typeof resultValue === "string" && resultValue.length > 0) {
    const isGeminiFileDownload = (() => {
      try {
        const parsed = new URL(resultValue);
        return (
          parsed.hostname === "generativelanguage.googleapis.com" &&
          /^\/v[^/]+\/files\/[^/]+:download$/.test(parsed.pathname)
        );
      } catch {
        return false;
      }
    })();

    if (isGeminiFileDownload && requestId) {
      const path = `/v1/files/${encodeURIComponent(requestId)}/assets/0`;
      const proxiedUrl = env.GATEWAY_PUBLIC_BASE_URL
        ? new URL(path, env.GATEWAY_PUBLIC_BASE_URL).toString()
        : path;
      return {
        url: proxiedUrl,
        sourceUrl: resultValue,
        type: inferredType,
      };
    }

    return { url: resultValue, type: inferredType };
  }
  return null;
}

function buildTextFromResult(
  data: Record<string, unknown>,
  cfg: Record<string, unknown>,
  capability?: Capability
) {
  if (capability !== "image_recognition" && capability !== "text_generation") {
    return null;
  }

  const configuredPath = readString(cfg.resultTextPath, "");
  const candidatePaths = configuredPath
    ? [configuredPath]
    : [
        "caption",
        "text",
        "description",
        "output",
        "result.caption",
        "result.text",
        "result.description",
        "result.output",
        "result",
        "outputs.0",
      ];

  for (const path of candidatePaths) {
    const value = readPath(data, path);
    if (isNonEmptyString(value)) {
      return value;
    }
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
      ? sanitizeRenderedTemplateRecord(
          renderTemplateValue(submitBodyTemplate, templateVariables) as Record<string, unknown>
        )
      : sanitizeRenderedTemplateRecord({
          model: input.upstreamModelSlug,
          prompt: input.prompt,
          ...input.input,
        });

    const { data } = await postJson<Record<string, unknown>>(submitUrl.toString(), {
      headers: auth.headers,
      body,
    });

    const taskId = readPath(data, taskIdPath);
    const status = readStatusFlags(data, resolvedStatusPath);
    const asset = buildAssetFromResult(
      data,
      resultUrlPath,
      cfg,
      input.requestId,
      input.capability
    );
    const text = buildTextFromResult(data, cfg, input.capability);
    const isSyncMode = mode === "sync" || mode === "sync-json-v1";
    const hasPollMode = mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1" || Boolean(pollPath);

    if (text && (isSyncMode || status.isSuccess || !hasPollMode)) {
      return {
        mode: "sync",
        upstreamRequestId: String(taskId ?? input.requestId),
        output: { raw: data, text },
        estimatedCost: 0,
      };
    }

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

    if (hasPollMode && !isNonEmptyString(taskId)) {
      throw new Error(
        `Upstream submit response is missing task id at path "${taskIdPath}". ` +
          `Check executionConfig.taskIdPath. submitUrl=${submitUrl.toString()}`
      );
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
    const resultPath =
      typeof cfg.resultPath === "string" && cfg.resultPath.trim().length > 0
        ? cfg.resultPath
        : null;
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
    const asset = buildAssetFromResult(
      data,
      resultUrlPath,
      cfg,
      input.requestId,
      input.capability
    );
    const text = buildTextFromResult(data, cfg, input.capability);

    if (status.isFailed && !asset && !text) {
      const upstreamError = classifyUpstreamError({
        data,
        fallbackMessage: "Upstream request failed",
      });
      return {
        done: true,
        success: false,
        errorCode: upstreamError.errorCode,
        errorMessage: upstreamError.errorMessage,
        raw: data,
      };
    }
    if (status.isSuccess && text) {
      return {
        done: true,
        success: true,
        output: { raw: data, text },
        actualCost: 0,
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
    if (status.isSuccess && !asset && resultPath) {
      const resultUrl = new URL(
        fillTemplate(resultPath, { taskId: input.upstreamTaskId }),
        input.provider.baseUrl ?? ""
      );
      auth.applyQuery(resultUrl);

      const { data: resultData } = await getJson<Record<string, unknown>>(resultUrl.toString(), {
        headers: auth.headers,
      });
      const resultAsset = buildAssetFromResult(
        resultData,
        resultUrlPath,
        cfg,
        input.requestId,
        input.capability
      );
      const resultText = buildTextFromResult(resultData, cfg, input.capability);

      if (resultText) {
        return {
          done: true,
          success: true,
          output: { raw: resultData, text: resultText },
          actualCost: 0,
          raw: {
            poll: data,
            result: resultData,
          },
        };
      }

      if (resultAsset) {
        return {
          done: true,
          success: true,
          output: { raw: resultData, assets: [resultAsset] },
          actualCost: 0,
          raw: {
            poll: data,
            result: resultData,
          },
        };
      }
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
