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
    "/v1/images/generations",
    "/v1/images/edits",
    "/v1/images/recognitions",
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

function sanitizePlaygroundOutputPayload(outputPayload: unknown) {
  if (!outputPayload || typeof outputPayload !== "object" || Array.isArray(outputPayload)) {
    return outputPayload;
  }

  const record = outputPayload as Record<string, unknown>;
  const { raw: _raw, ...rest } = record;
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
      const { sourceUrl: _sourceUrl, ...assetRest } = assetRecord;
      return assetRest;
    }),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = z.union([submitSchema, statusSchema]).parse(body);
    const { workspaceId, userId } = await getAuthedWorkspaceForPlayground();
    const { secret } = await getOrCreateWorkspacePlaygroundKey(workspaceId, userId);
    const apiBase = resolveGatewayBaseUrl();

    if (parsed.action === "submit") {
      const payload: Record<string, unknown> = {
        model: parsed.model,
        input: parsed.input,
      };
      if (parsed.prompt && parsed.prompt.trim().length > 0) {
        payload.prompt = parsed.prompt;
      }

      const submitResponse = await fetch(`${apiBase}${parsed.endpoint}`, {
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
          { error: submitJson?.error ?? { message: "Failed to submit request" } },
          { status: submitResponse.status }
        );
      }

      return NextResponse.json(submitJson);
    }

    const statusResponse = await fetch(`${apiBase}/v1/tasks/${parsed.taskId}`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${secret}`,
      },
      cache: "no-store",
    });
    const statusJson = (await statusResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: statusJson?.error ?? { message: "Failed to query task status" } },
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
    if (isGatewayValidationError(error)) {
      const response = await buildGatewayErrorResponse({
        code: "invalid_request",
        statusCode: 400,
      });
      return NextResponse.json(response.payload, { status: response.statusCode });
    }

    if (error instanceof Error && error.message === "Not authenticated") {
      const response = await buildGatewayErrorResponse({
        code: "unauthorized",
        statusCode: 401,
      });
      return NextResponse.json(response.payload, { status: response.statusCode });
    }

    const response = await buildGatewayErrorResponse({
      code: "internal_error",
      statusCode: 500,
    });
    return NextResponse.json(response.payload, { status: response.statusCode });
  }
}
