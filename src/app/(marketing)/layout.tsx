import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { loadHeaderWalletBalanceLabel } from "@/lib/header-wallet";
import { createClient } from "@/lib/supabase/server";

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
