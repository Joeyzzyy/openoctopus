import { PricingHero } from "@/components/pricing/PricingHero";
import {
  ImageVideoTable,
  LanguageModelTable,
  ServerlessGpuTable,
} from "@/components/pricing/PricingTable";
import { EnterpriseUpsell } from "@/components/pricing/EnterpriseUpsell";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { CTASection } from "@/components/landing/CTASection";
import {
  imageVideoPricing,
  languageModelPricing,
  serverlessGpuPricing,
} from "@/lib/data";

export const metadata = {
  title: "Pricing — OpenOctopus",
  description:
    "Simple, transparent pay-as-you-go pricing for AI image, video, language model, and GPU inference.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <ImageVideoTable rows={imageVideoPricing} />
      <LanguageModelTable rows={languageModelPricing} />
      <ServerlessGpuTable rows={serverlessGpuPricing} />
      <EnterpriseUpsell />
      <PricingFAQ />
      <CTASection />
    </>
  );
}
