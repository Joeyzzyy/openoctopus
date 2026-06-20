import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";
import { buildGatewayErrorResponse, isGatewayValidationError } from "@/lib/gateway-errors";
import {
  getAuthedWorkspaceForPlayground,
  getOrCreateWorkspacePlaygroundKey,
} from "@/lib/playground-key-server";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const allowedMimeTypes = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["audio/mpeg", "mp3"],
  ["audio/wav", "wav"],
  ["audio/x-wav", "wav"],
  ["audio/mp4", "m4a"],
  ["audio/aac", "aac"],
  ["audio/ogg", "ogg"],
  ["audio/webm", "webm"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

const uploadSchema = z.object({
  field: z.string().trim().min(1).default("images"),
  model: z.string().trim().min(1).max(120).optional(),
  capability: z.enum([
    "image_generation",
    "image_edit",
    "image_recognition",
    "document_analysis",
    "text_generation",
    "video_generation",
  ]).optional(),
});

function resolveGatewayBaseUrl() {
  return process.env.OPENOCTOPUS_API_BASE_URL?.trim() || PUBLIC_API_BASE_URL;
}

async function extractDocumentCharacterInfo(file: File, buffer: Buffer) {
  try {
    if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value.replace(/\s+/g, " ").trim();
      return text ? { characterCount: text.length, extractionSource: "docx" } : null;
    }

    if (file.type === "application/msword") {
      const extractor = new WordExtractor();
      const extracted = await extractor.extract(buffer);
      const text = extracted.getBody().replace(/\s+/g, " ").trim();
      return text ? { characterCount: text.length, extractionSource: "doc" } : null;
    }
  } catch {
    return null;
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const { workspaceId, userId } = await getAuthedWorkspaceForPlayground();
    const formData = await request.formData();
    const parsed = uploadSchema.parse({
      field: formData.get("field") ?? "images",
      model: formData.get("model") ?? undefined,
      capability: formData.get("capability") ?? undefined,
    });
    const file = formData.get("file");

    if (!(file instanceof File)) {
      const response = await buildGatewayErrorResponse({
        code: "invalid_request",
        statusCode: 400,
      });
      return NextResponse.json(response.payload, { status: response.statusCode });
    }

    const extension = allowedMimeTypes.get(file.type);
    if (!extension || file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      const response = await buildGatewayErrorResponse({
        code: "invalid_request",
        statusCode: 400,
      });
      return NextResponse.json(
        {
          error: {
            ...response.payload.error,
            message:
              "Upload must be a supported image, video, audio, or DOC/DOCX document no larger than 10MB.",
          },
        },
        { status: response.statusCode }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const characterInfo = await extractDocumentCharacterInfo(file, buffer);
    const { secret } = await getOrCreateWorkspacePlaygroundKey(workspaceId, userId);
    const requestUrl = new URL("/v1/uploads", resolveGatewayBaseUrl());
    requestUrl.searchParams.set("filename", `${randomUUID()}-${file.name}`);
    requestUrl.searchParams.set("field", parsed.field);
    if (parsed.model) requestUrl.searchParams.set("model", parsed.model);
    if (parsed.capability) requestUrl.searchParams.set("capability", parsed.capability);

    const uploadResponse = await fetch(requestUrl, {
      method: "POST",
      headers: {
        "content-type": file.type,
        authorization: `Bearer ${secret}`,
      },
      body: buffer,
      cache: "no-store",
    });
    const uploadJson = (await uploadResponse.json().catch(() => ({}))) as Record<string, unknown>;
    if (!uploadResponse.ok) {
      return NextResponse.json(uploadJson, { status: uploadResponse.status });
    }

    return NextResponse.json({
      ...uploadJson,
      name: file.name,
      ...(characterInfo ? {
        characterCount: characterInfo.characterCount,
        extractionSource: characterInfo.extractionSource,
      } : {}),
    });
  } catch (error) {
    console.error("[playground/uploads] upload failed", error);

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
    return NextResponse.json(
      {
        ...response.payload,
        ...(process.env.NODE_ENV !== "production" && error instanceof Error
          ? { debugMessage: error.message }
          : {}),
      },
      { status: response.statusCode }
    );
  }
}
