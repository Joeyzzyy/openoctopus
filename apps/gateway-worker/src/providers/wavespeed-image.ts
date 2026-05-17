import { getJson, postJson } from "../lib/http.js";
import { getByPath } from "../lib/object-path.js";
import type {
  PollRequestInput,
  PollRequestResult,
  ProviderAdapter,
  SubmitRequestInput,
  SubmitRequestResult,
} from "./types.js";

type WaveSpeedExecutionConfig = {
  submitPath: string;
  statusPath: string;
  authHeaderName: string;
  authHeaderPrefix: string;
  resultUrlPath: string;
  statusFieldPath: string;
  taskIdPath: string;
  requestIdPath: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readRequiredString(
  source: Record<string, unknown>,
  key: keyof WaveSpeedExecutionConfig
) {
  const value = source[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`WaveSpeed executionConfig.${key} is required`);
  }
  return value.trim();
}

function readWaveSpeedExecutionConfig(provider: SubmitRequestInput["provider"] | PollRequestInput["provider"]) {
  const configRecord = asRecord(provider.config);
  const executionConfig = asRecord(configRecord?.executionConfig);
  if (!executionConfig) {
    throw new Error("WaveSpeed provider.config.executionConfig is required");
  }

  return {
    submitPath: readRequiredString(executionConfig, "submitPath"),
    statusPath: readRequiredString(executionConfig, "statusPath"),
    authHeaderName: readRequiredString(executionConfig, "authHeaderName"),
    authHeaderPrefix: readRequiredString(executionConfig, "authHeaderPrefix"),
    resultUrlPath: readRequiredString(executionConfig, "resultUrlPath"),
    statusFieldPath: readRequiredString(executionConfig, "statusFieldPath"),
    taskIdPath: readRequiredString(executionConfig, "taskIdPath"),
    requestIdPath: readRequiredString(executionConfig, "requestIdPath"),
  } satisfies WaveSpeedExecutionConfig;
}

function readProviderBaseUrl(provider: SubmitRequestInput["provider"] | PollRequestInput["provider"]) {
  if (!provider.baseUrl || provider.baseUrl.trim().length === 0) {
    throw new Error("WaveSpeed provider.baseUrl is required");
  }

  return provider.baseUrl;
}

function inferRequestedImageMimeType(input: Record<string, unknown>) {
  const value = input.output_format ?? input.outputFormat;
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "jpg") return "image/jpeg";
  if (["jpeg", "png", "webp", "gif"].includes(normalized)) {
    return `image/${normalized}`;
  }
  return normalized.includes("/") ? normalized : undefined;
}

function buildImageAsset(url: string, input: Record<string, unknown>) {
  const mimeType = inferRequestedImageMimeType(input);
  return {
    url,
    type: "image",
    ...(mimeType ? { mimeType } : {}),
  };
}

export class WaveSpeedImageAdapter implements ProviderAdapter {
  slug = "wavespeed-images";

  private buildHeaders(secret: string, config: WaveSpeedExecutionConfig) {
    const apiKeyValue = config.authHeaderPrefix
      ? `${config.authHeaderPrefix} ${secret}`
      : secret;

    return {
      [config.authHeaderName]: apiKeyValue,
    };
  }

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const executionConfig = readWaveSpeedExecutionConfig(input.provider);
    const baseUrl = readProviderBaseUrl(input.provider);
    const submitUrl = new URL(
      executionConfig.submitPath,
      baseUrl
    ).toString();

    const { data } = await postJson<Record<string, unknown>>(submitUrl, {
      headers: this.buildHeaders(input.provider.secret, executionConfig),
      body: {
        model: input.upstreamModelSlug,
        prompt: input.prompt,
        ...input.input,
      },
    });

    const requestId = String(
      getByPath(data, executionConfig.requestIdPath) ?? input.requestId
    );
    const taskId =
      getByPath(data, executionConfig.taskIdPath) ??
      getByPath(data, "prediction_id") ??
      getByPath(data, "task_id");
    const status = String(
      getByPath(data, executionConfig.statusFieldPath) ?? "processing"
    );
    const resultUrl = getByPath(data, executionConfig.resultUrlPath);

    if ((status === "succeeded" || status === "completed") && typeof resultUrl === "string") {
      return {
        mode: "sync",
        upstreamRequestId: requestId,
        output: {
          raw: data,
          assets: [buildImageAsset(resultUrl, input.input ?? {})],
        },
        estimatedCost: 0,
      };
    }

    if (!taskId || typeof taskId !== "string") {
      throw new Error("WaveSpeed image response did not contain a task id");
    }

    return {
      mode: "async",
      upstreamRequestId: requestId,
      upstreamTaskId: taskId,
      pollAfterSeconds: 4,
      estimatedCost: 0,
    };
  }

  async poll(input: PollRequestInput): Promise<PollRequestResult> {
    const executionConfig = readWaveSpeedExecutionConfig(input.provider);
    const baseUrl = readProviderBaseUrl(input.provider);
    const statusPath = executionConfig.statusPath.replace(
      "{taskId}",
      input.upstreamTaskId
    );
    const statusUrl = new URL(
      statusPath,
      baseUrl
    ).toString();

    const { data } = await getJson<Record<string, unknown>>(statusUrl, {
      headers: this.buildHeaders(input.provider.secret, executionConfig),
    });

    const status = String(
      getByPath(data, executionConfig.statusFieldPath) ?? "processing"
    );
    const resultUrl = getByPath(data, executionConfig.resultUrlPath);

    if (status === "failed" || status === "error" || status === "canceled") {
      const upstreamError =
        getByPath(data, "data.error") ??
        getByPath(data, "error") ??
        "WaveSpeed image request failed";
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage: String(upstreamError),
        raw: data,
      };
    }

    if ((status === "succeeded" || status === "completed") && typeof resultUrl === "string") {
      return {
        done: true,
        success: true,
        output: {
          raw: data,
          assets: [buildImageAsset(resultUrl, input.input ?? {})],
        },
        actualCost: 0,
        raw: data,
      };
    }

    return {
      done: false,
      pollAfterSeconds: 4,
      raw: data,
    };
  }
}
