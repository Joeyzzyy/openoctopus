"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod/v4";
import { deriveLegacyBillingFields, parseBillingConfig } from "@/lib/billing-config";
import {
  INTERNAL_ACCESS_COOKIE,
  INTERNAL_ACCESS_COOKIE_VALUE,
  INTERNAL_ACCESS_PASSWORD,
} from "@/lib/internal-access";
import { encryptProviderSecret } from "@/lib/provider-secret-crypto";
import {
  getProviderModelRuntimeDiagnostics,
  getRoutingRuleRuntimeDiagnostics,
  type RuntimeCredential,
  type RuntimeProvider,
  type RuntimeProviderModel,
  type RuntimeSupportedModel,
} from "@/lib/provider-runtime-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const providerStatusSchema = z.enum(["healthy", "degraded", "offline"]);
const capabilitySchema = z.enum([
  "image_generation",
  "image_edit",
  "video_generation",
]);
const modalitySchema = z.enum(["image", "video", "audio"]);
const modelVendorNameSchema = z.string().trim().min(2).max(80);
const MODEL_SHOWCASE_BUCKET = "model-showcase-assets";

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toReadableSupabaseError(error: unknown, fallback: string) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? "")
        : String(error ?? "");

  if (message.includes("<!DOCTYPE html") || message.includes("522: Connection timed out")) {
    return `${fallback}：Supabase 服务连接超时（Cloudflare 522），请稍后重试。`;
  }

  if (message.includes("fetch failed") || message.includes("network error")) {
    return `${fallback}：Supabase 网络请求失败，请稍后重试。`;
  }

  return message || fallback;
}

function parseBooleanField(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function isNonEmptyFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function sanitizePathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "asset";
}

