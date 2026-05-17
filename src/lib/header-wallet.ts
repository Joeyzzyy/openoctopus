import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function loadHeaderWalletBalanceLabel(userId: string) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (!membership?.workspace_id) {
    return null;
  }

  const [{ data: workspaceRow }, { data: walletRows }] = await Promise.all([
    supabase.from("workspaces").select("currency").eq("id", membership.workspace_id).maybeSingle(),
    supabaseAdmin.from("wallet_transactions").select("amount_delta").eq("workspace_id", membership.workspace_id),
  ]);

  const currency =
    typeof workspaceRow?.currency === "string" && workspaceRow.currency.trim().length > 0
      ? workspaceRow.currency
      : "USD";
  const balance = (walletRows ?? []).reduce((sum, row) => sum + Number(row.amount_delta ?? 0), 0);

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}
