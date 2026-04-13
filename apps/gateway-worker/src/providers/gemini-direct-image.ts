import { getJson, postJson } from "../lib/http.js";
import type {
  PollRequestInput,
  PollRequestResult,
  ProviderAdapter,
  SubmitRequestInput,
  SubmitRequestResult,
} from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildBaseUrl(provider: SubmitRequestInput["provider"] | PollRequestInput["provider"]) {
  const rawBaseUrl = provider.baseUrl ?? "https://generativelanguage.googleapis.com";
  const baseUrl = rawBaseUrl.replace(/\/$/, "");
  const apiVersion = isRecord(provider.config) && typeof provider.config.apiVersion === "string"
    ? provider.config.apiVersion
    : "v1beta";

  return /\/v\d/.test(baseUrl) ? baseUrl : `${baseUrl}/${apiVersion}`;
}

function buildOperationUrl(operationName: string, baseUrl: string) {
  if (/^https?:\/\//.test(operationName)) {
    return operationName;
  }

  return new URL(operationName.replace(/^\/+/, ""), `${baseUrl}/`).toString();
}

export class GeminiDirectImageAdapter implements ProviderAdapter {
  constructor(readonly slug = "gemini-direct") {}

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    if (input.capability === "video_generation") {
      return this.submitVideo(input);
    }

