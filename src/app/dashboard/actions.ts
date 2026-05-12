"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";
import crypto from "crypto";
import Stripe from "stripe";

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

  if (!membership?.workspace_id) {
    throw new Error("Unable to create API keys for this account right now.");
  }

  const canWrite = ["owner", "admin", "billing"].includes(membership.role);
  if (!canWrite) throw new Error("Insufficient permissions");

  return { supabase, userId: user.id, workspaceId: membership.workspace_id };
}

type ActionResult = {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
};

function buildDashboardAlertHref(input: {
  message: string;
  level: "success" | "warning" | "error" | "info";
}) {
  return `/dashboard?view=dashboard&alert=${encodeURIComponent(input.message)}&alertLevel=${input.level}`;
}

function resolveAppBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://openoctopus.com";
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

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

const createTopUpCheckoutSchema = z.object({
  amountUsd: z.coerce.number().int().min(1).max(10_000),
});

export async function createTopUpCheckoutSession(formData: FormData) {
  try {
    const parsed = createTopUpCheckoutSchema.safeParse({
      amountUsd: formData.get("amountUsd"),
    });

    if (!parsed.success) {
      redirect(
        buildDashboardAlertHref({
          message: parsed.error.issues[0]?.message ?? "Invalid top-up amount",
          level: "error",
        })
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      redirect(
        buildDashboardAlertHref({
          message: "Stripe is not configured yet. Missing STRIPE_SECRET_KEY.",
          level: "warning",
        })
      );
    }

    const amountUsd = parsed.data.amountUsd;
    const amountCents = Math.round(amountUsd * 100);
    const { userId, workspaceId } = await getAuthedWorkspace();
    const stripe = new Stripe(stripeSecretKey ?? "sk_test_placeholder");
    const baseUrl = resolveAppBaseUrl();
    const topupPriceId = process.env.STRIPE_TOPUP_PRICE_ID?.trim();
    const topupProductId = process.env.STRIPE_TOPUP_PRODUCT_ID?.trim();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/dashboard?view=dashboard&refreshWallet=1&celebrateTopup=1&topupAmount=${encodeURIComponent(amountUsd.toFixed(2))}&alert=${encodeURIComponent("Top-up successful. Your balance is updating now.")}&alertLevel=success`,
      cancel_url: `${baseUrl}/dashboard?view=dashboard&alert=${encodeURIComponent("Top-up failed. Please try again.")}&alertLevel=error&alertDurationMs=10000`,
      line_items: topupPriceId
        ? [
            {
              price: topupPriceId,
              quantity: amountUsd,
            },
          ]
        : [
            {
              quantity: 1,
              price_data: {
                currency: "usd",
                unit_amount: amountCents,
                product_data: {
                  name: "OpenOctopus Wallet Top-up",
                  description: `Wallet recharge: $${amountUsd.toFixed(2)}`,
                },
              },
            },
          ],
      metadata: {
        workspaceId,
        userId,
        amountUsd: amountUsd.toFixed(2),
        topupMode: topupPriceId ? "fixed_price_quantity" : "dynamic_price_data",
        topupProductId: topupProductId ?? "",
      },
      allow_promotion_codes: false,
      invoice_creation: {
        enabled: true,
      },
    });

    if (!session.url) {
      redirect(
        buildDashboardAlertHref({
          message: "Stripe checkout session created without redirect URL.",
          level: "error",
        })
      );
    }

    redirect(session.url);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(
      buildDashboardAlertHref({
        message: error instanceof Error ? error.message : "Failed to start top-up checkout.",
        level: "error",
      })
    );
  }
}
