import { env } from "../config.js";
import { getJson, postJson } from "../lib/http.js";
import { getByPath } from "../lib/object-path.js";
import type {
  PollRequestResult,
  ProviderAdapter,
  SubmitRequestInput,
  SubmitRequestResult,
} from "./types.js";

export class WaveSpeedImageAdapter implements ProviderAdapter {
  slug = "wavespeed-images";

  private buildHeaders() {
    const apiKeyValue = env.WAVESPEED_IMAGE_API_KEY_PREFIX
      ? `${env.WAVESPEED_IMAGE_API_KEY_PREFIX} ${env.WAVESPEED_API_KEY}`
      : env.WAVESPEED_API_KEY;

    return {
      [env.WAVESPEED_IMAGE_API_KEY_HEADER]: apiKeyValue,
    };
  }

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const submitUrl = new URL(
      env.WAVESPEED_IMAGE_SUBMIT_PATH,
      env.WAVESPEED_BASE_URL
    ).toString();

    const { data } = await postJson<Record<string, unknown>>(submitUrl, {
      headers: this.buildHeaders(),
      body: {
        model: input.publicModelSlug,
        prompt: input.prompt,
        ...input.input,
      },
    });

    const requestId = String(
      getByPath(data, env.WAVESPEED_IMAGE_REQUEST_ID_FIELD) ?? input.requestId
    );
    const taskId =
      getByPath(data, env.WAVESPEED_IMAGE_TASK_ID_FIELD) ??
      getByPath(data, "prediction_id") ??
      getByPath(data, "task_id");
    const status = String(
      getByPath(data, env.WAVESPEED_IMAGE_STATUS_FIELD) ?? "processing"
    );
    const resultUrl = getByPath(data, env.WAVESPEED_IMAGE_RESULT_URL_FIELD);

    if ((status === "succeeded" || status === "completed") && typeof resultUrl === "string") {
      return {
        mode: "sync",
        upstreamRequestId: requestId,
        output: {
          raw: data,
          assets: [{ url: resultUrl, type: "image" }],
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

  async poll(upstreamTaskId: string): Promise<PollRequestResult> {
    const statusPath = env.WAVESPEED_IMAGE_STATUS_PATH.replace(
      "{taskId}",
      upstreamTaskId
    );
    const statusUrl = new URL(statusPath, env.WAVESPEED_BASE_URL).toString();

    const { data } = await getJson<Record<string, unknown>>(statusUrl, {
      headers: this.buildHeaders(),
    });

    const status = String(
      getByPath(data, env.WAVESPEED_IMAGE_STATUS_FIELD) ?? "processing"
    );
    const resultUrl = getByPath(data, env.WAVESPEED_IMAGE_RESULT_URL_FIELD);

    if (status === "failed" || status === "error" || status === "canceled") {
      return {
        done: true,
        success: false,
        errorCode: "upstream_failed",
        errorMessage: String(
          getByPath(data, "error") ?? "WaveSpeed image request failed"
        ),
        raw: data,
      };
    }

    if ((status === "succeeded" || status === "completed") && typeof resultUrl === "string") {
      return {
        done: true,
        success: true,
        output: {
          raw: data,
          assets: [{ url: resultUrl, type: "image" }],
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
