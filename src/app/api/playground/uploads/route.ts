import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";

import { buildGatewayErrorResponse, isGatewayValidationError } from "@/lib/gateway-errors";
import { getAuthedWorkspaceForPlayground } from "@/lib/playground-key-server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const UPLOAD_BUCKET = process.env.GENERATED_ASSETS_BUCKET || "generated-assets";

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
});

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
    const { workspaceId } = await getAuthedWorkspaceForPlayground();
    const formData = await request.formData();
    const parsed = uploadSchema.parse({
      field: formData.get("field") ?? "images",
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
              "Upload must be a supported image, video, audio, or DOC/DOCX document no larger than 100MB.",
          },
        },
        { status: response.statusCode }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const characterInfo = await extractDocumentCharacterInfo(file, buffer);
    const supabaseAdmin = createAdminClient();
    const storagePath = `playground-uploads/${workspaceId}/${parsed.field}/${randomUUID()}.${extension}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(UPLOAD_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(UPLOAD_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      throw new Error(signedUrlError?.message ?? "Failed to create upload URL");
    }

    return NextResponse.json({
      url: signedUrlData.signedUrl,
      mimeType: file.type,
      name: file.name,
      size: file.size,
      ...(characterInfo ? {
        characterCount: characterInfo.characterCount,
        extractionSource: characterInfo.extractionSource,
      } : {}),
      expiresIn: SIGNED_URL_TTL_SECONDS,
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
