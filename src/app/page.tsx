import { Banner } from "@/components/layout/Banner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { HeroSlideshow } from "@/components/hero/HeroSlideshow";
import { FeaturedModels } from "@/components/models/FeaturedModels";
import { FeaturesSection } from "@/components/features/FeaturesSection";
import { ToolsShowcase } from "@/components/landing/ToolsShowcase";
import { ForCreators } from "@/components/creators/ForCreators";
import { TechFeatures } from "@/components/landing/TechFeatures";
import { UserVoices } from "@/components/voices/UserVoices";
import { CTASection } from "@/components/landing/CTASection";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF8] text-[#1C1917]" style={{ paddingTop: "var(--banner-h, 36px)" }}>
      <Banner />
      <Header isLoggedIn={!!user} />

      <main className="flex-1">
        <HeroSlideshow />
        <FeaturedModels />
        <ToolsShowcase />
        <FeaturesSection />
        <ForCreators />
        <TechFeatures />
        <UserVoices />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
