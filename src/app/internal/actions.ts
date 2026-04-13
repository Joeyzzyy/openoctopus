"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { deriveLegacyBillingFields, parseBillingConfig } from "@/lib/billing-config";
import { encryptProviderSecret } from "@/lib/provider-secret-crypto";
import {
  getProviderModelRuntimeDiagnostics,
  getRoutingRuleRuntimeDiagnostics,
  type RuntimeCredential,
  type RuntimeProvider,
  type RuntimeProviderModel,
  type RuntimeRoutingRule,
  type RuntimeSupportedModel,
} from "@/lib/provider-runtime-guard";
import { createClient } from "@/lib/supabase/server";

const providerKindSchema = z.enum(["wavespeed", "partner", "custom"]);
const providerStatusSchema = z.enum(["healthy", "degraded", "offline"]);
const capabilitySchema = z.enum([
  "image_generation",
  "image_edit",
  "video_generation",
]);
const modalitySchema = z.enum(["image", "video", "audio"]);

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
        .select("id, provider_id, supported_model_id, upstream_model_slug, capability, active")
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

  const [providersResponse, credentialsResponse, supportedModelsResponse] = await Promise.all([
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
  };
}

async function logAdminAudit(input: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  workspaceId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const { error } = await input.supabase.from("admin_audit_logs").insert({
    actor_user_id: input.userId,
    workspace_id: input.workspaceId,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    summary: input.summary,
    details: input.details ?? {},
  });

  if (error) {
    throw new Error(error.message);
  }
}

const createProviderSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z.string().min(2).max(80),
  kind: providerKindSchema,
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
    kind: formData.get("kind"),
    baseUrl: normalizeOptionalText(formData.get("baseUrl")) ?? "",
    status: formData.get("status"),
    regions: parseStringArray(formData.get("regions")),
    credentialsRef: normalizeOptionalText(formData.get("credentialsRef")) ?? "",
    config: parseJsonField(formData.get("config")),
  });

  const { data, error } = await supabase
    .from("providers")
    .insert({
    name: parsed.name,
    slug: parsed.slug,
    kind: parsed.kind,
    base_url: parsed.baseUrl || null,
    status: parsed.status,
    regions: parsed.regions,
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
    details: parsed,
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
  slug: z.string().min(2).max(80),
  kind: providerKindSchema,
  baseUrl: z.string().url().optional().or(z.literal("")),
  status: providerStatusSchema,
  regions: z.array(z.string()).default([]),
  credentialsRef: z.string().max(200).optional().or(z.literal("")),
  config: z.record(z.string(), z.unknown()).default({}),
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
    slug: formData.get("slug"),
    kind: formData.get("kind"),
    baseUrl: normalizeOptionalText(formData.get("baseUrl")) ?? "",
    status: formData.get("status"),
    regions: parseStringArray(formData.get("regions")),
    credentialsRef: normalizeOptionalText(formData.get("credentialsRef")) ?? "",
    config: parseJsonField(formData.get("config")),
  });

  const { error } = await supabase
    .from("providers")
    .update({
      name: parsed.name,
      slug: parsed.slug,
      kind: parsed.kind,
      base_url: parsed.baseUrl || null,
      status: parsed.status,
      regions: parsed.regions,
      credentials_ref: parsed.credentialsRef || null,
      config: parsed.config,
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
    summary: `Updated provider ${parsed.slug}`,
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
  const parsed = createProviderCredentialSchema.parse({
    providerId: formData.get("providerId"),
    label: formData.get("label"),
    secret: formData.get("secret"),
    secretRef: normalizeOptionalText(formData.get("secretRef")) ?? "",
    environment: formData.get("environment"),
    notes: normalizeOptionalText(formData.get("notes")) ?? "",
    metadata: parseJsonField(formData.get("metadata")),
    isActive: parseBooleanField(formData.get("isActive")),
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
});

export async function createProviderModel(formData: FormData) {
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
    },
    provider,
    supportedModel,
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
      .select("id, provider_id, supported_model_id, upstream_model_slug, capability, active")
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
      },
      provider: runtimeContext.providersById.get(providerModel.provider_id) ?? null,
      supportedModel: providerModel.supported_model_id
        ? runtimeContext.supportedModelsById.get(providerModel.supported_model_id) ?? null
        : null,
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
    },
    provider,
    supportedModel,
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
  const { supabase, userId, workspaceId } = await getInternalAdminContext();
  const workspaceScope = normalizeOptionalText(formData.get("workspaceScope"));
  const fallbackProviderModelId = normalizeOptionalText(formData.get("fallbackProviderModelId"));

  const parsed = createRoutingRuleSchema.parse({
    workspaceId: workspaceScope === "global" ? undefined : workspaceId,
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
