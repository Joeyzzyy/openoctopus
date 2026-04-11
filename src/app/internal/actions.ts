"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { encryptProviderSecret } from "@/lib/provider-secret-crypto";
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
    .select("provider_id")
    .eq("id", parsed.credentialId)
    .maybeSingle();

  if (credentialRowError) {
    throw new Error(credentialRowError.message);
  }

  if (!credentialRow) {
    throw new Error("Provider credential is missing");
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

const createSupportedModelSchema = z.object({
  provider: z.string().min(2).max(80),
  modelSlug: z.string().min(3).max(160),
  displayName: z.string().min(2).max(120),
  modality: modalitySchema,
  capability: capabilitySchema,
  unitLabel: z.string().min(1).max(40),
  defaultUnitCost: z.coerce.number().min(0).max(1000000),
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
    unitLabel: formData.get("unitLabel"),
    defaultUnitCost: formData.get("defaultUnitCost"),
    active: parseBooleanField(formData.get("active")),
  });

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
      unit_label: parsed.unitLabel,
      default_unit_cost: parsed.defaultUnitCost,
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
    details: parsed,
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

const createProviderModelSchema = z.object({
  providerId: z.string().uuid(),
  supportedModelId: z.string().uuid(),
  upstreamModelSlug: z.string().min(1).max(160),
  capability: capabilitySchema,
  active: z.boolean(),
  pricing: z.record(z.string(), z.unknown()).default({}),
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
    inputSchema: parseJsonField(formData.get("inputSchema")),
    outputSchema: parseJsonField(formData.get("outputSchema")),
  });

  const { data: supportedModelRow, error: supportedModelError } = await supabase
    .from("supported_models")
    .select("model_slug, capability")
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

  const { data, error } = await supabase
    .from("provider_models")
    .insert({
    provider_id: parsed.providerId,
    supported_model_id: parsed.supportedModelId,
    public_model_slug: supportedModelRow.model_slug,
    upstream_model_slug: parsed.upstreamModelSlug,
    capability: parsed.capability,
    active: parsed.active,
    pricing: parsed.pricing,
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
    .select("model_slug, capability")
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
