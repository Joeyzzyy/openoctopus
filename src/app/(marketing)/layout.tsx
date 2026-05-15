import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function loadHeaderWalletBalanceLabel(userId: string) {
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

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const walletBalanceLabel = user ? await loadHeaderWalletBalanceLabel(user.id) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFCFA] text-[#111827]">
      <MarketingHeader
        isLoggedIn={!!user}
        userLabel={user?.email ?? user?.user_metadata?.name ?? null}
        userAvatarUrl={
          (user?.user_metadata?.avatar_url as string | undefined) ??
          (user?.user_metadata?.picture as string | undefined) ??
          null
        }
        walletBalanceLabel={walletBalanceLabel}
      />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
