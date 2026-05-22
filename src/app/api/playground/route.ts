import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAuthedWorkspaceForPlayground,
  getOrCreateWorkspacePlaygroundKey,
} from "@/lib/playground-key-server";
import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";
import { buildGatewayErrorResponse, isGatewayValidationError } from "@/lib/gateway-errors";

const submitSchema = z.object({
  action: z.literal("submit"),
  endpoint: z.enum([
    "/v1/documents/analyses",
    "/v1/images/generations",
    "/v1/images/edits",
    "/v1/images/recognitions",
    "/v1/chat/completions",
    "/v1/videos/generations",
  ]),
  model: z.string().min(1),
  prompt: z.string().optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

const statusSchema = z.object({
  action: z.literal("status"),
  taskId: z.string().uuid(),
});

function resolveGatewayBaseUrl() {
  return process.env.OPENOCTOPUS_API_BASE_URL?.trim() || PUBLIC_API_BASE_URL;
}

const INTEGER_INPUT_PARAM_KEYS = new Set([
  "max_tokens",
  "max_output_tokens",
  "seed",
  "n",
  "num_images",
  "top_k",
]);

const NUMBER_INPUT_PARAM_KEYS = new Set([
  "temperature",
  "top_p",
  "presence_penalty",
  "frequency_penalty",
]);

function sanitizePlaygroundInputValue(key: string | null, value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return undefined;
    }

    if (key && INTEGER_INPUT_PARAM_KEYS.has(key) && /^-?\d+$/.test(trimmed)) {
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    if (key && NUMBER_INPUT_PARAM_KEYS.has(key) && /^-?\d+(?:\.\d+)?$/.test(trimmed)) {
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizePlaygroundInputValue(null, item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      const sanitized = sanitizePlaygroundInputValue(entryKey, entryValue);
      if (sanitized !== undefined) {
        next[entryKey] = sanitized;
      }
    }
    return next;
  }

  return value;
}

function sanitizePlaygroundInput(input: Record<string, unknown>) {
  return (sanitizePlaygroundInputValue(null, input) as Record<string, unknown>) ?? {};
}

function sanitizePlaygroundOutputPayload(outputPayload: unknown) {
  if (!outputPayload || typeof outputPayload !== "object" || Array.isArray(outputPayload)) {
    return outputPayload;
  }

  const record = outputPayload as Record<string, unknown>;
  const rest = { ...record };
  delete rest.raw;
  const assets = Array.isArray(rest.assets) ? rest.assets : null;

  if (!assets) {
    return rest;
  }

  return {
    ...rest,
    assets: assets.map((asset) => {
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) {
        return asset;
      }
      const assetRecord = asset as Record<string, unknown>;
      const assetRest = { ...assetRecord };
      delete assetRest.sourceUrl;
      return assetRest;
    }),
  };
}

export async function POST(request: Request) {
  const apiBase = resolveGatewayBaseUrl();
  try {
    const body = await request.json();
    const parsed = z.union([submitSchema, statusSchema]).parse(body);
    const { workspaceId, userId } = await getAuthedWorkspaceForPlayground();
    const { secret } = await getOrCreateWorkspacePlaygroundKey(workspaceId, userId);

    if (parsed.action === "submit") {
      const sanitizedInput = sanitizePlaygroundInput(parsed.input);
      const payload: Record<string, unknown> = {
        model: parsed.model,
        input: sanitizedInput,
      };
      const requestUrl = `${apiBase}${parsed.endpoint}`;
      if (parsed.endpoint === "/v1/chat/completions") {
        const rawMessages = sanitizedInput.messages;
        if (rawMessages !== undefined) {
          payload.messages = rawMessages;
        }
      }
      if (parsed.prompt && parsed.prompt.trim().length > 0) {
        payload.prompt = parsed.prompt;
      }

      const submitResponse = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${secret}`,
          "x-openoctopus-request-source": "playground",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      const submitJson = (await submitResponse.json().catch(() => ({}))) as Record<string, unknown>;
      if (!submitResponse.ok) {
        return NextResponse.json(
          {
            error: submitJson?.error ?? { message: "Failed to submit request" },
            apiBase,
            requestUrl,
            upstreamStatus: submitResponse.status,
            upstreamBody: submitJson,
            source: "gateway",
          },
          { status: submitResponse.status }
        );
      }

      return NextResponse.json(submitJson);
    }

    const requestUrl = `${apiBase}/v1/tasks/${parsed.taskId}`;
    const statusResponse = await fetch(requestUrl, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
      },
      cache: "no-store",
    });
    const statusJson = (await statusResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!statusResponse.ok) {
      return NextResponse.json(
        {
          error: statusJson?.error ?? { message: "Failed to query task status" },
          apiBase,
          requestUrl,
          upstreamStatus: statusResponse.status,
          upstreamBody: statusJson,
          source: "gateway",
        },
        { status: statusResponse.status }
      );
    }

    const sanitized =
      statusJson && typeof statusJson === "object" && !Array.isArray(statusJson)
        ? ({
            ...statusJson,
            output_payload: sanitizePlaygroundOutputPayload(
              (statusJson as Record<string, unknown>).output_payload
            ),
          } as Record<string, unknown>)
        : statusJson;

    return NextResponse.json(sanitized);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected proxy failure";
    if (isGatewayValidationError(error)) {
      const response = await buildGatewayErrorResponse({
        code: "invalid_request",
        statusCode: 400,
      });
      return NextResponse.json(
        {
          ...response.payload,
          apiBase,
          source: "playground_proxy",
          proxyError: message,
        },
        { status: response.statusCode }
      );
    }

    if (error instanceof Error && error.message === "Not authenticated") {
      const response = await buildGatewayErrorResponse({
        code: "unauthorized",
        statusCode: 401,
      });
      return NextResponse.json(
        {
          ...response.payload,
          apiBase,
          source: "playground_proxy",
          proxyError: message,
        },
        { status: response.statusCode }
      );
    }

    const response = await buildGatewayErrorResponse({
      code: "internal_error",
      statusCode: 500,
    });
    return NextResponse.json(
      {
        ...response.payload,
        apiBase,
        source: "playground_proxy",
        proxyError: message,
      },
      { status: response.statusCode }
    );
  }
}
