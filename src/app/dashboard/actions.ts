"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import crypto from "crypto";

// ---------- helpers ----------

async function getAuthedWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) throw new Error("No workspace found");

  const canWrite = ["owner", "admin", "billing"].includes(membership.role);
  if (!canWrite) throw new Error("Insufficient permissions");

  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

type ActionResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

// ---------- Create API Key ----------

const createKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(64),
  environment: z.string().min(1).max(32),
  monthlyBudget: z.coerce.number().min(0).max(1_000_000),
});

export async function createApiKey(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const parsed = createKeySchema.safeParse({
      name: formData.get("name"),
      environment: formData.get("environment"),
      monthlyBudget: formData.get("monthlyBudget"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { supabase, userId, workspaceId } = await getAuthedWorkspace();
    const { name, environment, monthlyBudget } = parsed.data;

    // Generate key: prefix (visible) + secret (shown once)
    const prefixRand = crypto.randomBytes(4).toString("hex");
    const envPrefix =
      environment === "Production"
        ? "prod"
        : environment === "Development"
          ? "dev"
          : "srv";
    const keyPrefix = `ooq_${envPrefix}_${prefixRand}`;
    const secret = `ooq_${crypto.randomBytes(32).toString("base64url")}`;
    const secretHash = crypto.createHash("sha256").update(secret).digest("hex");

    const { error } = await supabase.from("api_keys").insert({
      workspace_id: workspaceId,
      name,
      key_prefix: keyPrefix,
      secret_hash: secretHash,
      environment,
      monthly_budget: monthlyBudget,
      status: "active",
      created_by: userId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true, data: { secret, keyPrefix } };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ---------- Delete / Revoke API Key ----------

const keyIdSchema = z.object({
  keyId: z.string().uuid(),
});

export async function deleteApiKey(keyId: string): Promise<ActionResult> {
  try {
    const parsed = keyIdSchema.safeParse({ keyId });
    if (!parsed.success) return { success: false, error: "Invalid key ID" };

    const { supabase, workspaceId } = await getAuthedWorkspace();

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ---------- Update API Key (name / budget) ----------

const updateKeySchema = z.object({
  keyId: z.string().uuid(),
  name: z.string().min(1).max(64).optional(),
  monthlyBudget: z.coerce.number().min(0).max(1_000_000).optional(),
});

export async function updateApiKey(input: {
  keyId: string;
  name?: string;
  monthlyBudget?: number;
}): Promise<ActionResult> {
  try {
    const parsed = updateKeySchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0].message };

    const { supabase, workspaceId } = await getAuthedWorkspace();
    const { keyId, name, monthlyBudget } = parsed.data;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (monthlyBudget !== undefined) updates.monthly_budget = monthlyBudget;

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "Nothing to update" };
    }

    const { error } = await supabase
      .from("api_keys")
      .update(updates)
      .eq("id", keyId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}

// ---------- Toggle Key Status (pause / resume) ----------

export async function toggleApiKeyStatus(
  keyId: string,
  newStatus: "active" | "paused"
): Promise<ActionResult> {
  try {
    const parsed = keyIdSchema.safeParse({ keyId });
    if (!parsed.success) return { success: false, error: "Invalid key ID" };
    if (newStatus !== "active" && newStatus !== "paused") {
      return { success: false, error: "Invalid status" };
    }

    const { supabase, workspaceId } = await getAuthedWorkspace();

    const { error } = await supabase
      .from("api_keys")
      .update({ status: newStatus })
      .eq("id", keyId)
      .eq("workspace_id", workspaceId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "Unknown error",
    };
  }
}
