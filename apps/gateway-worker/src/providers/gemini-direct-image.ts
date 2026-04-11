import { postJson } from "../lib/http.js";
import type { ProviderAdapter, SubmitRequestInput, SubmitRequestResult } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildBaseUrl(input: SubmitRequestInput) {
  const rawBaseUrl = input.provider.baseUrl ?? "https://generativelanguage.googleapis.com";
  const baseUrl = rawBaseUrl.replace(/\/$/, "");
  const apiVersion = isRecord(input.provider.config) && typeof input.provider.config.apiVersion === "string"
    ? input.provider.config.apiVersion
    : "v1beta";

  return /\/v\d/.test(baseUrl) ? baseUrl : `${baseUrl}/${apiVersion}`;
}

export class GeminiDirectImageAdapter implements ProviderAdapter {
  slug = "gemini-direct";

  async submit(input: SubmitRequestInput): Promise<SubmitRequestResult> {
    const baseUrl = buildBaseUrl(input);
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
}
