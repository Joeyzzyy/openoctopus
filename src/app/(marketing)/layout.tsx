import { Banner } from "@/components/layout/Banner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
    <div
      className="flex min-h-screen flex-col bg-[#FAFAF8] text-[#1C1917]"
      style={{ paddingTop: "var(--banner-h, 36px)" }}
    >
      <Banner />
      <Header isLoggedIn={!!user} variant="solid" />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
