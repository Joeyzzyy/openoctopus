import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const KEY_ALGO = "aes-256-gcm";

function deriveKeyMaterial() {
  const base = process.env.OPENOCTOPUS_API_KEY_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return crypto.createHash("sha256").update(base).digest();
}

function encryptSecret(secret: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(KEY_ALGO, deriveKeyMaterial(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decryptSecret(payload: string) {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid playground key payload");
  }
  const iv = Buffer.from(ivB64, "base64url");
  const tag = Buffer.from(tagB64, "base64url");
  const encrypted = Buffer.from(dataB64, "base64url");
  const decipher = crypto.createDecipheriv(KEY_ALGO, deriveKeyMaterial(), iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plain.toString("utf8");
}

async function createWorkspacePlaygroundKey(
  workspaceId: string,
  userId: string,
  replacedApiKeyId?: string | null
) {
  const supabaseAdmin = createAdminClient();
  const prefixRand = crypto.randomBytes(4).toString("hex");
  const keyPrefix = `ooq_pg_${prefixRand}`;
  const secret = `ooq_${crypto.randomBytes(32).toString("base64url")}`;
  const secretHash = crypto.createHash("sha256").update(secret).digest("hex");

  const { data: apiKeyRow, error: keyError } = await supabaseAdmin
    .from("api_keys")
    .insert({
      workspace_id: workspaceId,
      name: "System Playground Key",
      key_prefix: keyPrefix,
      secret_hash: secretHash,
      environment: "System",
      monthly_budget: 0,
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();

  if (keyError || !apiKeyRow?.id) {
    throw new Error(keyError?.message ?? "Failed to create playground api key");
  }

  const encryptedSecret = encryptSecret(secret);
  const { error: upsertPlaygroundKeyError } = await supabaseAdmin
    .from("workspace_playground_keys")
    .upsert(
      {
        workspace_id: workspaceId,
        api_key_id: apiKeyRow.id,
        encrypted_secret: encryptedSecret,
        created_by: userId,
      },
      { onConflict: "workspace_id" }
    );

  if (upsertPlaygroundKeyError) {
    throw new Error(upsertPlaygroundKeyError.message);
  }

  if (replacedApiKeyId) {
    await supabaseAdmin
      .from("api_keys")
      .delete()
      .eq("id", replacedApiKeyId)
      .eq("workspace_id", workspaceId)
      .eq("name", "System Playground Key")
      .eq("environment", "System");
  }

  return { secret, apiKeyId: apiKeyRow.id as string };
}

export async function getAuthedWorkspaceForPlayground() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    throw new Error("No workspace found");
  }

  return {
    userId: user.id,
    workspaceId: membership.workspace_id,
  };
}

export async function getOrCreateWorkspacePlaygroundKey(workspaceId: string, userId: string) {
  const supabaseAdmin = createAdminClient();
  const { data: stored, error: storedError } = await supabaseAdmin
    .from("workspace_playground_keys")
    .select("encrypted_secret, api_key_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (storedError) {
    throw new Error(storedError.message);
  }

  if (stored?.encrypted_secret) {
    const { data: apiKeyRow } = stored.api_key_id
      ? await supabaseAdmin
          .from("api_keys")
          .select("id, status, name, environment")
          .eq("id", stored.api_key_id)
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : { data: null };

    if (!apiKeyRow || apiKeyRow.status !== "active") {
      return createWorkspacePlaygroundKey(workspaceId, userId, stored.api_key_id as string | null);
    }

    if (apiKeyRow.name !== "System Playground Key" || apiKeyRow.environment !== "System") {
      await supabaseAdmin
        .from("api_keys")
        .update({
          name: "System Playground Key",
          environment: "System",
        })
        .eq("id", stored.api_key_id)
        .eq("workspace_id", workspaceId);
    }

    try {
      return {
        secret: decryptSecret(stored.encrypted_secret),
        apiKeyId: stored.api_key_id as string,
      };
    } catch {
      return createWorkspacePlaygroundKey(workspaceId, userId, stored.api_key_id as string | null);
    }
  }

  return createWorkspacePlaygroundKey(workspaceId, userId);
}
