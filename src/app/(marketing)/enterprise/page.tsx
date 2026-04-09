import { EnterpriseHero } from "@/components/enterprise/EnterpriseHero";
import { CapabilityCards } from "@/components/enterprise/CapabilityCards";
import { BenefitsGrid } from "@/components/enterprise/BenefitsGrid";
import { ContactForm } from "@/components/enterprise/ContactForm";

export const metadata = {
  title: "Enterprise — OpenOctopus",
  description:
    "Enterprise AI infrastructure with dedicated GPUs, priority support, and custom SLAs.",
};

export default function EnterprisePage() {
  return (
    <>
      <EnterpriseHero />
      <CapabilityCards />
      <BenefitsGrid />
      <ContactForm />
    </>
  );
}
