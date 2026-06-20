import type { ModelDocRow } from "../models/data";

export type JsonSchemaField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "array";
  required: boolean;
  description?: string;
  exposedToCustomer: boolean;
  enumValues?: string[];
  minimum?: number;
  maximum?: number;
  step?: number;
  maxItems?: number;
};

export type UploadFieldKind = "image" | "video" | "audio" | "document";

function splitFieldPath(key: string) {
  return key
    .split(".")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function getFieldLeafKey(key: string) {
  const segments = splitFieldPath(key);
  return (segments[segments.length - 1] ?? key).trim().toLowerCase();
}


export function isImageUploadField(field: JsonSchemaField) {
  const key = field.key.trim().toLowerCase();
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  if (["num_images", "number_of_images", "image_count", "n_images"].includes(leafKey)) return false;
  return (
    leafKey === "images" ||
    leafKey === "image" ||
    leafKey === "face_image" ||
    leafKey === "source_image" ||
    leafKey === "target_image" ||
    leafKey === "input_image" ||
    leafKey === "reference_image" ||
    leafKey === "init_image" ||
    leafKey === "mask_image" ||
    leafKey === "image_url" ||
    leafKey === "reference_url" ||
    leafKey === "mask_url" ||
    leafKey.endsWith("_image") ||
    leafKey.endsWith("_images") ||
    key.endsWith(".image_url") ||
    key.endsWith(".reference_url") ||
    key.endsWith(".mask_url")
  );
}

export function isMaskUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  return leafKey === "mask" || leafKey === "mask_image" || leafKey === "mask_url";
}

export function isReferenceImageUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  return leafKey === "reference_image" || leafKey === "reference_url";
}

export function isEditableBaseImageField(field: JsonSchemaField) {
  if (!isImageUploadField(field)) return false;
  if (isMaskUploadField(field) || isReferenceImageUploadField(field) || isFaceImageField(field)) {
    return false;
  }
  return true;
}

export function isVideoUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  return (
    leafKey === "video" ||
    leafKey === "videos" ||
    leafKey === "reference_video" ||
    leafKey === "reference_videos" ||
    leafKey === "source_video" ||
    leafKey === "input_video" ||
    leafKey === "target_video" ||
    leafKey === "video_url" ||
    leafKey.endsWith("_video") ||
    leafKey.endsWith("_videos")
  );
}

export function isAudioUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  return (
    leafKey === "audio" ||
    leafKey === "audios" ||
    leafKey === "reference_audio" ||
    leafKey === "reference_audios" ||
    leafKey === "source_audio" ||
    leafKey === "input_audio" ||
    leafKey === "target_audio" ||
    leafKey === "audio_url" ||
    leafKey.endsWith("_audio") ||
    leafKey.endsWith("_audios")
  );
}

export function isDocumentUploadField(field: JsonSchemaField) {
  const key = field.key.trim().toLowerCase();
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  return (
    leafKey === "file" ||
    leafKey === "document" ||
    leafKey === "file_url" ||
    leafKey === "document_url" ||
    key.endsWith(".file") ||
    key.endsWith(".document") ||
    key.endsWith(".file_url") ||
    key.endsWith(".document_url") ||
    leafKey.endsWith("_file") ||
    leafKey.endsWith("_document")
  );
}

export function getUploadFieldKind(field: JsonSchemaField): UploadFieldKind | null {
  if (isImageUploadField(field)) return "image";
  if (isVideoUploadField(field)) return "video";
  if (isAudioUploadField(field)) return "audio";
  if (isDocumentUploadField(field)) return "document";
  return null;
}

export function isUploadField(field: JsonSchemaField) {
  return getUploadFieldKind(field) !== null;
}

export function normalizeImageFieldKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function isFaceImageField(field: JsonSchemaField) {
  const normalized = normalizeImageFieldKey(field.key);
  return normalized === "faceimage" || normalized.includes("face");
}

export function canUseHistoryImageForField(field: JsonSchemaField) {
  if (!isImageUploadField(field)) return false;
  const normalized = normalizeImageFieldKey(field.key);
  if (!normalized) return false;
  return !["faceimage", "maskimage"].includes(normalized);
}

export function pickPlaygroundExampleForField(
  field: JsonSchemaField,
  examples: ModelDocRow["playgroundInputExamples"]
) {
  const normalizedFieldKey = normalizeImageFieldKey(field.key);
  const exact = examples.find((item) => normalizeImageFieldKey(item.fieldKey) === normalizedFieldKey);
  if (exact) return exact;
  if (isFaceImageField(field)) return null;
  return examples.find((item) => item.fieldKey === null) ?? null;
}

export function isMultipleUploadField(field: JsonSchemaField) {
  const key = field.key.trim().toLowerCase();
  return (
    field.type === "array" ||
    key === "images" ||
    key === "videos" ||
    key === "audios" ||
    key.endsWith("_images") ||
    key.endsWith("_videos") ||
    key.endsWith("_audios")
  );
}

export function getUploadLimit(field: JsonSchemaField) {
  const configuredMaxItems =
    typeof field.maxItems === "number" && Number.isFinite(field.maxItems)
      ? Math.max(1, Math.floor(field.maxItems))
      : null;
  if (configuredMaxItems !== null) {
    return configuredMaxItems;
  }
  return isMultipleUploadField(field) ? null : 1;
}

export function getUploadAccept(kind: UploadFieldKind) {
  if (kind === "video") return "video/mp4,video/webm,video/quicktime";
  if (kind === "audio") return "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/webm";
  if (kind === "document") return "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "image/png,image/jpeg,image/webp,image/gif";
}

export function getUploadHelpText(kind: UploadFieldKind) {
  if (kind === "video") {
    return "Upload MP4, WebM, or MOV videos. They are converted to secure URLs before submission.";
  }
  if (kind === "audio") {
    return "Upload MP3, WAV, M4A, AAC, OGG, or WebM audio. They are converted to secure URLs before submission.";
  }
  if (kind === "document") {
    return "Upload DOC or DOCX files. They are converted to secure URLs before submission.";
  }
  return "Upload PNG, JPEG, WebP, or GIF images. They are converted to secure URLs before submission.";
}

export function appendUploadLimitText(baseText: string, field: JsonSchemaField) {
  const limit = getUploadLimit(field);
  if (limit === null) {
    return baseText;
  }
  return `${baseText} Max ${limit} file${limit === 1 ? "" : "s"}.`;
}

export function getUploadTitle(kind: UploadFieldKind) {
  if (kind === "video") return "video";
  if (kind === "audio") return "audio";
  if (kind === "document") return "document";
  return "image";
}