function inferImageExtension(file: File) {
  const fromType =
    file.type === "image/png"
      ? "png"
      : file.type === "image/jpeg"
        ? "jpg"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "";
  if (fromType) return fromType;
  const fromName = file.name.split(".").pop()?.trim().toLowerCase();
  if (fromName && ["png", "jpg", "jpeg", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  return "png";
}

async function uploadShowcaseImage(input: {
  supabase: ReturnType<typeof createAdminClient>;
  providerModelId: string;
  file: File;
  kind: "cover" | "gallery";
  index?: number;
}) {
  const extension = inferImageExtension(input.file);
  const baseName = sanitizePathPart(input.file.name.replace(/\.[^.]+$/, ""));
  const path =
    input.kind === "cover"
      ? `provider-model-showcase/${input.providerModelId}/cover-${Date.now()}-${baseName}.${extension}`
      : `provider-model-showcase/${input.providerModelId}/gallery-${Date.now()}-${input.index ?? 0}-${baseName}.${extension}`;
  const buffer = Buffer.from(await input.file.arrayBuffer());
  const { error: uploadError } = await input.supabase.storage
    .from(MODEL_SHOWCASE_BUCKET)
    .upload(path, buffer, {
      contentType: input.file.type || "image/png",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = input.supabase.storage
    .from(MODEL_SHOWCASE_BUCKET)
    .getPublicUrl(path);

  return {
    storage_bucket: MODEL_SHOWCASE_BUCKET,
    storage_path: path,
    public_url: publicUrlData.publicUrl,
  };
}

async function syncProviderModelShowcaseAssets(input: {
  supabase: ReturnType<typeof createAdminClient>;
  providerModelId: string;
  coverFile: File | null;
  coverPrompt: string | null;
  existingCoverAssetId: string | null;
  existingCoverPrompt: string | null;
  removeCover: boolean;
  galleryFiles: File[];
  galleryPrompts: string[];
  existingGalleryPromptUpdates: Array<{ id: string; prompt: string | null }>;
  deleteGalleryAssetIds: string[];
  replaceGallery: boolean;
}) {
  const { data: existingRows, error: existingError } = await input.supabase
    .from("provider_model_showcase_assets")
    .select("id, asset_kind, storage_bucket, storage_path, sort_order, alt_text")
    .eq("provider_model_id", input.providerModelId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existing = existingRows ?? [];
  const existingCover = existing.filter((row) => row.asset_kind === "cover");
  const existingGallery = existing.filter((row) => row.asset_kind === "gallery");
  const existingGalleryById = new Map(existingGallery.map((row) => [row.id, row]));

  const deleteRows = async (
    rows: Array<{
      id: string;
      storage_bucket: string;
      storage_path: string;
    }>
  ) => {
    if (rows.length === 0) return;
    const rowsByBucket = rows.reduce((map, row) => {
      const list = map.get(row.storage_bucket) ?? [];
      list.push(row.storage_path);
      map.set(row.storage_bucket, list);
      return map;
    }, new Map<string, string[]>());

    for (const [bucket, paths] of rowsByBucket.entries()) {
      await input.supabase.storage.from(bucket).remove(paths);
    }

    const { error } = await input.supabase
      .from("provider_model_showcase_assets")
      .delete()
      .in("id", rows.map((row) => row.id));

    if (error) {
      throw new Error(error.message);
    }
  };

  if (input.removeCover || input.coverFile) {
    await deleteRows(existingCover);
  }

  if (!input.removeCover && !input.coverFile && input.existingCoverAssetId) {
    const coverPrompt = input.existingCoverPrompt?.trim() || null;
    const existingCoverRow = existingCover.find((row) => row.id === input.existingCoverAssetId);
    if (existingCoverRow && (existingCoverRow.alt_text ?? null) !== coverPrompt) {
      const { error } = await input.supabase
        .from("provider_model_showcase_assets")
        .update({ alt_text: coverPrompt })
        .eq("id", existingCoverRow.id);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  if (input.replaceGallery && existingGallery.length > 0) {
    await deleteRows(existingGallery);
  }

  if (!input.replaceGallery && input.deleteGalleryAssetIds.length > 0) {
    await deleteRows(
      existingGallery.filter((row) => input.deleteGalleryAssetIds.includes(row.id))
    );
  }

  if (!input.replaceGallery) {
    for (const item of input.existingGalleryPromptUpdates) {
      if (input.deleteGalleryAssetIds.includes(item.id)) continue;
      const existingRow = existingGalleryById.get(item.id);
      if (!existingRow) continue;
      if ((existingRow.alt_text ?? null) === item.prompt) continue;
      const { error } = await input.supabase
        .from("provider_model_showcase_assets")
        .update({ alt_text: item.prompt })
        .eq("id", item.id);
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  if (input.coverFile) {
    const uploaded = await uploadShowcaseImage({
      supabase: input.supabase,
      providerModelId: input.providerModelId,
      file: input.coverFile,
      kind: "cover",
    });
    const { error } = await input.supabase.from("provider_model_showcase_assets").insert({
      provider_model_id: input.providerModelId,
      asset_kind: "cover",
      ...uploaded,
      alt_text: input.coverPrompt,
      sort_order: 0,
    });
    if (error) {
      throw new Error(error.message);
    }
  }

  if (input.galleryFiles.length > 0) {
    const remainingGallery = input.replaceGallery
      ? []
      : existingGallery.filter((row) => !input.deleteGalleryAssetIds.includes(row.id));
    const nextSortOrder = input.replaceGallery
      ? 0
      : remainingGallery.reduce((max, row) => Math.max(max, Number(row.sort_order ?? 0)), -1) + 1;

    for (const [index, file] of input.galleryFiles.entries()) {
      const uploaded = await uploadShowcaseImage({
        supabase: input.supabase,
        providerModelId: input.providerModelId,
        file,
        kind: "gallery",
        index,
      });
      const { error } = await input.supabase.from("provider_model_showcase_assets").insert({
        provider_model_id: input.providerModelId,
        asset_kind: "gallery",
        ...uploaded,
        alt_text: input.galleryPrompts[index] || null,
        sort_order: nextSortOrder + index,
      });
      if (error) {
        throw new Error(error.message);
      }
    }
  }
}

function parseStringArray(value: FormDataEntryValue | null) {
  const raw = normalizeOptionalText(value);
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeProviderRegions(regions: string[]) {
  if (regions.length === 0) {
    return ["global"];
  }

  return regions;
}

function parseJsonField(value: FormDataEntryValue | null, fallback: Record<string, unknown> = {}) {
  const raw = normalizeOptionalText(value);
  if (!raw) {
    return fallback;
  }

  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON fields must contain an object");
  }

  return parsed as Record<string, unknown>;
}

function parseBillingConfigField(value: FormDataEntryValue | null) {
  const config = parseBillingConfig(parseJsonField(value));
  return {
    config,
    legacyFields: deriveLegacyBillingFields(config),
  };
}

function assertBillingConfig(value: unknown) {
  parseBillingConfig(value);
}

function formatRuntimeDiagnosticsForError(summary: string, diagnostics: string[]) {
  if (diagnostics.length === 0) {
    return summary;
  }

  return `${summary}\n- ${diagnostics.join("\n- ")}`;
}

function buildInternalAlertHref(input: {
  tab: "public-models" | "economics" | "monitoring-requests";
  message: string;
  level: "success" | "warning" | "error" | "info";
}) {
  return `/internal?tab=${input.tab}&alert=${encodeURIComponent(input.message)}&alertLevel=${input.level}`;
}

function normalizeUsageWorkspaceId(workspaceId: string) {
  if (workspaceId === "00000000-0000-0000-0000-000000000000") {
    return null;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId)
    ? workspaceId
    : null;
}

async function loadProviderRuntimeContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    providerId?: string;
    providerModelIds?: string[];
    supportedModelIds?: string[];
  }
) {
  const providerIds = new Set<string>();

  if (input.providerId) {
    providerIds.add(input.providerId);
  }

  const providerModels = input.providerModelIds && input.providerModelIds.length > 0
    ? await supabase
        .from("provider_models")
        .select("id, provider_id, supported_model_id, upstream_model_slug, capability, active, execution_template, execution_config")
        .in("id", input.providerModelIds)
    : { data: [], error: null };

  if (providerModels.error) {
    throw new Error(providerModels.error.message);
  }

  for (const providerModel of providerModels.data ?? []) {
    providerIds.add(providerModel.provider_id);
  }

  const supportedModelIds = new Set<string>(input.supportedModelIds ?? []);
  for (const providerModel of providerModels.data ?? []) {
    if (providerModel.supported_model_id) {
      supportedModelIds.add(providerModel.supported_model_id);
    }
  }

  const [providersResponse, credentialsResponse, supportedModelsResponse, workerTemplatesResponse] = await Promise.all([
    providerIds.size > 0
      ? supabase
          .from("providers")
          .select("id, name, slug, status")
          .in("id", Array.from(providerIds))
      : Promise.resolve({ data: [], error: null }),
    providerIds.size > 0
      ? supabase
          .from("provider_credentials")
          .select("id, label, provider_id, secret_source, environment, is_active, secret_ciphertext, secret_iv, secret_auth_tag")
          .in("provider_id", Array.from(providerIds))
      : Promise.resolve({ data: [], error: null }),
    supportedModelIds.size > 0
      ? supabase
          .from("supported_models")
          .select("id, model_slug, capability")
          .in("id", Array.from(supportedModelIds))
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("worker_templates")
      .select("slug, config")
      .eq("active", true),
  ]);

  if (providersResponse.error) {
    throw new Error(providersResponse.error.message);
  }
  if (credentialsResponse.error) {
    throw new Error(credentialsResponse.error.message);
  }
  if (supportedModelsResponse.error) {
    throw new Error(supportedModelsResponse.error.message);
  }
  if (workerTemplatesResponse.error) {
    throw new Error(workerTemplatesResponse.error.message);
  }

  return {
    providersById: new Map(
      ((providersResponse.data ?? []) as RuntimeProvider[]).map((provider) => [provider.id, provider])
    ),
    providerModelsById: new Map(
      ((providerModels.data ?? []) as RuntimeProviderModel[]).map((providerModel) => [
        providerModel.id,
        providerModel,
      ])
    ),
    supportedModelsById: new Map(
      ((supportedModelsResponse.data ?? []) as RuntimeSupportedModel[]).map((supportedModel) => [
        supportedModel.id,
        supportedModel,
      ])
    ),
    credentialsByProviderId: ((credentialsResponse.data ?? []) as Array<
      RuntimeCredential & {
        secret_ciphertext?: string | null;
        secret_iv?: string | null;
        secret_auth_tag?: string | null;
      }
    >).reduce((map, credential) => {
      const list = map.get(credential.provider_id) ?? [];
      list.push({
        id: credential.id,
        label: credential.label,
        provider_id: credential.provider_id,
        secret_source: credential.secret_source,
        environment: credential.environment,
        is_active: credential.is_active,
        has_encrypted_secret_material: Boolean(
          credential.secret_ciphertext && credential.secret_iv && credential.secret_auth_tag
        ),
      });
      map.set(credential.provider_id, list);
      return map;
    }, new Map<string, RuntimeCredential[]>()),
    workerTemplatesBySlug: new Map(
      ((workerTemplatesResponse.data ?? []) as Array<{ slug: string; config: Record<string, unknown> | null }>)
        .map((worker) => [worker.slug, worker] as const)
    ),
  };
}

async function getInternalAdminContext() {
  const cookieStore = await cookies();
  const hasPasswordAccess =
    cookieStore.get(INTERNAL_ACCESS_COOKIE)?.value === INTERNAL_ACCESS_COOKIE_VALUE;

  if (hasPasswordAccess) {
    return {
      supabase: createAdminClient(),
      userId: "internal-password-access",
      workspaceId: "00000000-0000-0000-0000-000000000000",
      isPasswordAccess: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    throw new Error("Missing workspace membership");
  }

  if (!["owner", "admin"].includes(membership.role)) {
    throw new Error("Insufficient permissions");
  }

  return {
    supabase,
    userId: user.id,
    workspaceId: membership.workspace_id,
    isPasswordAccess: false,
  };
}

export async function unlockInternalAccess(formData: FormData) {
  const raw = formData.get("password");
  const password = typeof raw === "string" ? raw : "";

  if (password !== INTERNAL_ACCESS_PASSWORD) {
    throw new Error("密码错误");
  }

  const cookieStore = await cookies();
  cookieStore.set(INTERNAL_ACCESS_COOKIE, INTERNAL_ACCESS_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath("/internal");
  redirect("/internal");
}

async function logAdminAudit(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workspaceId: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const actorUserId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input.userId
    )
      ? input.userId
      : null;

  const buildPayload = (workspaceId: string | null) => ({
    actor_user_id: actorUserId,
    workspace_id: workspaceId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    summary: input.summary,
    details: input.details ?? {},
  });

  let error: { code?: string; message?: string } | null = null;
  try {
    const response = await input.supabase.from("admin_audit_logs").insert(buildPayload(input.workspaceId));
    error = response.error;
  } catch (caught) {
    console.warn("Failed to write admin audit log", caught);
    return;
  }

  const isWorkspaceFkViolation =
    error?.code === "23503" &&
    typeof error.message === "string" &&
    error.message.includes("admin_audit_logs_workspace_id_fkey");

  if (isWorkspaceFkViolation) {
    try {
      const { error: fallbackError } = await input.supabase.from("admin_audit_logs").insert(buildPayload(null));
      if (fallbackError) {
        console.warn("Failed to write fallback admin audit log", fallbackError);
      }
    } catch (caught) {
      console.warn("Failed to write fallback admin audit log", caught);
    }
    return;
  }

  if (error) {
    console.warn("Failed to write admin audit log", error);
  }
}

async function ensureWorkerTemplateExists(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  slug: string;
  displayName?: string;
  config: Record<string, unknown>;
}) {
  const normalizedSlug = input.slug.trim();
  if (!normalizedSlug) {
    return;
  }

  const { error } = await input.supabase.from("worker_templates").upsert(
    {
      display_name: input.displayName?.trim() || normalizedSlug,
      slug: normalizedSlug,
      config: input.config,
      active: true,
    },
    { onConflict: "slug" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

const createProviderSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  baseUrl: z.string().url().optional().or(z.literal("")),
  status: providerStatusSchema,
  regions: z.array(z.string()).default([]),
  credentialsRef: z.string().max(200).optional().or(z.literal("")),
  config: z.record(z.string(), z.unknown()).default({}),
});

export async function createProvider(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();

  const parsed = createProviderSchema.parse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    baseUrl: normalizeOptionalText(formData.get("baseUrl")) ?? "",
    status: formData.get("status"),
    regions: parseStringArray(formData.get("regions")),
    credentialsRef: normalizeOptionalText(formData.get("credentialsRef")) ?? "",
    config: parseJsonField(formData.get("config")),
  });
  const regions = normalizeProviderRegions(parsed.regions);

  const { data, error } = await supabase
    .from("providers")
    .insert({
    name: parsed.name,
    slug: parsed.slug,
    base_url: parsed.baseUrl || null,
    status: parsed.status,
    regions,
    credentials_ref: parsed.credentialsRef || null,
    config: parsed.config,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider.create",
    targetType: "provider",
    targetId: data?.id ?? null,
    summary: `Created provider ${parsed.slug}`,
    details: {
      ...parsed,
      regions,
    },
  });

  revalidatePath("/internal");
}

const updateProviderStatusSchema = z.object({
  providerId: z.string().uuid(),
  status: providerStatusSchema,
});

export async function updateProviderStatus(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateProviderStatusSchema.parse({
    providerId: formData.get("providerId"),
    status: formData.get("status"),
  });

  const { error } = await supabase
    .from("providers")
    .update({ status: parsed.status })
    .eq("id", parsed.providerId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider.status.update",
    targetType: "provider",
    targetId: parsed.providerId,
    summary: `Updated provider status to ${parsed.status}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const updateProviderSchema = z.object({
  providerId: z.string().uuid(),
  name: z.string().min(2).max(80),
  baseUrl: z.string().url().optional().or(z.literal("")),
  status: providerStatusSchema,
  regions: z.array(z.string()).default([]),
  credentialsRef: z.string().max(200).optional().or(z.literal("")),
});

const deleteProviderSchema = z.object({
  providerId: z.string().uuid(),
});

const clearApiKeyRequestRecordsSchema = z.object({
  apiKeyId: z.string().uuid(),
  confirmText: z.literal("清除"),
});

export async function clearApiKeyRequestRecords(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = clearApiKeyRequestRecordsSchema.parse({
    apiKeyId: formData.get("apiKeyId"),
    confirmText: formData.get("confirmText"),
  });

  const { data: apiKey, error: apiKeyError } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix")
    .eq("id", parsed.apiKeyId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (apiKeyError) {
    throw new Error(apiKeyError.message);
  }

  if (!apiKey) {
    throw new Error("API Key 不属于当前工作区");
  }

  const { data: result, error } = await supabase.rpc("clear_request_records_for_api_key", {
    p_workspace_id: workspaceId,
    p_api_key_id: parsed.apiKeyId,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "request_records.clear_by_api_key",
    targetType: "api_key",
    targetId: parsed.apiKeyId,
    summary: `Cleared request records for API key ${apiKey.name}`,
    details: {
      apiKeyId: parsed.apiKeyId,
      apiKeyName: apiKey.name,
      keyPrefix: apiKey.key_prefix,
      result: result ?? {},
      walletTransactionsPreserved: false,
    },
  });

  revalidatePath("/internal");
  revalidatePath("/dashboard");
}

export async function updateProvider(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();

  const parsed = updateProviderSchema.parse({
    providerId: formData.get("providerId"),
    name: formData.get("name"),
    baseUrl: normalizeOptionalText(formData.get("baseUrl")) ?? "",
    status: formData.get("status"),
    regions: parseStringArray(formData.get("regions")),
    credentialsRef: normalizeOptionalText(formData.get("credentialsRef")) ?? "",
  });
  const regions = normalizeProviderRegions(parsed.regions);

  const { error } = await supabase
    .from("providers")
    .update({
      name: parsed.name,
      base_url: parsed.baseUrl || null,
      status: parsed.status,
      regions,
      credentials_ref: parsed.credentialsRef || null,
    })
    .eq("id", parsed.providerId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider.update",
    targetType: "provider",
    targetId: parsed.providerId,
    summary: `Updated provider ${parsed.providerId}`,
    details: {
      ...parsed,
      regions,
    },
  });

  revalidatePath("/internal");
}

const addUserBalanceSchema = z.object({
  userId: z.string().uuid(),
  amount: z.coerce.number().positive().max(100000),
  description: z.string().trim().max(240).optional(),
});

export async function addUserBalance(formData: FormData) {
  const context = await getInternalAdminContext();
  const supabase = createAdminClient();
  const parsed = addUserBalanceSchema.parse({
    userId: formData.get("userId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
  });

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role, created_at")
    .eq("user_id", parsed.userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership?.workspace_id) {
    throw new Error("该用户还没有 workspace，不能加余额");
  }

  const { data: existingTransactions, error: balanceError } = await supabase
    .from("wallet_transactions")
    .select("amount_delta")
    .eq("workspace_id", membership.workspace_id);

  if (balanceError) {
    throw new Error(balanceError.message);
  }

  const currentBalance = (existingTransactions ?? []).reduce(
    (sum, row) => sum + Number(row.amount_delta ?? 0),
    0
  );
  const amount = Number(parsed.amount.toFixed(2));
  const description =
    parsed.description?.trim() ||
    `Internal manual balance adjustment +${amount.toFixed(2)} USD`;

  const { error: insertError } = await supabase.from("wallet_transactions").insert({
    workspace_id: membership.workspace_id,
    entry_type: "adjustment",
    amount_delta: amount,
    balance_after: Number((currentBalance + amount).toFixed(2)),
    description,
    metadata: {
      source: "internal_user_management",
      target_user_id: parsed.userId,
      operator_user_id: context.userId,
    },
    created_by: context.userId === "internal-password-access" ? null : context.userId,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  await logAdminAudit({
    supabase,
    userId: context.userId,
    workspaceId: membership.workspace_id,
    action: "user.balance.add",
    targetType: "user",
    targetId: parsed.userId,
    summary: `Added ${amount.toFixed(2)} USD balance to user workspace`,
    details: {
      targetUserId: parsed.userId,
      workspaceId: membership.workspace_id,
      amount,
      balanceAfter: Number((currentBalance + amount).toFixed(2)),
      description,
    },
  });

  revalidatePath("/internal");
}

const deleteRegisteredUserSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().trim().min(1),
});

export async function deleteRegisteredUser(formData: FormData) {
  const context = await getInternalAdminContext();
  const supabase = createAdminClient();
  const parsed = deleteRegisteredUserSchema.parse({
    userId: formData.get("userId"),
    email: formData.get("email"),
  });

  const { data: memberships, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", parsed.userId);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const { data: ownedWorkspaces, error: ownedWorkspaceError } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("owner_user_id", parsed.userId);

  if (ownedWorkspaceError) {
    throw new Error(ownedWorkspaceError.message);
  }

  let authUserResponse: Awaited<ReturnType<typeof supabase.auth.admin.getUserById>>;
  try {
    authUserResponse = await supabase.auth.admin.getUserById(parsed.userId);
  } catch (error) {
    throw new Error(toReadableSupabaseError(error, "读取用户失败"));
  }
  const { data: authUser, error: authUserError } = authUserResponse;

  if (authUserError) {
    throw new Error(toReadableSupabaseError(authUserError, "读取用户失败"));
  }

  if (!authUser.user) {
    throw new Error("用户不存在");
  }

  if (authUser.user.email !== parsed.email) {
    throw new Error("用户邮箱不匹配，已取消删除");
  }

  await logAdminAudit({
    supabase,
    userId: context.userId,
    workspaceId: null,
    action: "user.delete",
    targetType: "user",
    targetId: parsed.userId,
    summary: `Deleted registered user ${parsed.email}`,
    details: {
      targetUserId: parsed.userId,
      email: parsed.email,
      reason: "admin_confirmed_delete",
      memberships: memberships ?? [],
      ownedWorkspaces: ownedWorkspaces ?? [],
    },
  });

  const ownedWorkspaceIds = (ownedWorkspaces ?? []).map((workspace) => workspace.id);
  if (ownedWorkspaceIds.length > 0) {
    const { error: deleteWorkspaceError } = await supabase
      .from("workspaces")
      .delete()
      .in("id", ownedWorkspaceIds);

    if (deleteWorkspaceError) {
      throw new Error(deleteWorkspaceError.message);
    }
  }

  let deleteResponse: Awaited<ReturnType<typeof supabase.auth.admin.deleteUser>>;
  try {
    deleteResponse = await supabase.auth.admin.deleteUser(parsed.userId);
  } catch (error) {
    throw new Error(toReadableSupabaseError(error, "删除用户失败"));
  }
  const { error: deleteError } = deleteResponse;

  if (deleteError) {
    throw new Error(toReadableSupabaseError(deleteError, "删除用户失败"));
  }

  revalidatePath("/internal");
  redirect(
    buildInternalAlertHref({
      tab: "monitoring-requests",
      message: `已删除用户 ${parsed.email}`,
      level: "success",
    })
  );
}

export async function deleteProvider(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteProviderSchema.parse({
    providerId: formData.get("providerId"),
  });

  const [{ data: providerModels, error: providerModelsError }, { data: providerCredentials, error: providerCredentialsError }] =
    await Promise.all([
      supabase.from("provider_models").select("id").eq("provider_id", parsed.providerId).limit(1),
      supabase.from("provider_credentials").select("id").eq("provider_id", parsed.providerId).limit(1),
    ]);

  if (providerModelsError) {
    throw new Error(providerModelsError.message);
  }
  if (providerCredentialsError) {
    throw new Error(providerCredentialsError.message);
  }

  if ((providerModels ?? []).length > 0) {
    throw new Error("该供应商下仍有关联模型，无法删除。");
  }
  if ((providerCredentials ?? []).length > 0) {
    throw new Error("该供应商下仍有关联密钥，无法删除。");
  }

  const { error } = await supabase.from("providers").delete().eq("id", parsed.providerId);
  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider.delete",
    targetType: "provider",
    targetId: parsed.providerId,
    summary: `Deleted provider ${parsed.providerId}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const createProviderCredentialSchema = z.object({
  providerId: z.string().uuid(),
  label: z.string().min(2).max(120),
  secret: z.string().min(8).max(4000),
  secretRef: z.string().max(240).optional().or(z.literal("")),
  environment: z.string().min(2).max(40),
  notes: z.string().max(2000).optional().or(z.literal("")),
  metadata: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean(),
});

export async function createProviderCredential(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const isActiveValue = formData.get("isActive");
  const parsed = createProviderCredentialSchema.parse({
    providerId: formData.get("providerId"),
    label: formData.get("label"),
    secret: formData.get("secret"),
    secretRef: normalizeOptionalText(formData.get("secretRef")) ?? "",
    environment: formData.get("environment"),
    notes: normalizeOptionalText(formData.get("notes")) ?? "",
    metadata: parseJsonField(formData.get("metadata")),
    isActive: isActiveValue === null ? true : parseBooleanField(isActiveValue),
  });
  const encryptedSecret = encryptProviderSecret(parsed.secret);

  if (parsed.isActive) {
    const { error: deactivateError } = await supabase
      .from("provider_credentials")
      .update({ is_active: false })
      .eq("provider_id", parsed.providerId);

    if (deactivateError) {
      throw new Error(deactivateError.message);
    }
  }

  const { data, error } = await supabase
    .from("provider_credentials")
    .insert({
      provider_id: parsed.providerId,
      label: parsed.label,
      secret_ref: parsed.secretRef || null,
      secret_ciphertext: encryptedSecret.ciphertext,
      secret_iv: encryptedSecret.iv,
      secret_auth_tag: encryptedSecret.authTag,
      secret_mask: encryptedSecret.mask,
      secret_source: "internal_encrypted",
      secret_key_version: encryptedSecret.version,
      secret_last_updated_at: new Date().toISOString(),
      environment: parsed.environment,
      notes: parsed.notes || null,
      metadata: parsed.metadata,
      is_active: parsed.isActive,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_credential.create",
    targetType: "provider_credential",
    targetId: data?.id ?? null,
    summary: `Created provider credential ${parsed.label}`,
    details: {
      ...parsed,
      secret: "[redacted]",
      secretMask: encryptedSecret.mask,
    },
  });

  revalidatePath("/internal");
}

const updateProviderCredentialSchema = z.object({
  credentialId: z.string().uuid(),
  isActive: z.boolean(),
});

export async function updateProviderCredentialState(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateProviderCredentialSchema.parse({
    credentialId: formData.get("credentialId"),
    isActive: parseBooleanField(formData.get("isActive")),
  });

  const { data: credentialRow, error: credentialRowError } = await supabase
    .from("provider_credentials")
    .select("provider_id, secret_source, secret_ciphertext, secret_iv, secret_auth_tag")
    .eq("id", parsed.credentialId)
    .maybeSingle();

  if (credentialRowError) {
    throw new Error(credentialRowError.message);
  }

  if (!credentialRow) {
    throw new Error("Provider credential is missing");
  }

  if (
    parsed.isActive &&
    (credentialRow.secret_source !== "internal_encrypted" ||
      !credentialRow.secret_ciphertext ||
      !credentialRow.secret_iv ||
      !credentialRow.secret_auth_tag)
  ) {
    throw new Error("不能启用缺少 managed 加密密文字段的供应商密钥。请先轮换或重新保存密钥。");
  }

  if (parsed.isActive) {
    const { error: deactivateError } = await supabase
      .from("provider_credentials")
      .update({ is_active: false })
      .eq("provider_id", credentialRow.provider_id);

    if (deactivateError) {
      throw new Error(deactivateError.message);
    }
  }

  const { error } = await supabase
    .from("provider_credentials")
    .update({ is_active: parsed.isActive })
    .eq("id", parsed.credentialId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_credential.state.update",
    targetType: "provider_credential",
    targetId: parsed.credentialId,
    summary: `${parsed.isActive ? "Activated" : "Deactivated"} provider credential`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const rotateProviderCredentialSecretSchema = z.object({
  credentialId: z.string().uuid(),
  secret: z.string().min(8).max(4000),
  secretRef: z.string().max(240).optional().or(z.literal("")),
});

export async function rotateProviderCredentialSecret(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = rotateProviderCredentialSecretSchema.parse({
    credentialId: formData.get("credentialId"),
    secret: formData.get("secret"),
    secretRef: normalizeOptionalText(formData.get("secretRef")) ?? "",
  });
  const encryptedSecret = encryptProviderSecret(parsed.secret);

  const { error } = await supabase
    .from("provider_credentials")
    .update({
      secret_ref: parsed.secretRef || null,
      secret_ciphertext: encryptedSecret.ciphertext,
      secret_iv: encryptedSecret.iv,
      secret_auth_tag: encryptedSecret.authTag,
      secret_mask: encryptedSecret.mask,
      secret_source: "internal_encrypted",
      secret_key_version: encryptedSecret.version,
      secret_last_updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.credentialId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_credential.secret.rotate",
    targetType: "provider_credential",
    targetId: parsed.credentialId,
    summary: "Rotated provider credential secret",
    details: {
      credentialId: parsed.credentialId,
      secret: "[redacted]",
      secretMask: encryptedSecret.mask,
      secretRef: parsed.secretRef || null,
    },
  });

  revalidatePath("/internal");
}

const deleteProviderCredentialSchema = z.object({
  credentialId: z.string().uuid(),
});

export async function deleteProviderCredential(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteProviderCredentialSchema.parse({
    credentialId: formData.get("credentialId"),
  });

  const { data: credentialRow, error: credentialError } = await supabase
    .from("provider_credentials")
    .select("id, label, provider_id, is_active")
    .eq("id", parsed.credentialId)
    .maybeSingle();

  if (credentialError) {
    throw new Error(credentialError.message);
  }

  if (!credentialRow) {
    throw new Error("Provider credential is missing");
  }

  if (credentialRow.is_active) {
    throw new Error("Deactivate this credential before deleting it");
  }

  const { error } = await supabase
    .from("provider_credentials")
    .delete()
    .eq("id", parsed.credentialId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_credential.delete",
    targetType: "provider_credential",
    targetId: parsed.credentialId,
    summary: `Deleted provider credential ${credentialRow.label}`,
    details: {
      credentialId: parsed.credentialId,
      providerId: credentialRow.provider_id,
      label: credentialRow.label,
    },
  });

  revalidatePath("/internal");
}

const updateProviderCredentialDetailsSchema = z.object({
  credentialId: z.string().uuid(),
  label: z.string().min(2).max(120),
  secretRef: z.string().max(240).optional().or(z.literal("")),
  environment: z.string().min(2).max(40),
  notes: z.string().max(2000).optional().or(z.literal("")),
  metadata: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean(),
});

export async function updateProviderCredentialDetails(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateProviderCredentialDetailsSchema.parse({
    credentialId: formData.get("credentialId"),
    label: formData.get("label"),
    secretRef: normalizeOptionalText(formData.get("secretRef")) ?? "",
    environment: formData.get("environment"),
    notes: normalizeOptionalText(formData.get("notes")) ?? "",
    metadata: parseJsonField(formData.get("metadata")),
    isActive: parseBooleanField(formData.get("isActive")),
  });

  const { data: credentialRow, error: credentialRowError } = await supabase
    .from("provider_credentials")
    .select("provider_id, secret_source, secret_ciphertext, secret_iv, secret_auth_tag")
    .eq("id", parsed.credentialId)
    .maybeSingle();

  if (credentialRowError) {
    throw new Error(credentialRowError.message);
  }

  if (!credentialRow) {
    throw new Error("Provider credential is missing");
  }

  if (
    parsed.isActive &&
    (credentialRow.secret_source !== "internal_encrypted" ||
      !credentialRow.secret_ciphertext ||
      !credentialRow.secret_iv ||
      !credentialRow.secret_auth_tag)
  ) {
    throw new Error("不能启用缺少 managed 加密密文字段的供应商密钥。请先轮换或重新保存密钥。");
  }

  if (parsed.isActive) {
    const { error: deactivateError } = await supabase
      .from("provider_credentials")
      .update({ is_active: false })
      .eq("provider_id", credentialRow.provider_id);

    if (deactivateError) {
      throw new Error(deactivateError.message);
    }
  }

  const { error } = await supabase
    .from("provider_credentials")
    .update({
      label: parsed.label,
      secret_ref: parsed.secretRef || null,
      environment: parsed.environment,
      notes: parsed.notes || null,
      metadata: parsed.metadata,
      is_active: parsed.isActive,
    })
    .eq("id", parsed.credentialId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_credential.update",
    targetType: "provider_credential",
    targetId: parsed.credentialId,
    summary: `Updated provider credential ${parsed.label}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const createModelVendorSchema = z.object({
  name: modelVendorNameSchema,
});

const providerAdapterSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/);

const workerSlugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9-]+$/);

export async function createModelVendor(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = createModelVendorSchema.parse({
    name: formData.get("name"),
  });

  const { data, error } = await supabase
    .from("model_vendors")
    .insert({
      name: parsed.name,
      active: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "model_vendor.create",
    targetType: "model_vendor",
    targetId: data?.id ?? null,
    summary: `Created model vendor ${parsed.name}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const deleteModelVendorSchema = z.object({
  vendorId: z.string().uuid(),
});

export async function deleteModelVendor(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteModelVendorSchema.parse({
    vendorId: formData.get("vendorId"),
  });

  const { data: vendorRow, error: vendorError } = await supabase
    .from("model_vendors")
    .select("name")
    .eq("id", parsed.vendorId)
    .maybeSingle();

  if (vendorError) {
    throw new Error(vendorError.message);
  }
  if (!vendorRow) {
    throw new Error("模型厂商不存在");
  }

  const { data: inUseRows, error: inUseError } = await supabase
    .from("supported_models")
    .select("id")
    .eq("provider", vendorRow.name);

  if (inUseError) {
    throw new Error(inUseError.message);
  }

  if ((inUseRows ?? []).length > 0) {
    throw new Error("该模型厂商仍被可售模型使用，无法删除。");
  }

  const { error } = await supabase
    .from("model_vendors")
    .delete()
    .eq("id", parsed.vendorId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "model_vendor.delete",
    targetType: "model_vendor",
    targetId: parsed.vendorId,
    summary: `Deleted model vendor ${vendorRow.name}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const createWorkerTemplateSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  slug: workerSlugSchema,
  config: z.record(z.string(), z.unknown()).default({}),
});

const updateWorkerTemplateSchema = z.object({
  workerId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(80),
  slug: workerSlugSchema,
  config: z.record(z.string(), z.unknown()).default({}),
});

const deleteWorkerTemplateSchema = z.object({
  workerId: z.string().uuid(),
});

const gatewayErrorCodeSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9_]+$/);

const upsertGatewayErrorDefinitionSchema = z.object({
  definitionId: z.string().uuid().optional(),
  code: gatewayErrorCodeSchema,
  category: z.string().trim().min(2).max(40),
  httpStatus: z.coerce.number().int().min(100).max(599),
  publicMessage: z.string().trim().min(5).max(400),
  retryable: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(100),
  operatorNotes: z.string().trim().max(2000).optional().nullable(),
});


export async function createWorkerTemplate(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = createWorkerTemplateSchema.parse({
    displayName: formData.get("displayName"),
    slug: formData.get("slug"),
    config: parseJsonField(formData.get("config")),
  });

  const { data, error } = await supabase
    .from("worker_templates")
    .insert({
      display_name: parsed.displayName,
      slug: parsed.slug,
      config: parsed.config,
      active: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "worker_template.create",
    targetType: "worker_template",
    targetId: data?.id ?? null,
    summary: `Created worker template ${parsed.slug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

export async function updateWorkerTemplate(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateWorkerTemplateSchema.parse({
    workerId: formData.get("workerId"),
    displayName: formData.get("displayName"),
    slug: formData.get("slug"),
    config: parseJsonField(formData.get("config")),
  });

  const { error } = await supabase
    .from("worker_templates")
    .update({
      display_name: parsed.displayName,
      slug: parsed.slug,
      config: parsed.config,
    })
    .eq("id", parsed.workerId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "worker_template.update",
    targetType: "worker_template",
    targetId: parsed.workerId,
    summary: `Updated worker template ${parsed.slug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

export async function deleteWorkerTemplate(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteWorkerTemplateSchema.parse({
    workerId: formData.get("workerId"),
  });

  const { data: worker, error: workerError } = await supabase
    .from("worker_templates")
    .select("slug")
    .eq("id", parsed.workerId)
    .maybeSingle();

  if (workerError) {
    throw new Error(workerError.message);
  }
  if (!worker) {
    throw new Error("worker 不存在");
  }

  const { data: inUse, error: inUseError } = await supabase
    .from("provider_models")
    .select("id")
    .eq("execution_template", worker.slug)
    .limit(1);
  if (inUseError) {
    throw new Error(inUseError.message);
  }
  if ((inUse ?? []).length > 0) {
    throw new Error("该 worker 仍被供应商模型使用，无法删除。");
  }

  const { error } = await supabase
    .from("worker_templates")
    .delete()
    .eq("id", parsed.workerId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "worker_template.delete",
    targetType: "worker_template",
    targetId: parsed.workerId,
    summary: `Deleted worker template ${worker.slug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

export async function upsertGatewayErrorDefinition(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = upsertGatewayErrorDefinitionSchema.parse({
    definitionId: normalizeOptionalText(formData.get("definitionId")) ?? undefined,
    code: formData.get("code"),
    category: formData.get("category"),
    httpStatus: formData.get("httpStatus"),
    publicMessage: formData.get("publicMessage"),
    retryable: parseBooleanField(formData.get("retryable")),
    active: parseBooleanField(formData.get("active")),
    sortOrder: formData.get("sortOrder"),
    operatorNotes: normalizeOptionalText(formData.get("operatorNotes")),
  });

  const payload = {
    code: parsed.code,
    category: parsed.category,
    http_status: parsed.httpStatus,
    public_message: parsed.publicMessage,
    retryable: parsed.retryable,
    active: parsed.active,
    sort_order: parsed.sortOrder,
    operator_notes: parsed.operatorNotes ?? null,
  };

  const { data, error } = await supabase
    .from("gateway_error_definitions")
    .upsert(
      parsed.definitionId
        ? {
            id: parsed.definitionId,
            ...payload,
          }
        : payload,
      { onConflict: "code" }
    )
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: parsed.definitionId
      ? "gateway_error_definition.update"
      : "gateway_error_definition.create",
    targetType: "gateway_error_definition",
    targetId: data?.id ?? parsed.definitionId ?? null,
    summary: `${parsed.definitionId ? "Updated" : "Created"} gateway error definition ${parsed.code}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const createProviderAdapterAliasSchema = z.object({
  aliasSlug: providerAdapterSlugSchema,
  adapterSlug: providerAdapterSlugSchema,
});

const createProviderAdapterCatalogSchema = z.object({
  slug: providerAdapterSlugSchema,
});

export async function createProviderAdapterAlias(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = createProviderAdapterAliasSchema.parse({
    aliasSlug: formData.get("aliasSlug"),
    adapterSlug: formData.get("adapterSlug"),
  });

  const { data, error } = await supabase
    .from("provider_adapter_aliases")
    .insert({
      alias_slug: parsed.aliasSlug,
      adapter_slug: parsed.adapterSlug,
      active: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_adapter_alias.create",
    targetType: "provider_adapter_alias",
    targetId: data?.id ?? null,
    summary: `Created provider adapter alias ${parsed.aliasSlug} -> ${parsed.adapterSlug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

export async function createProviderAdapterCatalog(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = createProviderAdapterCatalogSchema.parse({
    slug: formData.get("slug"),
  });

  const { data, error } = await supabase
    .from("provider_adapter_catalog")
    .insert({
      slug: parsed.slug,
      active: true,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_adapter_catalog.create",
    targetType: "provider_adapter_catalog",
    targetId: data?.id ?? null,
    summary: `Created provider adapter catalog ${parsed.slug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const deleteProviderAdapterAliasSchema = z.object({
  aliasId: z.string().uuid(),
});

const deleteProviderAdapterCatalogSchema = z.object({
  adapterId: z.string().uuid(),
});

export async function deleteProviderAdapterAlias(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteProviderAdapterAliasSchema.parse({
    aliasId: formData.get("aliasId"),
  });

  const { data: aliasRow, error: aliasError } = await supabase
    .from("provider_adapter_aliases")
    .select("alias_slug, adapter_slug")
    .eq("id", parsed.aliasId)
    .maybeSingle();

  if (aliasError) {
    throw new Error(aliasError.message);
  }

  if (!aliasRow) {
    throw new Error("Provider adapter alias 不存在");
  }

  const { error } = await supabase
    .from("provider_adapter_aliases")
    .delete()
    .eq("id", parsed.aliasId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_adapter_alias.delete",
    targetType: "provider_adapter_alias",
    targetId: parsed.aliasId,
    summary: `Deleted provider adapter alias ${aliasRow.alias_slug} -> ${aliasRow.adapter_slug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

export async function deleteProviderAdapterCatalog(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteProviderAdapterCatalogSchema.parse({
    adapterId: formData.get("adapterId"),
  });

  const { data: adapterRow, error: adapterError } = await supabase
    .from("provider_adapter_catalog")
    .select("slug")
    .eq("id", parsed.adapterId)
    .maybeSingle();

  if (adapterError) {
    throw new Error(adapterError.message);
  }
  if (!adapterRow) {
    throw new Error("Provider adapter catalog 不存在");
  }

  const { error } = await supabase
    .from("provider_adapter_catalog")
    .delete()
    .eq("id", parsed.adapterId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_adapter_catalog.delete",
    targetType: "provider_adapter_catalog",
    targetId: parsed.adapterId,
    summary: `Deleted provider adapter catalog ${adapterRow.slug}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const createSupportedModelSchema = z.object({
  provider: z.string().min(2).max(80),
  modelSlug: z.string().min(3).max(160),
  displayName: z.string().min(2).max(120),
  seoTitle: z.string().trim().max(160).nullable(),
  seoDescription: z.string().trim().max(2000).nullable(),
  seoKeywords: z.string().trim().max(1000).nullable(),
  modelType: z.string().trim().max(80).nullable(),
  modality: modalitySchema,
  capability: capabilitySchema,
  billingConfig: z.unknown(),
  active: z.boolean(),
});

export async function createSupportedModel(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = createSupportedModelSchema.parse({
    provider: formData.get("provider"),
    modelSlug: formData.get("modelSlug"),
    displayName: formData.get("displayName"),
    seoTitle: normalizeOptionalText(formData.get("seoTitle")),
    seoDescription: normalizeOptionalText(formData.get("seoDescription")),
    seoKeywords: normalizeOptionalText(formData.get("seoKeywords")),
    modelType: normalizeOptionalText(formData.get("modelType")),
    modality: formData.get("modality"),
    capability: formData.get("capability"),
    billingConfig: parseBillingConfigField(formData.get("billingConfig")).config,
    active: parseBooleanField(formData.get("active")),
  });
  const billingConfig = parseBillingConfig(parsed.billingConfig);
  const billingConfigWithMeta = {
    ...billingConfig,
    metadata: {
      ...(((billingConfig as Record<string, unknown>).metadata as Record<string, unknown> | undefined) ?? {}),
      modelDescription: parsed.seoDescription,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      seoKeywords: parsed.seoKeywords,
      modelType: parsed.modelType,
    },
  };
  const legacyBillingFields = deriveLegacyBillingFields(billingConfigWithMeta);

  const invalidCapabilityForModality =
    (parsed.modality === "image" &&
      !["image_generation", "image_edit"].includes(parsed.capability)) ||
    (parsed.modality === "video" && parsed.capability !== "video_generation");

  if (invalidCapabilityForModality) {
    throw new Error("Public model modality and capability do not match");
  }

  const { data, error } = await supabase
    .from("supported_models")
    .insert({
      provider: parsed.provider,
      model_slug: parsed.modelSlug,
      display_name: parsed.displayName,
      modality: parsed.modality,
      capability: parsed.capability,
      billing_config: billingConfigWithMeta,
      unit_label: legacyBillingFields.unitLabel,
      default_unit_cost: legacyBillingFields.defaultUnitCost,
      active: parsed.active,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "supported_model.create",
    targetType: "supported_model",
    targetId: data?.id ?? null,
    summary: `Created public model ${parsed.modelSlug}`,
    details: {
      ...parsed,
      billingConfig: billingConfigWithMeta,
    },
  });

  revalidatePath("/internal");
}

const updateSupportedModelSchema = z.object({
  supportedModelId: z.string().uuid(),
  active: z.boolean(),
});

export async function updateSupportedModelState(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateSupportedModelSchema.parse({
    supportedModelId: formData.get("supportedModelId"),
    active: parseBooleanField(formData.get("active")),
  });

  if (parsed.active) {
    const { data: modelRow, error: modelError } = await supabase
      .from("supported_models")
      .select("billing_config")
      .eq("id", parsed.supportedModelId)
      .maybeSingle();

    if (modelError) {
      throw new Error(modelError.message);
    }

    if (!modelRow) {
      throw new Error("Supported model is missing");
    }

    assertBillingConfig(modelRow.billing_config);
  }

  const { error } = await supabase
    .from("supported_models")
    .update({ active: parsed.active })
    .eq("id", parsed.supportedModelId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "supported_model.state.update",
    targetType: "supported_model",
    targetId: parsed.supportedModelId,
    summary: `${parsed.active ? "Activated" : "Deactivated"} public model`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const updateSupportedModelPricingSchema = z.object({
  supportedModelId: z.string().uuid(),
  billingConfig: z.unknown(),
});

export async function updateSupportedModelPricing(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateSupportedModelPricingSchema.parse({
    supportedModelId: formData.get("supportedModelId"),
    billingConfig: parseBillingConfigField(formData.get("billingConfig")).config,
  });
  const billingConfig = parseBillingConfig(parsed.billingConfig);
  const legacyBillingFields = deriveLegacyBillingFields(billingConfig);

  const { error } = await supabase
    .from("supported_models")
    .update({
      billing_config: billingConfig,
      unit_label: legacyBillingFields.unitLabel,
      default_unit_cost: legacyBillingFields.defaultUnitCost,
    })
    .eq("id", parsed.supportedModelId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "supported_model.pricing.update",
    targetType: "supported_model",
    targetId: parsed.supportedModelId,
    summary: `Updated public model billing config`,
    details: {
      ...parsed,
      billingConfig,
    },
  });

  revalidatePath("/internal");
}

const updateSupportedModelDetailsSchema = z.object({
  supportedModelId: z.string().uuid(),
  provider: z.string().min(2).max(80),
  modelSlug: z.string().min(3).max(160),
  displayName: z.string().min(2).max(120),
  seoTitle: z.string().trim().max(160).nullable(),
  seoDescription: z.string().trim().max(2000).nullable(),
  seoKeywords: z.string().trim().max(1000).nullable(),
  modelType: z.string().trim().max(80).nullable(),
  modality: modalitySchema,
  capability: capabilitySchema,
  billingConfig: z.unknown(),
  active: z.boolean(),
});

export async function updateSupportedModelDetails(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateSupportedModelDetailsSchema.parse({
    supportedModelId: formData.get("supportedModelId"),
    provider: formData.get("provider"),
    modelSlug: formData.get("modelSlug"),
    displayName: formData.get("displayName"),
    seoTitle: normalizeOptionalText(formData.get("seoTitle")),
    seoDescription: normalizeOptionalText(formData.get("seoDescription")),
    seoKeywords: normalizeOptionalText(formData.get("seoKeywords")),
    modelType: normalizeOptionalText(formData.get("modelType")),
    modality: formData.get("modality"),
    capability: formData.get("capability"),
    billingConfig: parseBillingConfigField(formData.get("billingConfig")).config,
    active: parseBooleanField(formData.get("active")),
  });
  const billingConfig = parseBillingConfig(parsed.billingConfig);
  const billingConfigWithMeta = {
    ...billingConfig,
    metadata: {
      ...(((billingConfig as Record<string, unknown>).metadata as Record<string, unknown> | undefined) ?? {}),
      modelDescription: parsed.seoDescription,
      seoTitle: parsed.seoTitle,
      seoDescription: parsed.seoDescription,
      seoKeywords: parsed.seoKeywords,
      modelType: parsed.modelType,
    },
  };
  const legacyBillingFields = deriveLegacyBillingFields(billingConfigWithMeta);

  const invalidCapabilityForModality =
    (parsed.modality === "image" &&
      !["image_generation", "image_edit"].includes(parsed.capability)) ||
    (parsed.modality === "video" && parsed.capability !== "video_generation");

  if (invalidCapabilityForModality) {
    throw new Error("Public model modality and capability do not match");
  }

  const { data: currentSupportedModel, error: currentSupportedModelError } = await supabase
    .from("supported_models")
    .select("model_slug")
    .eq("id", parsed.supportedModelId)
    .maybeSingle();

  if (currentSupportedModelError) {
    throw new Error(currentSupportedModelError.message);
  }

  if (!currentSupportedModel) {
    throw new Error("Supported model is missing");
  }

  const { error } = await supabase
    .from("supported_models")
    .update({
      provider: parsed.provider,
      model_slug: parsed.modelSlug,
      display_name: parsed.displayName,
      modality: parsed.modality,
      capability: parsed.capability,
      billing_config: billingConfigWithMeta,
      unit_label: legacyBillingFields.unitLabel,
      default_unit_cost: legacyBillingFields.defaultUnitCost,
      active: parsed.active,
    })
    .eq("id", parsed.supportedModelId);

  if (error) {
    throw new Error(error.message);
  }

  const { error: providerModelUpdateError } = await supabase
    .from("provider_models")
    .update({
      public_model_slug: parsed.modelSlug,
      capability: parsed.capability,
    })
    .eq("supported_model_id", parsed.supportedModelId);

  if (providerModelUpdateError) {
    throw new Error(providerModelUpdateError.message);
  }

  const { error: routingRuleUpdateError } = await supabase
    .from("routing_rules")
    .update({
      public_model_slug: parsed.modelSlug,
      capability: parsed.capability,
    })
    .eq("public_model_slug", currentSupportedModel.model_slug);

  if (routingRuleUpdateError) {
    throw new Error(routingRuleUpdateError.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "supported_model.update",
    targetType: "supported_model",
    targetId: parsed.supportedModelId,
    summary: `Updated public model ${parsed.modelSlug}`,
    details: {
      ...parsed,
      billingConfig: billingConfigWithMeta,
    },
  });

  revalidatePath("/internal");
}

const deleteSupportedModelSchema = z.object({
  supportedModelId: z.string().uuid(),
});

export async function deleteSupportedModel(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteSupportedModelSchema.parse({
    supportedModelId: formData.get("supportedModelId"),
  });

  const { data: supportedModelRow, error: supportedModelError } = await supabase
    .from("supported_models")
    .select("id, model_slug, display_name")
    .eq("id", parsed.supportedModelId)
    .maybeSingle();

  if (supportedModelError) {
    throw new Error(supportedModelError.message);
  }
  if (!supportedModelRow) {
    throw new Error("可售模型不存在");
  }

  const [{ data: providerModelRows, error: providerModelError }, { data: routingRows, error: routingError }] =
    await Promise.all([
      supabase
        .from("provider_models")
        .select("id")
        .eq("supported_model_id", parsed.supportedModelId)
        .limit(1),
      supabase
        .from("routing_rules")
        .select("id")
        .eq("public_model_slug", supportedModelRow.model_slug)
        .limit(1),
    ]);

  if (providerModelError) {
    throw new Error(providerModelError.message);
  }
  if (routingError) {
    throw new Error(routingError.message);
  }
  if ((providerModelRows ?? []).length > 0) {
    redirect(
      buildInternalAlertHref({
        tab: "public-models",
        level: "error",
        message: "该可售模型仍有关联的供应商模型映射，无法删除。",
      })
    );
  }
  if ((routingRows ?? []).length > 0) {
    redirect(
      buildInternalAlertHref({
        tab: "public-models",
        level: "error",
        message: "该可售模型仍被路由配置使用，无法删除。",
      })
    );
  }

  const { error } = await supabase
    .from("supported_models")
    .delete()
    .eq("id", parsed.supportedModelId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "supported_model.delete",
    targetType: "supported_model",
    targetId: parsed.supportedModelId,
    summary: `Deleted supported model ${supportedModelRow.model_slug}`,
    details: {
      supportedModelId: parsed.supportedModelId,
      modelSlug: supportedModelRow.model_slug,
      displayName: supportedModelRow.display_name,
    },
  });

  revalidatePath("/internal");
}

const createProviderModelSchema = z.object({
  providerId: z.string().uuid(),
  supportedModelId: z.string().uuid(),
  upstreamModelSlug: z.string().min(1).max(160),
  capability: capabilitySchema,
  active: z.boolean(),
  pricing: z.record(z.string(), z.unknown()).default({}),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  executionTemplate: z.string().trim().min(1).max(80).default("rest-async-poll-v1"),
  executionConfig: z.record(z.string(), z.unknown()).default({}),
});

export async function createProviderModel(formData: FormData) {
  try {
    const { supabase, userId, workspaceId } = await getInternalAdminContext();
    const showcaseCoverFile = isNonEmptyFile(formData.get("showcaseCoverFile"))
      ? (formData.get("showcaseCoverFile") as File)
      : null;
    const showcaseGalleryFiles = formData
      .getAll("showcaseGalleryFiles")
      .filter((value): value is File => isNonEmptyFile(value));
    const existingGalleryAssetIds = formData
      .getAll("existingShowcaseGalleryAssetIds")
      .filter((value): value is string => typeof value === "string");
    const existingGalleryPrompts = formData
      .getAll("existingShowcaseGalleryPrompts")
      .filter((value): value is string => typeof value === "string");
    const removeShowcaseCover = parseBooleanField(formData.get("removeShowcaseCover"));
    const replaceShowcaseGallery = parseBooleanField(formData.get("replaceShowcaseGallery"));
    const parsed = createProviderModelSchema.parse({
      providerId: formData.get("providerId"),
      supportedModelId: formData.get("supportedModelId"),
      upstreamModelSlug: formData.get("upstreamModelSlug"),
      capability: formData.get("capability"),
      active: parseBooleanField(formData.get("active")),
      pricing: parseJsonField(formData.get("pricing")),
      inputSchema: parseJsonField(formData.get("inputSchema")),
      outputSchema: parseJsonField(formData.get("outputSchema")),
      executionTemplate: (formData.get("executionTemplate") as string) || "rest-async-poll-v1",
      executionConfig: parseJsonField(formData.get("executionConfig")),
    });
    await ensureWorkerTemplateExists({
      supabase,
      slug: parsed.executionTemplate,
      displayName: parsed.executionTemplate,
      config: parsed.executionConfig,
    });

    const { data: supportedModelRow, error: supportedModelError } = await supabase
      .from("supported_models")
      .select("model_slug, capability, billing_config")
      .eq("id", parsed.supportedModelId)
      .maybeSingle();

    if (supportedModelError) {
      throw new Error(supportedModelError.message);
    }

    if (!supportedModelRow) {
      throw new Error("Supported model is missing");
    }

    if (supportedModelRow.capability !== parsed.capability) {
      throw new Error("Provider model capability must match the selected public model capability");
    }

    assertBillingConfig(supportedModelRow.billing_config);
    const runtimeContext = await loadProviderRuntimeContext(supabase, {
      providerId: parsed.providerId,
      supportedModelIds: [parsed.supportedModelId],
    });
    const provider = runtimeContext.providersById.get(parsed.providerId) ?? null;
    const supportedModel = runtimeContext.supportedModelsById.get(parsed.supportedModelId) ?? null;
    const runtimeDiagnostics = getProviderModelRuntimeDiagnostics({
      providerModel: {
        id: "new",
        provider_id: parsed.providerId,
        supported_model_id: parsed.supportedModelId,
        upstream_model_slug: parsed.upstreamModelSlug,
        capability: parsed.capability,
        active: parsed.active,
        execution_template: parsed.executionTemplate,
        execution_config: parsed.executionConfig,
      },
      provider,
      supportedModel,
      workerTemplatesBySlug: runtimeContext.workerTemplatesBySlug,
      credentials: runtimeContext.credentialsByProviderId.get(parsed.providerId) ?? [],
    });

    if (parsed.active && runtimeDiagnostics.length > 0) {
      throw new Error(
        formatRuntimeDiagnosticsForError(
          "这个供应商模型当前不能直接启用，请先修复下面的问题：",
          runtimeDiagnostics
        )
      );
    }

    const pricingConfig = parseBillingConfig(parsed.pricing);
    const { data, error } = await supabase
      .from("provider_models")
      .insert({
        provider_id: parsed.providerId,
        supported_model_id: parsed.supportedModelId,
        public_model_slug: supportedModelRow.model_slug,
        upstream_model_slug: parsed.upstreamModelSlug,
        capability: parsed.capability,
        active: parsed.active,
        pricing: pricingConfig,
        input_schema: parsed.inputSchema,
        output_schema: parsed.outputSchema,
        execution_template: parsed.executionTemplate,
        execution_config: parsed.executionConfig,
      })
      .select("id")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data?.id) {
      await syncProviderModelShowcaseAssets({
        supabase,
        providerModelId: data.id,
        coverFile: showcaseCoverFile,
        coverPrompt: normalizeOptionalText(formData.get("showcaseCoverPrompt")),
        existingCoverAssetId: normalizeOptionalText(formData.get("existingShowcaseCoverAssetId")),
        existingCoverPrompt: normalizeOptionalText(formData.get("existingShowcaseCoverPrompt")),
        removeCover: removeShowcaseCover,
        galleryFiles: showcaseGalleryFiles,
        galleryPrompts:
          normalizeOptionalText(formData.get("showcaseGalleryPromptsText"))
            ?.split(/\r?\n/)
            .map((value) => value.trim()) ?? [],
        existingGalleryPromptUpdates: existingGalleryAssetIds.map((id, index) => ({
          id,
          prompt: existingGalleryPrompts[index]?.trim() || null,
        })),
        deleteGalleryAssetIds: formData
          .getAll("deleteShowcaseGalleryAssetIds")
          .filter((value): value is string => typeof value === "string"),
        replaceGallery: replaceShowcaseGallery,
      });
    }

    await logAdminAudit({
      supabase,
      userId,
      workspaceId,
      action: "provider_model.create",
      targetType: "provider_model",
      targetId: data?.id ?? null,
      summary: `Created provider model ${supportedModelRow.model_slug}`,
      details: {
        ...parsed,
        pricing: pricingConfig,
        publicModelSlug: supportedModelRow.model_slug,
      },
    });

    revalidatePath("/internal");
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试。";
    redirect(
      buildInternalAlertHref({
        tab: "economics",
        message,
        level: "error",
      })
    );
  }
}

const updateProviderModelSchema = z.object({
  providerModelId: z.string().uuid(),
  active: z.boolean(),
});

export async function updateProviderModelState(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateProviderModelSchema.parse({
    providerModelId: formData.get("providerModelId"),
    active: parseBooleanField(formData.get("active")),
  });

  if (parsed.active) {
    const { data: providerModel, error: providerModelError } = await supabase
      .from("provider_models")
      .select("id, provider_id, supported_model_id, upstream_model_slug, capability, active, execution_template, execution_config")
      .eq("id", parsed.providerModelId)
      .maybeSingle();

    if (providerModelError) {
      throw new Error(providerModelError.message);
    }

    if (!providerModel) {
      throw new Error("Provider model is missing");
    }

    const runtimeContext = await loadProviderRuntimeContext(supabase, {
      providerId: providerModel.provider_id,
      supportedModelIds: providerModel.supported_model_id ? [providerModel.supported_model_id] : [],
    });
    const runtimeDiagnostics = getProviderModelRuntimeDiagnostics({
      providerModel: {
        id: providerModel.id,
        provider_id: providerModel.provider_id,
        supported_model_id: providerModel.supported_model_id,
        upstream_model_slug: providerModel.upstream_model_slug,
        capability: providerModel.capability,
        active: true,
        execution_template: providerModel.execution_template,
        execution_config: providerModel.execution_config ?? {},
      },
      provider: runtimeContext.providersById.get(providerModel.provider_id) ?? null,
      supportedModel: providerModel.supported_model_id
        ? runtimeContext.supportedModelsById.get(providerModel.supported_model_id) ?? null
        : null,
      workerTemplatesBySlug: runtimeContext.workerTemplatesBySlug,
      credentials: runtimeContext.credentialsByProviderId.get(providerModel.provider_id) ?? [],
    });

    if (runtimeDiagnostics.length > 0) {
      throw new Error(
        formatRuntimeDiagnosticsForError(
          "这个供应商模型当前不能启用，请先修复下面的问题：",
          runtimeDiagnostics
        )
      );
    }
  }

  const { error } = await supabase
    .from("provider_models")
    .update({ active: parsed.active })
    .eq("id", parsed.providerModelId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_model.state.update",
    targetType: "provider_model",
    targetId: parsed.providerModelId,
    summary: `${parsed.active ? "Activated" : "Deactivated"} provider model`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const updateProviderModelDetailsSchema = z.object({
  providerModelId: z.string().uuid(),
  providerId: z.string().uuid(),
  supportedModelId: z.string().uuid(),
  upstreamModelSlug: z.string().min(1).max(160),
  capability: capabilitySchema,
  active: z.boolean(),
  pricing: z.record(z.string(), z.unknown()).default({}),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  executionTemplate: z.string().trim().min(1).max(80).default("rest-async-poll-v1"),
  executionConfig: z.record(z.string(), z.unknown()).default({}),
});

export async function updateProviderModelDetails(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const showcaseCoverFile = isNonEmptyFile(formData.get("showcaseCoverFile"))
    ? (formData.get("showcaseCoverFile") as File)
    : null;
  const showcaseGalleryFiles = formData
    .getAll("showcaseGalleryFiles")
    .filter((value): value is File => isNonEmptyFile(value));
  const existingGalleryAssetIds = formData
    .getAll("existingShowcaseGalleryAssetIds")
    .filter((value): value is string => typeof value === "string");
  const existingGalleryPrompts = formData
    .getAll("existingShowcaseGalleryPrompts")
    .filter((value): value is string => typeof value === "string");
  const removeShowcaseCover = parseBooleanField(formData.get("removeShowcaseCover"));
  const replaceShowcaseGallery = parseBooleanField(formData.get("replaceShowcaseGallery"));
  const parsed = updateProviderModelDetailsSchema.parse({
    providerModelId: formData.get("providerModelId"),
    providerId: formData.get("providerId"),
    supportedModelId: formData.get("supportedModelId"),
    upstreamModelSlug: formData.get("upstreamModelSlug"),
    capability: formData.get("capability"),
    active: parseBooleanField(formData.get("active")),
    pricing: parseJsonField(formData.get("pricing")),
    inputSchema: parseJsonField(formData.get("inputSchema")),
    outputSchema: parseJsonField(formData.get("outputSchema")),
    executionTemplate: (formData.get("executionTemplate") as string) || "rest-async-poll-v1",
    executionConfig: parseJsonField(formData.get("executionConfig")),
  });
  await ensureWorkerTemplateExists({
    supabase,
    slug: parsed.executionTemplate,
    displayName: parsed.executionTemplate,
    config: parsed.executionConfig,
  });

  const { data: supportedModelRow, error: supportedModelError } = await supabase
    .from("supported_models")
    .select("model_slug, capability, billing_config")
    .eq("id", parsed.supportedModelId)
    .maybeSingle();

  if (supportedModelError) {
    throw new Error(supportedModelError.message);
  }

  if (!supportedModelRow) {
    throw new Error("Supported model is missing");
  }

  if (supportedModelRow.capability !== parsed.capability) {
    throw new Error("Provider model capability must match the selected public model capability");
  }

  assertBillingConfig(supportedModelRow.billing_config);
  const runtimeContext = await loadProviderRuntimeContext(supabase, {
    providerId: parsed.providerId,
    supportedModelIds: [parsed.supportedModelId],
  });
  const provider = runtimeContext.providersById.get(parsed.providerId) ?? null;
  const supportedModel = runtimeContext.supportedModelsById.get(parsed.supportedModelId) ?? null;
  const runtimeDiagnostics = getProviderModelRuntimeDiagnostics({
    providerModel: {
      id: parsed.providerModelId,
      provider_id: parsed.providerId,
      supported_model_id: parsed.supportedModelId,
      upstream_model_slug: parsed.upstreamModelSlug,
      capability: parsed.capability,
      active: parsed.active,
      execution_template: parsed.executionTemplate,
      execution_config: parsed.executionConfig,
    },
    provider,
    supportedModel,
    workerTemplatesBySlug: runtimeContext.workerTemplatesBySlug,
    credentials: runtimeContext.credentialsByProviderId.get(parsed.providerId) ?? [],
  });

  if (parsed.active && runtimeDiagnostics.length > 0) {
    throw new Error(
      formatRuntimeDiagnosticsForError(
        "这个供应商模型当前不能直接启用，请先修复下面的问题：",
        runtimeDiagnostics
      )
    );
  }

  const pricingConfig = parseBillingConfig(parsed.pricing);
  const { error } = await supabase
    .from("provider_models")
    .update({
      provider_id: parsed.providerId,
      supported_model_id: parsed.supportedModelId,
      public_model_slug: supportedModelRow.model_slug,
      upstream_model_slug: parsed.upstreamModelSlug,
      capability: parsed.capability,
      active: parsed.active,
      pricing: pricingConfig,
      input_schema: parsed.inputSchema,
      output_schema: parsed.outputSchema,
      execution_template: parsed.executionTemplate,
      execution_config: parsed.executionConfig,
    })
    .eq("id", parsed.providerModelId);

  if (error) {
    throw new Error(error.message);
  }

  await syncProviderModelShowcaseAssets({
    supabase,
    providerModelId: parsed.providerModelId,
    coverFile: showcaseCoverFile,
    coverPrompt: normalizeOptionalText(formData.get("showcaseCoverPrompt")),
    existingCoverAssetId: normalizeOptionalText(formData.get("existingShowcaseCoverAssetId")),
    existingCoverPrompt: normalizeOptionalText(formData.get("existingShowcaseCoverPrompt")),
    removeCover: removeShowcaseCover,
    galleryFiles: showcaseGalleryFiles,
    galleryPrompts:
      normalizeOptionalText(formData.get("showcaseGalleryPromptsText"))
        ?.split(/\r?\n/)
        .map((value) => value.trim()) ?? [],
    existingGalleryPromptUpdates: existingGalleryAssetIds.map((id, index) => ({
      id,
      prompt: existingGalleryPrompts[index]?.trim() || null,
    })),
    deleteGalleryAssetIds: formData
      .getAll("deleteShowcaseGalleryAssetIds")
      .filter((value): value is string => typeof value === "string"),
    replaceGallery: replaceShowcaseGallery,
  });

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_model.update",
    targetType: "provider_model",
    targetId: parsed.providerModelId,
    summary: `Updated provider model ${supportedModelRow.model_slug}`,
    details: {
      ...parsed,
      pricing: pricingConfig,
      publicModelSlug: supportedModelRow.model_slug,
    },
  });

  revalidatePath("/internal");
}

const deleteProviderModelSchema = z.object({
  providerModelId: z.string().uuid(),
});

export async function deleteProviderModel(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteProviderModelSchema.parse({
    providerModelId: formData.get("providerModelId"),
  });

  const { data: providerModelRow, error: providerModelError } = await supabase
    .from("provider_models")
    .select("id, public_model_slug, upstream_model_slug")
    .eq("id", parsed.providerModelId)
    .maybeSingle();

  if (providerModelError) {
    throw new Error(providerModelError.message);
  }

  if (!providerModelRow) {
    throw new Error("Provider model is missing");
  }

  const { data: routingUsageRows, error: routingUsageError } = await supabase
    .from("routing_rules")
    .select("id")
    .or(
      `primary_provider_model_id.eq.${parsed.providerModelId},fallback_provider_model_id.eq.${parsed.providerModelId}`
    )
    .limit(1);

  if (routingUsageError) {
    throw new Error(routingUsageError.message);
  }

  if ((routingUsageRows ?? []).length > 0) {
    redirect(
      buildInternalAlertHref({
        tab: "economics",
        message: "删除失败：该模型映射仍被路由规则引用，请先调整路由配置。",
        level: "warning",
      })
    );
  }

  const { error } = await supabase
    .from("provider_models")
    .delete()
    .eq("id", parsed.providerModelId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "provider_model.delete",
    targetType: "provider_model",
    targetId: parsed.providerModelId,
    summary: `Deleted provider model ${providerModelRow.public_model_slug}`,
    details: {
      providerModelId: parsed.providerModelId,
      publicModelSlug: providerModelRow.public_model_slug,
      upstreamModelSlug: providerModelRow.upstream_model_slug,
    },
  });

  revalidatePath("/internal");
}

const createRoutingRuleSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  supportedModelId: z.string().uuid(),
  capability: capabilitySchema,
  primaryProviderModelId: z.string().uuid(),
  fallbackProviderModelId: z.string().uuid().nullable(),
  routeStrategy: z.string().min(3).max(120),
  active: z.boolean(),
});

export async function createRoutingRule(formData: FormData) {
  const { supabase, userId, workspaceId, isPasswordAccess } = await getInternalAdminContext();
  const workspaceScope = normalizeOptionalText(formData.get("workspaceScope"));
  const fallbackProviderModelId = normalizeOptionalText(formData.get("fallbackProviderModelId"));
  const effectiveWorkspaceScope = isPasswordAccess ? "global" : workspaceScope;

  const parsed = createRoutingRuleSchema.parse({
    workspaceId: effectiveWorkspaceScope === "global" ? undefined : workspaceId,
    supportedModelId: formData.get("supportedModelId"),
    capability: formData.get("capability"),
    primaryProviderModelId: formData.get("primaryProviderModelId"),
    fallbackProviderModelId,
    routeStrategy: formData.get("routeStrategy"),
    active: parseBooleanField(formData.get("active")),
  });

  const { data: supportedModelRow, error: supportedModelError } = await supabase
    .from("supported_models")
    .select("model_slug, capability, billing_config")
    .eq("id", parsed.supportedModelId)
    .maybeSingle();

  if (supportedModelError) {
    throw new Error(supportedModelError.message);
  }

  if (!supportedModelRow) {
    throw new Error("Supported model is missing");
  }

  if (supportedModelRow.capability !== parsed.capability) {
    throw new Error("Routing capability must match the selected public model capability");
  }

  assertBillingConfig(supportedModelRow.billing_config);

  const providerModelIds = [
    parsed.primaryProviderModelId,
    parsed.fallbackProviderModelId,
  ].filter((value): value is string => Boolean(value));

  if (providerModelIds.length > 0) {
    const { data: selectedProviderModels, error: selectedProviderModelsError } = await supabase
      .from("provider_models")
      .select("id, supported_model_id, capability")
      .in("id", providerModelIds);

    if (selectedProviderModelsError) {
      throw new Error(selectedProviderModelsError.message);
    }

    const invalidModel = (selectedProviderModels ?? []).find(
      (row) =>
        row.supported_model_id !== parsed.supportedModelId ||
        row.capability !== parsed.capability
    );

    if (invalidModel) {
      throw new Error("Primary and fallback provider models must belong to the selected public model and capability");
    }
  }

  const runtimeContext = await loadProviderRuntimeContext(supabase, {
    providerModelIds,
    supportedModelIds: [parsed.supportedModelId],
  });
  const runtimeDiagnostics = getRoutingRuleRuntimeDiagnostics({
    routingRule: {
      id: "new",
      public_model_slug: supportedModelRow.model_slug,
      capability: parsed.capability,
      primary_provider_model_id: parsed.primaryProviderModelId,
      fallback_provider_model_id: parsed.fallbackProviderModelId,
      active: parsed.active,
    },
    providerModelsById: runtimeContext.providerModelsById,
    providersById: runtimeContext.providersById,
    supportedModelsById: runtimeContext.supportedModelsById,
    credentialsByProviderId: runtimeContext.credentialsByProviderId,
    workerTemplatesBySlug: runtimeContext.workerTemplatesBySlug,
  });

  if (parsed.active && runtimeDiagnostics.length > 0) {
    throw new Error(
      formatRuntimeDiagnosticsForError(
        "这个路由当前不能直接启用，请先修复下面的问题：",
        runtimeDiagnostics
      )
    );
  }

  const { data, error } = await supabase
    .from("routing_rules")
    .insert({
    workspace_id: parsed.workspaceId ?? null,
    public_model_slug: supportedModelRow.model_slug,
    capability: parsed.capability,
    primary_provider_model_id: parsed.primaryProviderModelId,
    fallback_provider_model_id: parsed.fallbackProviderModelId,
    route_strategy: parsed.routeStrategy,
    active: parsed.active,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "routing_rule.create",
    targetType: "routing_rule",
    targetId: data?.id ?? null,
    summary: `Created routing rule for ${supportedModelRow.model_slug}`,
    details: {
      ...parsed,
      publicModelSlug: supportedModelRow.model_slug,
    },
  });

  revalidatePath("/internal");
}

const updateRoutingRuleSchema = z.object({
  routingRuleId: z.string().uuid(),
  primaryProviderModelId: z.string().uuid(),
  fallbackProviderModelId: z.string().uuid().nullable(),
  routeStrategy: z.string().min(3).max(120),
  active: z.boolean(),
});

export async function updateRoutingRule(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const fallbackProviderModelId = normalizeOptionalText(formData.get("fallbackProviderModelId"));

  const parsed = updateRoutingRuleSchema.parse({
    routingRuleId: formData.get("routingRuleId"),
    primaryProviderModelId: formData.get("primaryProviderModelId"),
    fallbackProviderModelId,
    routeStrategy: formData.get("routeStrategy"),
    active: parseBooleanField(formData.get("active")),
  });

  const { data: currentRule, error: currentRuleError } = await supabase
    .from("routing_rules")
    .select("public_model_slug, capability")
    .eq("id", parsed.routingRuleId)
    .maybeSingle();

  if (currentRuleError) {
    throw new Error(currentRuleError.message);
  }

  if (!currentRule) {
    throw new Error("Routing rule is missing");
  }

  const providerModelIds = [
    parsed.primaryProviderModelId,
    parsed.fallbackProviderModelId,
  ].filter((value): value is string => Boolean(value));

  if (providerModelIds.length > 0) {
    const { data: selectedProviderModels, error: selectedProviderModelsError } = await supabase
      .from("provider_models")
      .select("id, public_model_slug, capability")
      .in("id", providerModelIds);

    if (selectedProviderModelsError) {
      throw new Error(selectedProviderModelsError.message);
    }

    const invalidModel = (selectedProviderModels ?? []).find(
      (row) =>
        row.public_model_slug !== currentRule.public_model_slug ||
        row.capability !== currentRule.capability
    );

    if (invalidModel) {
      throw new Error("Primary and fallback provider models must stay within the same public model and capability");
    }
  }

  const runtimeContext = await loadProviderRuntimeContext(supabase, {
    providerModelIds,
  });
  const runtimeDiagnostics = getRoutingRuleRuntimeDiagnostics({
    routingRule: {
      id: parsed.routingRuleId,
      public_model_slug: currentRule.public_model_slug,
      capability: currentRule.capability,
      primary_provider_model_id: parsed.primaryProviderModelId,
      fallback_provider_model_id: parsed.fallbackProviderModelId,
      active: parsed.active,
    },
    providerModelsById: runtimeContext.providerModelsById,
    providersById: runtimeContext.providersById,
    supportedModelsById: runtimeContext.supportedModelsById,
    credentialsByProviderId: runtimeContext.credentialsByProviderId,
    workerTemplatesBySlug: runtimeContext.workerTemplatesBySlug,
  });

  if (parsed.active && runtimeDiagnostics.length > 0) {
    throw new Error(
      formatRuntimeDiagnosticsForError(
        "这个路由当前不能直接启用，请先修复下面的问题：",
        runtimeDiagnostics
      )
    );
  }

  const { error } = await supabase
    .from("routing_rules")
    .update({
      primary_provider_model_id: parsed.primaryProviderModelId,
      fallback_provider_model_id: parsed.fallbackProviderModelId,
      route_strategy: parsed.routeStrategy,
      active: parsed.active,
    })
    .eq("id", parsed.routingRuleId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "routing_rule.update",
    targetType: "routing_rule",
    targetId: parsed.routingRuleId,
    summary: `Updated routing rule ${parsed.routingRuleId}`,
    details: parsed,
  });

  revalidatePath("/internal");
}

const deleteRoutingRuleSchema = z.object({
  routingRuleId: z.string().uuid(),
});

export async function deleteRoutingRule(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = deleteRoutingRuleSchema.parse({
    routingRuleId: formData.get("routingRuleId"),
  });

  const { data: currentRule, error: currentRuleError } = await supabase
    .from("routing_rules")
    .select("id, public_model_slug, capability")
    .eq("id", parsed.routingRuleId)
    .maybeSingle();

  if (currentRuleError) {
    throw new Error(currentRuleError.message);
  }

  if (!currentRule) {
    throw new Error("Routing rule is missing");
  }

  const { error } = await supabase
    .from("routing_rules")
    .delete()
    .eq("id", parsed.routingRuleId);

  if (error) {
    throw new Error(error.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "routing_rule.delete",
    targetType: "routing_rule",
    targetId: parsed.routingRuleId,
    summary: `Deleted routing rule for ${currentRule.public_model_slug}`,
    details: {
      routingRuleId: parsed.routingRuleId,
      publicModelSlug: currentRule.public_model_slug,
      capability: currentRule.capability,
    },
  });

  revalidatePath("/internal");
}

const updateModelEconomicsBundleSchema = z.object({
  supportedModelId: z.string().uuid(),
  providerModelId: z.string().uuid(),
  executionTemplate: z.string().trim().min(1).max(80),
  supportedBillingConfig: z.unknown(),
  providerPricing: z.unknown(),
});

export async function updateModelEconomicsBundle(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();

  const parsed = updateModelEconomicsBundleSchema.parse({
    supportedModelId: formData.get("supportedModelId"),
    providerModelId: formData.get("providerModelId"),
    executionTemplate: formData.get("executionTemplate"),
    supportedBillingConfig: parseBillingConfigField(formData.get("supportedBillingConfig")).config,
    providerPricing: parseBillingConfigField(formData.get("providerPricing")).config,
  });

  const supportedBillingConfig = parseBillingConfig(parsed.supportedBillingConfig);
  const supportedLegacyFields = deriveLegacyBillingFields(supportedBillingConfig);
  const providerPricing = parseBillingConfig(parsed.providerPricing);

  const { data: providerModel, error: providerModelError } = await supabase
    .from("provider_models")
    .select("id, provider_id, supported_model_id, upstream_model_slug")
    .eq("id", parsed.providerModelId)
    .maybeSingle();

  if (providerModelError) {
    throw new Error(providerModelError.message);
  }

  if (!providerModel) {
    throw new Error("Provider model is missing");
  }

  if (providerModel.supported_model_id !== parsed.supportedModelId) {
    throw new Error("Provider model does not belong to the selected supported model");
  }

  await ensureWorkerTemplateExists({
    supabase,
    slug: parsed.executionTemplate,
    displayName: parsed.executionTemplate,
    config: {},
  });

  const { error: rpcError } = await supabase.rpc("admin_update_model_economics_bundle", {
    p_supported_model_id: parsed.supportedModelId,
    p_provider_model_id: parsed.providerModelId,
    p_supported_billing_config: supportedBillingConfig,
    p_supported_unit_label: supportedLegacyFields.unitLabel,
    p_supported_default_unit_cost: supportedLegacyFields.defaultUnitCost,
    p_provider_pricing: providerPricing,
  });

  if (rpcError) {
    if (rpcError.message.includes("admin_update_model_economics_bundle")) {
      throw new Error(
        "Missing RPC admin_update_model_economics_bundle. Run supabase/internal_model_economics_bundle.sql first."
      );
    }
    throw new Error(rpcError.message);
  }

  const { error: updateTemplateError } = await supabase
    .from("provider_models")
    .update({ execution_template: parsed.executionTemplate })
    .eq("id", parsed.providerModelId);

  if (updateTemplateError) {
    throw new Error(updateTemplateError.message);
  }

  await logAdminAudit({
    supabase,
    userId,
    workspaceId,
    action: "model_economics.bundle.update",
    targetType: "provider_model",
    targetId: parsed.providerModelId,
    summary: `Updated model economics bundle for provider model ${parsed.providerModelId}`,
    details: {
      supportedModelId: parsed.supportedModelId,
      providerModelId: parsed.providerModelId,
      executionTemplate: parsed.executionTemplate,
      supportedBillingConfig,
      providerPricing,
    },
  });

  revalidatePath("/internal");
}

const providerModelAutofillSchema = z.object({
  sourceText: z.string().trim().min(20).max(400_000),
  sourceLabel: z.string().trim().max(500).optional(),
});

const providerModelAutofillResultSchema = z.object({
  pricing: z.record(z.string(), z.unknown()).default({}),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  summary: z.string().max(2000).optional().default(""),
});

function normalizeAutofillResultPayload(raw: Record<string, unknown>) {
  const asObj = (value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const inputParamsObj = asObj(raw.inputParams);
  const outputParamsObj = asObj(raw.outputParams);
  const pricingObj = asObj(raw.pricing);
  const costObj = asObj(raw.cost);

  const pricing =
    raw.pricing && typeof raw.pricing === "object" && !Array.isArray(raw.pricing)
      ? (raw.pricing as Record<string, unknown>)
      : pricingObj;

  const inputSchema =
    raw.inputSchema && typeof raw.inputSchema === "object" && !Array.isArray(raw.inputSchema)
      ? (raw.inputSchema as Record<string, unknown>)
      : inputParamsObj;

  const outputSchema =
    raw.outputSchema && typeof raw.outputSchema === "object" && !Array.isArray(raw.outputSchema)
      ? (raw.outputSchema as Record<string, unknown>)
      : outputParamsObj;

  const summary =
    typeof raw.summary === "string"
      ? raw.summary
      : undefined;

  return {
    pricing: Object.keys(pricing).length > 0 ? pricing : costObj,
    inputSchema,
    outputSchema,
    summary,
  };
}

function stripHtmlToText(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function estimateDeepSeekCostUsd(inputTokens: number, outputTokens: number) {
  const inputRatePerMillion = 0.27;
  const outputRatePerMillion = 1.1;
  const inputCost = (Math.max(0, inputTokens) / 1_000_000) * inputRatePerMillion;
  const outputCost = (Math.max(0, outputTokens) / 1_000_000) * outputRatePerMillion;
  return Number((inputCost + outputCost).toFixed(8));
}

function formatDeepSeekNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "unknown");
  const lower = message.toLowerCase();

  if (lower.includes("connect timeout") || lower.includes("timeout")) {
    return "DeepSeek network timeout: 与 DeepSeek API 建立连接超时，请检查本机/服务器外网连通性或代理设置后重试。";
  }
  if (lower.includes("enotfound") || lower.includes("dns")) {
    return "DeepSeek DNS error: 无法解析 DeepSeek API 域名，请检查 DNS 或网络环境。";
  }
  if (lower.includes("fetch failed")) {
    return "DeepSeek network failed: 当前环境无法访问 DeepSeek API（可能是网络受限/代理未配置）。";
  }
  return `DeepSeek request failed: ${message}`;
}

function resolveProxyUrl() {
  return (
    process.env.INTERNAL_HTTP_PROXY ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    "http://127.0.0.1:7890"
  );
}

function ensureProxyEnvForDeepSeek() {
  const proxyUrl = resolveProxyUrl();
  if (!process.env.HTTPS_PROXY && proxyUrl) {
    process.env.HTTPS_PROXY = proxyUrl;
  }
  if (!process.env.HTTP_PROXY && proxyUrl) {
    process.env.HTTP_PROXY = proxyUrl;
  }
  if (!process.env.NODE_USE_ENV_PROXY) {
    process.env.NODE_USE_ENV_PROXY = "1";
  }
}

function extractFirstJsonObject(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return "";

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || trimmed;
  const start = candidate.indexOf("{");
  if (start < 0) return "";

  let depth = 0;
  let inString = false;
  let escaping = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (inString) {
      if (escaping) {
        escaping = false;
      } else if (ch === "\\") {
        escaping = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }

    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return candidate.slice(start, i + 1);
      }
    }
  }

  return candidate;
}

function safeJsonParseObject(text: string) {
  const candidate = extractFirstJsonObject(text);
  if (!candidate) return null;
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

async function requestDeepSeekJsonObject(input: {
  apiKey: string;
  prompt: string;
}) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  const json = (await response.json()) as Record<string, unknown>;
  const usage = (json.usage ?? {}) as Record<string, unknown>;
  const inputTokens = Number(usage.prompt_tokens ?? 0);
  const outputTokens = Number(usage.completion_tokens ?? 0);
  const totalTokens = Number(usage.total_tokens ?? inputTokens + outputTokens);
  const text = (() => {
    const choices = Array.isArray(json.choices)
      ? (json.choices as Array<Record<string, unknown>>)
      : [];
    const message = choices[0]?.message;
    if (!message || typeof message !== "object" || Array.isArray(message)) return "";
    const content = (message as Record<string, unknown>).content;
    return typeof content === "string" ? content : "";
  })();

  return { response, json, text, inputTokens, outputTokens, totalTokens };
}

export async function generateProviderModelDraftFromSource(input: {
  sourceText: string;
  sourceLabel?: string;
}) {
  const startedAt = Date.now();
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const actorUserId = /^[0-9a-f-]{36}$/i.test(userId) ? userId : null;
  const usageWorkspaceId = normalizeUsageWorkspaceId(workspaceId);

  try {
    const parsedInput = providerModelAutofillSchema.parse(input);
    const apiKey = process.env.INTERNAL_DEEPSEEK_API_KEY ?? process.env.DEEPSEEK_API_KEY;
    ensureProxyEnvForDeepSeek();

    if (!apiKey) {
      return { ok: false as const, error: "Missing INTERNAL_DEEPSEEK_API_KEY" };
    }
    const compactSourceText = stripHtmlToText(parsedInput.sourceText).slice(0, 120_000);
    const sourceLabel = parsedInput.sourceLabel?.trim() || "manual://pasted-content";

    const prompt = [
    "You are an API integration analyst for an internal admin console.",
    "You MUST return valid json only.",
    "Return ONLY a strict JSON object. Do not include markdown, code fences, or explanations.",
    "Task: read upstream model API documentation and output ONLY pricing + input schema + output schema draft.",
    "Output keys must be EXACTLY these top-level keys:",
    "[pricing, inputSchema, outputSchema, summary]",
    "Do NOT output protocol/execution fields and do NOT output nested shapes like basic/protocol/inputParams/outputParams.",
    "Constraints:",
    "1) pricing must follow internal billing config format: { billingMode, currency, charges }.",
    "2) billingMode should be \"hybrid\" whenever possible.",
    "3) charges can include: perRequest, perImage, perVideo, perSecond, inputTextTokensPerMillion, outputTextTokensPerMillion; use number values ONLY when an explicit upstream provider cost is present in the source document.",
    "3a) Never invent pricing. Never use 0 as a placeholder. If the source does not include an explicit provider price, return charges as an empty object: {}.",
    "4) inputSchema format: { officialDocUrl, params: [{ name, type, required, description, example, exposedToCustomer }] }.",
    "5) outputSchema format: { officialDocUrl, fields: [{ name, type, description, example, exposedToCustomer }] }.",
    "6) summary: short chinese text describing what was recognized and what needs manual check.",
    "7) If unknown, return empty string or empty array/object. Never omit required top-level keys.",
    "JSON OUTPUT EXAMPLE:",
    "{",
    '  "pricing": {"billingMode":"hybrid","currency":"USD","charges":{}},',
    '  "inputSchema": {"officialDocUrl":"","params":[]},',
    '  "outputSchema": {"officialDocUrl":"","fields":[]},',
    '  "summary": ""',
    "}",
    "",
      `Source Label: ${sourceLabel}`,
      "Source document content:",
      compactSourceText,
    ].join("\n");

    let deepseekRes: Response;
    try {
      deepseekRes = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0.1,
          max_tokens: 4000,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
    } catch (error) {
      const msg = formatDeepSeekNetworkError(error);
      await supabase.from("internal_model_ai_usage_logs").insert({
        workspace_id: usageWorkspaceId,
        actor_user_id: actorUserId,
        source_url: sourceLabel,
        model: "deepseek-chat",
        status: "failed",
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        estimated_cost_usd: 0,
        latency_ms: Date.now() - startedAt,
        error_message: msg.slice(0, 4000),
      });
      return { ok: false as const, error: msg };
    }

    const deepseekJson = (await deepseekRes.json()) as Record<string, unknown>;
    const usage = (deepseekJson.usage ?? {}) as Record<string, unknown>;
    const inputTokens = Number(usage.prompt_tokens ?? 0);
    const outputTokens = Number(usage.completion_tokens ?? 0);
    const totalTokens = Number(usage.total_tokens ?? inputTokens + outputTokens);
    const estimatedCostUsd = estimateDeepSeekCostUsd(inputTokens, outputTokens);

    const choices = Array.isArray(deepseekJson.choices)
      ? (deepseekJson.choices as Array<Record<string, unknown>>)
      : [];
    const text = choices[0]?.message &&
      typeof choices[0].message === "object" &&
      !Array.isArray(choices[0].message)
        ? (() => {
            const content = (choices[0].message as Record<string, unknown>).content;
            return typeof content === "string"
              ? content
              : "";
          })()
        : "";
    if (!text.trim()) {
      await supabase.from("internal_model_ai_usage_logs").insert({
        workspace_id: usageWorkspaceId,
        actor_user_id: actorUserId,
        source_url: sourceLabel,
        model: "deepseek-chat",
        status: "failed",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        latency_ms: Date.now() - startedAt,
        error_message: "DeepSeek returned empty content in JSON mode",
        raw_response: deepseekJson,
      });
      return {
        ok: false as const,
        error: "DeepSeek JSON 模式返回空内容，请重试一次（文档已说明该模式偶发空 content）。",
        debugRawOutput: JSON.stringify(deepseekJson).slice(0, 8000),
      };
    }

    if (!deepseekRes.ok) {
      const errorMessage =
        typeof ((deepseekJson.error as Record<string, unknown> | undefined)?.message) === "string"
          ? ((deepseekJson.error as Record<string, unknown>).message as string)
          : `DeepSeek request failed with ${deepseekRes.status}`;
      const detailedError =
        deepseekRes.status === 400
          ? `DeepSeek 400: 请求参数错误。${errorMessage}`
          : deepseekRes.status === 401 || deepseekRes.status === 403
            ? `DeepSeek 鉴权失败（${deepseekRes.status}）：请检查 INTERNAL_DEEPSEEK_API_KEY 是否正确。`
            : deepseekRes.status === 429
              ? `DeepSeek 限流（429）：当前请求频率或配额超限，请稍后重试。`
              : deepseekRes.status >= 500
                ? `DeepSeek 服务异常（${deepseekRes.status}）：上游暂时不可用，请稍后重试。`
                : `DeepSeek 请求失败（${deepseekRes.status}）：${errorMessage}`;
      await supabase.from("internal_model_ai_usage_logs").insert({
        workspace_id: usageWorkspaceId,
        actor_user_id: actorUserId,
        source_url: sourceLabel,
        model: "deepseek-chat",
        status: "failed",
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        estimated_cost_usd: estimatedCostUsd,
        latency_ms: Date.now() - startedAt,
        error_message: detailedError.slice(0, 4000),
      });
      return { ok: false as const, error: detailedError };
    }

    let result: z.infer<typeof providerModelAutofillResultSchema> | null = null;
    let parseError = false;
    try {
      const parsedResult = safeJsonParseObject(text);
      if (!parsedResult) {
        throw new Error("invalid-json");
      }
      result = providerModelAutofillResultSchema.parse(
        normalizeAutofillResultPayload(parsedResult)
      );
    } catch {
      parseError = true;
    }

    if (parseError) {
      try {
        const repairPrompt = [
          "将下面内容修复为严格 JSON 对象，只输出 JSON，不要解释。",
          "必须包含固定顶层键：pricing, inputSchema, outputSchema, summary。",
          "若缺失则用空字符串或空对象/空数组补齐。",
          "待修复内容：",
          text || JSON.stringify(deepseekJson),
        ].join("\n");

        const repaired = await requestDeepSeekJsonObject({ apiKey, prompt: repairPrompt });
        const repairedParsed = safeJsonParseObject(repaired.text);
        if (!repaired.response.ok || !repairedParsed) {
          throw new Error("repair-failed");
        }
        result = providerModelAutofillResultSchema.parse(
          normalizeAutofillResultPayload(repairedParsed)
        );
      } catch {
        await supabase.from("internal_model_ai_usage_logs").insert({
          workspace_id: usageWorkspaceId,
          actor_user_id: actorUserId,
          source_url: sourceLabel,
          model: "deepseek-chat",
          status: "failed",
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: totalTokens,
          estimated_cost_usd: estimatedCostUsd,
          latency_ms: Date.now() - startedAt,
          error_message: "Failed to parse DeepSeek JSON output (including repair pass)",
          raw_response: deepseekJson,
        });
        return {
          ok: false as const,
          error: "DeepSeek 返回内容不是可解析 JSON。请重试，或拆小文档后再试。",
          debugRawOutput: (text || JSON.stringify(deepseekJson)).slice(0, 8000),
        };
      }
    }

    if (!result) {
      return {
        ok: false as const,
        error: "DeepSeek 识别结果为空，请重试。",
        debugRawOutput: (text || JSON.stringify(deepseekJson)).slice(0, 8000),
      };
    }

      await supabase.from("internal_model_ai_usage_logs").insert({
      workspace_id: usageWorkspaceId,
      actor_user_id: actorUserId,
      source_url: sourceLabel,
      model: "deepseek-chat",
      status: "succeeded",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCostUsd,
      latency_ms: Date.now() - startedAt,
      result_payload: result,
    });

    await logAdminAudit({
      supabase,
      userId,
      workspaceId,
      action: "provider_model.autofill.generate",
      targetType: "provider_model",
      summary: `Generated provider model draft from pasted doc`,
      details: {
        sourceLabel,
        model: "deepseek-chat",
        inputTokens,
        outputTokens,
        totalTokens,
        estimatedCostUsd,
      },
    });

    revalidatePath("/internal");
    return {
      ok: true as const,
      data: {
        ...result,
        pricingText: JSON.stringify(result.pricing ?? {}, null, 2),
        inputSchemaText: JSON.stringify(result.inputSchema ?? {}, null, 2),
        outputSchemaText: JSON.stringify(result.outputSchema ?? {}, null, 2),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Autofill failed";
    return { ok: false as const, error: message };
  }
}
