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

function normalizeOptionalText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function parseBooleanField(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
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

function normalizeOptionalUrl(value: FormDataEntryValue | null) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  return z.string().url().parse(normalized);
}

function parseJsonArrayField(value: FormDataEntryValue | null) {
  const raw = normalizeOptionalText(value);
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("JSON field must contain an array");
  }

  return parsed as Array<Record<string, unknown>>;
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

async function uploadPricingEvidenceFile(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  providerId: string;
  upstreamModelSlug: string;
  file: File | null;
}) {
  const { supabase, providerId, upstreamModelSlug, file } = input;

  if (!file || file.size === 0) {
    return null;
  }

  const sanitizedSlug = upstreamModelSlug.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  const extension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : null;
  const fileExt = extension && /^[a-z0-9]+$/.test(extension) ? extension : "bin";
  const path = `${providerId}/${sanitizedSlug}/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("provider-pricing-evidence")
    .upload(path, file, {
      contentType: file.type || undefined,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload pricing evidence: ${error.message}`);
  }

  return {
    type: "image",
    path,
    label: file.name || "pricing evidence",
    uploadedAt: new Date().toISOString(),
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

  const { error } = await input.supabase.from("admin_audit_logs").insert(buildPayload(input.workspaceId));

  const isWorkspaceFkViolation =
    error?.code === "23503" &&
    typeof error.message === "string" &&
    error.message.includes("admin_audit_logs_workspace_id_fkey");

  if (isWorkspaceFkViolation) {
    const { error: fallbackError } = await input.supabase.from("admin_audit_logs").insert(buildPayload(null));
    if (!fallbackError) {
      return;
    }
    throw new Error(fallbackError.message);
  }

  if (error) {
    throw new Error(error.message);
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
    modality: formData.get("modality"),
    capability: formData.get("capability"),
    billingConfig: parseBillingConfigField(formData.get("billingConfig")).config,
    active: parseBooleanField(formData.get("active")),
  });
  const billingConfig = parseBillingConfig(parsed.billingConfig);
  const legacyBillingFields = deriveLegacyBillingFields(billingConfig);

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
      billing_config: billingConfig,
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
      billingConfig,
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
    modality: formData.get("modality"),
    capability: formData.get("capability"),
    billingConfig: parseBillingConfigField(formData.get("billingConfig")).config,
    active: parseBooleanField(formData.get("active")),
  });
  const billingConfig = parseBillingConfig(parsed.billingConfig);
  const legacyBillingFields = deriveLegacyBillingFields(billingConfig);

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
      billing_config: billingConfig,
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
      billingConfig,
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
    throw new Error("该可售模型仍有关联的供应商模型映射，无法删除。");
  }
  if ((routingRows ?? []).length > 0) {
    throw new Error("该可售模型仍被路由配置使用，无法删除。");
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
  pricingSourceUrl: z.string().url().nullable(),
  pricingSourceNote: z.string().trim().max(2000).nullable(),
  pricingSourceEvidence: z.array(z.record(z.string(), z.unknown())).default([]),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  executionTemplate: z.string().trim().min(1).max(80).default("rest-async-poll-v1"),
  executionConfig: z.record(z.string(), z.unknown()).default({}),
});

export async function createProviderModel(formData: FormData) {
  try {
    const { supabase, userId, workspaceId } = await getInternalAdminContext();
    const parsed = createProviderModelSchema.parse({
      providerId: formData.get("providerId"),
      supportedModelId: formData.get("supportedModelId"),
      upstreamModelSlug: formData.get("upstreamModelSlug"),
      capability: formData.get("capability"),
      active: parseBooleanField(formData.get("active")),
      pricing: parseJsonField(formData.get("pricing")),
      pricingSourceUrl: normalizeOptionalUrl(formData.get("pricingSourceUrl")),
      pricingSourceNote: normalizeOptionalText(formData.get("pricingSourceNote")),
      pricingSourceEvidence: parseJsonArrayField(formData.get("pricingSourceEvidence")),
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
    const pricingEvidenceFile = formData.get("pricingSourceEvidenceFile");
    const uploadedEvidence = await uploadPricingEvidenceFile({
      supabase,
      providerId: parsed.providerId,
      upstreamModelSlug: parsed.upstreamModelSlug,
      file: pricingEvidenceFile instanceof File ? pricingEvidenceFile : null,
    });
    const pricingSourceEvidence = uploadedEvidence
      ? [...parsed.pricingSourceEvidence, uploadedEvidence]
      : parsed.pricingSourceEvidence;

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
        pricing_source_url: parsed.pricingSourceUrl,
        pricing_source_note: parsed.pricingSourceNote,
        pricing_source_evidence: pricingSourceEvidence,
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
        pricingSourceEvidence,
        publicModelSlug: supportedModelRow.model_slug,
      },
    });

    revalidatePath("/internal");
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试。";
    redirect(`/internal?tab=economics&alert=${encodeURIComponent(message)}`);
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
      .select("id, provider_id, supported_model_id, upstream_model_slug, capability, active, execution_template")
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
  pricingSourceUrl: z.string().url().nullable(),
  pricingSourceNote: z.string().trim().max(2000).nullable(),
  pricingSourceEvidence: z.array(z.record(z.string(), z.unknown())).default([]),
  inputSchema: z.record(z.string(), z.unknown()).default({}),
  outputSchema: z.record(z.string(), z.unknown()).default({}),
  executionTemplate: z.string().trim().min(1).max(80).default("rest-async-poll-v1"),
  executionConfig: z.record(z.string(), z.unknown()).default({}),
});

