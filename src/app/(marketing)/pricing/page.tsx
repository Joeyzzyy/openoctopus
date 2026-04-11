import { PricingHero } from "@/components/pricing/PricingHero";
import { ImageVideoTable } from "@/components/pricing/PricingTable";
import { EnterpriseUpsell } from "@/components/pricing/EnterpriseUpsell";
import { PricingFAQ } from "@/components/pricing/PricingFAQ";
import { CTASection } from "@/components/landing/CTASection";

export const metadata = {
  title: "Pricing — OpenOctopus",
  description:
    "Simple, transparent pay-as-you-go pricing for OpenOctopus image generation.",
};

export default function PricingPage() {
  return (
    <>
      <PricingHero />
      <ImageVideoTable />
      <EnterpriseUpsell />
      <PricingFAQ />
      <CTASection />
    </>
  );
}
