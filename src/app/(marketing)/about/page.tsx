import Script from "next/script";
import { PageHero, PageSection, SurfaceCard } from "@/components/marketing/page-primitives";
import { aboutMetrics, aboutPersonas, aboutValues, communityLinks, trustedByCompanies, whatWeDo } from "@/lib/data";

export const metadata = {
  title: "About — OpenOctopus",
  description:
    "Learn about OpenOctopus, the unified AI media generation platform with blazing fast inference.",
};

export default function AboutPage() {
  return (
    <>
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

      <PageHero
        eyebrow="About"
        title="A calmer interface for fast-moving model infrastructure"
        description="OpenOctopus brings model access, routing, and spend visibility into one surface so developers, creators, and teams can ship without context switching."
        primaryAction={{ href: "/login", label: "Get API Key" }}
        secondaryAction={{ href: "/docs", label: "Read docs" }}
        stats={aboutMetrics.map((metric) => ({ label: metric.label, value: metric.value }))}
      />

      <PageSection
        title="What we do"
        description="The product should feel coherent across routes, so the about page now uses the same card, type, and spacing system as the homepage."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {whatWeDo.map((item) => (
            <SurfaceCard key={item.title} className="p-6">
              <h3 className="text-[20px] font-semibold text-[#111827]">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{item.description}</p>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Who it is for"
        description="A single product surface can still serve different audiences when the primitives stay disciplined."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {aboutPersonas.map((persona) => (
            <SurfaceCard key={persona.title} className="p-6">
              <h3 className="text-[22px] font-semibold tracking-[-0.045em] text-[#111827]">{persona.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{persona.description}</p>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="What drives us"
        description="These values are now presented in the same restrained visual system as the rest of the marketing site."
      >
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {aboutValues.map((value) => (
            <SurfaceCard key={value.title} className="p-6">
              <h3 className="text-[20px] font-semibold text-[#111827]">{value.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{value.description}</p>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Trusted by"
        description="Representative teams already building with the platform."
      >
        <SurfaceCard className="p-6 md:p-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustedByCompanies.map((company) => (
              <div key={company} className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-4 text-center text-[15px] font-medium text-[#111827]">
                {company}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </PageSection>

      <PageSection
        title="Community"
        description="Follow the project in the places where releases, docs, and collaboration already happen."
      >
        <div className="grid gap-6 md:grid-cols-4">
          {communityLinks.map((item) => (
            <SurfaceCard key={item.label} className="p-6">
              <h3 className="text-[18px] font-semibold text-[#111827]">{item.label}</h3>
              <a
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex text-[15px] text-[#6B7280] underline decoration-black/15 underline-offset-4 hover:text-[#111827]"
              >
                Visit link
              </a>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>
    </>
  );
}