export async function updateProviderModelDetails(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const parsed = updateProviderModelDetailsSchema.parse({
    providerModelId: formData.get("providerModelId"),
    providerId: formData.get("providerId"),
    supportedModelId: formData.get("supportedModelId"),
    upstreamModelSlug: formData.get("upstreamModelSlug"),
    capability: formData.get("capability"),
    active: parseBooleanField(formData.get("active")),
    pricing: parseJsonField(formData.get("pricing")),
    pricingSourceUrl: normalizeOptionalUrl(formData.get("pricingSourceUrl")),
    pricingSourceNote: normalizeOptionalText(formData.get("pricingSourceNote")),
    pricingSourceEvidence: parseJsonArrayField(formData.get("pricingSourceEvidence")),
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
  const pricingEvidenceFile = formData.get("pricingSourceEvidenceFile");
  const uploadedEvidence = await uploadPricingEvidenceFile({
    supabase,
    providerId: parsed.providerId,
    upstreamModelSlug: parsed.upstreamModelSlug,
    file: pricingEvidenceFile instanceof File ? pricingEvidenceFile : null,
  });
  const pricingSourceEvidence = uploadedEvidence
    ? [...parsed.pricingSourceEvidence, uploadedEvidence]
    : parsed.pricingSourceEvidence;

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
      pricing_source_url: parsed.pricingSourceUrl,
      pricing_source_note: parsed.pricingSourceNote,
      pricing_source_evidence: pricingSourceEvidence,
      input_schema: parsed.inputSchema,
      output_schema: parsed.outputSchema,
      execution_template: parsed.executionTemplate,
      execution_config: parsed.executionConfig,
    })
    .eq("id", parsed.providerModelId);

  if (error) {
    throw new Error(error.message);
  }

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
      pricingSourceEvidence,
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
      `/internal?tab=economics&alert=${encodeURIComponent(
        "删除失败：该模型映射仍被路由规则引用，请先调整路由配置。"
      )}`
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
  pricingSourceUrl: z.string().url().nullable(),
  pricingSourceNote: z.string().trim().max(2000).nullable(),
  pricingSourceEvidence: z.array(z.record(z.string(), z.unknown())).default([]),
});

export async function updateModelEconomicsBundle(formData: FormData) {
  const { supabase, userId, workspaceId } = await getInternalAdminContext();

  const parsed = updateModelEconomicsBundleSchema.parse({
    supportedModelId: formData.get("supportedModelId"),
    providerModelId: formData.get("providerModelId"),
    executionTemplate: formData.get("executionTemplate"),
    supportedBillingConfig: parseBillingConfigField(formData.get("supportedBillingConfig")).config,
    providerPricing: parseBillingConfigField(formData.get("providerPricing")).config,
    pricingSourceUrl: normalizeOptionalUrl(formData.get("pricingSourceUrl")),
    pricingSourceNote: normalizeOptionalText(formData.get("pricingSourceNote")),
    pricingSourceEvidence: parseJsonArrayField(formData.get("pricingSourceEvidence")),
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

  const pricingEvidenceFile = formData.get("pricingSourceEvidenceFile");
  const uploadedEvidence = await uploadPricingEvidenceFile({
    supabase,
    providerId: providerModel.provider_id,
    upstreamModelSlug: providerModel.upstream_model_slug,
    file: pricingEvidenceFile instanceof File ? pricingEvidenceFile : null,
  });
  const pricingSourceEvidence = uploadedEvidence
    ? [...parsed.pricingSourceEvidence, uploadedEvidence]
    : parsed.pricingSourceEvidence;

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
    p_pricing_source_url: parsed.pricingSourceUrl,
    p_pricing_source_note: parsed.pricingSourceNote,
    p_pricing_source_evidence: pricingSourceEvidence,
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
      pricingSourceUrl: parsed.pricingSourceUrl,
      pricingSourceNote: parsed.pricingSourceNote,
      pricingSourceEvidence,
    },
  });

  revalidatePath("/internal");
}
