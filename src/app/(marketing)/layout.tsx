import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
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

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFCFA] text-[#111827]">
      <MarketingHeader isLoggedIn={!!user} userLabel={user?.email ?? user?.user_metadata?.name ?? null} />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