    return this.submitImage(input);
  }

  async poll(input: PollRequestInput): Promise<PollRequestResult> {
    const baseUrl = buildBaseUrl(input.provider);
    const pollUrl = buildOperationUrl(input.upstreamTaskId, baseUrl);

    const { data } = await getJson<Record<string, unknown>>(pollUrl, {
      headers: {
        "x-goog-api-key": input.provider.secret,
      },
    });

    const done = data.done === true;
    if (!done) {
      return {
        done: false,
        pollAfterSeconds: 10,
        raw: data,
      };
    }

    if ("error" in data && isRecord(data.error)) {
      return {
        done: true,
        success: false,
        errorCode:
          typeof data.error.status === "string"
            ? data.error.status
            : typeof data.error.code === "string"
              ? data.error.code
              : "upstream_failed",
        errorMessage:
          typeof data.error.message === "string"
            ? data.error.message
            : "Veo operation failed",
        raw: data,
      };
    }

    const response = isRecord(data.response) ? data.response : null;
    const generateVideoResponse = response && isRecord(response.generateVideoResponse)
      ? response.generateVideoResponse
      : response && isRecord(response.generate_video_response)
        ? response.generate_video_response
        : null;
    const generatedSamples = Array.isArray(generateVideoResponse?.generatedSamples)
      ? generateVideoResponse.generatedSamples
      : Array.isArray(generateVideoResponse?.generated_samples)
        ? generateVideoResponse.generated_samples
        : [];
    const firstSample = generatedSamples.find((item) => isRecord(item));
    const video = firstSample && isRecord(firstSample.video) ? firstSample.video : null;
    const videoUri = typeof video?.uri === "string" ? video.uri : null;

    if (!videoUri) {
      return {
        done: true,
        success: false,
        errorCode: "video_output_missing",
        errorMessage: "Veo response did not contain a generated video URI",
        raw: data,
      };
    }

    const durationSeconds = readNumericCandidate(
      isRecord(generateVideoResponse?.generationParameters)
        ? generateVideoResponse?.generationParameters.durationSeconds
        : null
    ) ??
      readNumericCandidate(
        isRecord(generateVideoResponse?.generation_parameters)
          ? generateVideoResponse?.generation_parameters.duration_seconds
          : null
      ) ??
      readNumericCandidate(
        isRecord(generateVideoResponse?.generationParameters)
          ? generateVideoResponse?.generationParameters.duration_seconds
          : null
      ) ??
      readNumericCandidate(
        isRecord(generateVideoResponse?.generation_parameters)
          ? generateVideoResponse?.generation_parameters.durationSeconds
          : null
      ) ??
      null;

    return {
      done: true,
      success: true,
      output: {
        raw: data,
        assets: [
          {
            url: videoUri,
            type: "video",
            ...(durationSeconds !== null ? { durationSeconds } : {}),
          },
        ],
        ...(durationSeconds !== null ? { durationSeconds } : {}),
      },
      actualCost: 0,
      raw: data,
    };
  }

  private async submitImage(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const baseUrl = buildBaseUrl(input.provider);
    const submitUrl = new URL(`models/${input.upstreamModelSlug}:generateContent`, `${baseUrl}/`);
    submitUrl.searchParams.set("key", input.provider.secret);

    const prompt =
      input.prompt ??
      (typeof input.input.prompt === "string" ? input.input.prompt : null);

    if (!prompt) {
      throw new Error("Gemini direct requests require a prompt");
    }

    const requestBody: Record<string, unknown> = {
      ...(isRecord(input.input) ? input.input : {}),
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        ...(isRecord(input.input.generationConfig) ? input.input.generationConfig : {}),
        responseModalities: ["IMAGE"],
      },
    };

    const { data } = await postJson<Record<string, unknown>>(submitUrl.toString(), {
      body: requestBody,
    });

    const candidates = Array.isArray(data.candidates) ? data.candidates : [];
    const parts = candidates.flatMap((candidate) => {
      const content = isRecord(candidate) ? candidate.content : null;
      return isRecord(content) && Array.isArray(content.parts) ? content.parts : [];
    });

    const assets = parts.flatMap((part) => {
      if (!isRecord(part)) {
        return [];
      }

      const inlineData = isRecord(part.inlineData)
        ? part.inlineData
        : isRecord(part.inline_data)
          ? part.inline_data
          : null;

      if (!inlineData || typeof inlineData.data !== "string") {
        return [];
      }

      const mimeType =
        typeof inlineData.mimeType === "string"
          ? inlineData.mimeType
          : typeof inlineData.mime_type === "string"
            ? inlineData.mime_type
            : "image/png";

      return [
        {
          url: `data:${mimeType};base64,${inlineData.data}`,
          type: "image",
        },
      ];
    });

    if (assets.length === 0) {
      throw new Error("Gemini direct response did not contain image output");
    }

    return {
      mode: "sync",
      upstreamRequestId:
        typeof data.responseId === "string"
          ? data.responseId
          : typeof data.response_id === "string"
            ? data.response_id
            : input.requestId,
      output: {
        raw: data,
        assets,
      },
      estimatedCost: 0,
    };
  }

  private async submitVideo(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const baseUrl = buildBaseUrl(input.provider);
    const submitUrl = new URL(
      `models/${input.upstreamModelSlug}:predictLongRunning`,
      `${baseUrl}/`
    );

    const prompt =
      input.prompt ??
      (typeof input.input.prompt === "string" ? input.input.prompt : null);

    if (!prompt) {
      throw new Error("Gemini direct video requests require a prompt");
    }

    const requestInput = isRecord(input.input) ? input.input : {};
    const instances: Record<string, unknown> = {
      prompt,
    };

    for (const key of ["image", "lastFrame", "last_frame", "referenceImages", "reference_images", "video"]) {
      if (key in requestInput) {
        instances[key] = requestInput[key];
      }
    }

    const parameters =
      isRecord(requestInput.parameters) ? requestInput.parameters : {};

    for (const key of [
      "aspectRatio",
      "aspect_ratio",
      "durationSeconds",
      "duration_seconds",
      "resolution",
      "numberOfVideos",
      "number_of_videos",
      "personGeneration",
      "person_generation",
      "seed",
    ]) {
      if (key in requestInput && !(key in parameters)) {
        parameters[key] = requestInput[key];
      }
    }

    const body: Record<string, unknown> = {
      instances: [instances],
      ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
    };

    const { data } = await postJson<Record<string, unknown>>(submitUrl.toString(), {
      headers: {
        "x-goog-api-key": input.provider.secret,
      },
      body,
    });

    const operationName = typeof data.name === "string" ? data.name : null;
    if (!operationName) {
      throw new Error("Veo response did not contain an operation name");
    }

    return {
      mode: "async",
      upstreamRequestId: operationName,
      upstreamTaskId: operationName,
      pollAfterSeconds: 10,
      estimatedCost: 0,
    };
  }
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
