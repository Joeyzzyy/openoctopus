import Script from "next/script";
import { AboutHero } from "@/components/about/AboutHero";
import { MetricsRow } from "@/components/about/MetricsRow";
import { WhatWeDo } from "@/components/about/WhatWeDo";
import { BuiltForEveryone } from "@/components/about/BuiltForEveryone";
import { WhatDrivesUs } from "@/components/about/WhatDrivesUs";
import { TrustedBy } from "@/components/about/TrustedBy";
import { CommunityLinks } from "@/components/about/CommunityLinks";

export const metadata = {
  title: "About — OpenOctopus",
  description:
    "Learn about OpenOctopus, the unified AI media generation platform with blazing fast inference.",
};

export default function AboutPage() {
  return (
    <div className="flex-1 bg-white">
      <Script
        id="about-ld+json"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "OpenOctopus",
            legalName: "OpenOctopus PTE.LTD.",
            url: "https://openoctopus.ai",
            logo: "https://openoctopus.ai/logo.webp",
            description:
              "The ultimate AI media generation platform with 1000+ models and sub-second inference.",
            sameAs: [
              "https://x.com/openoctopus",
              "https://github.com/OpenOctopus",
              "https://discord.com/invite/7WQTe7jMmY",
            ],
          }),
        }}
      />
      <AboutHero />
      <MetricsRow />
      <WhatWeDo />
      <BuiltForEveryone />
      <WhatDrivesUs />
      <TrustedBy />
      <CommunityLinks />
    </div>
  );
}
