import Link from "next/link";
import { PageHero, PageSection, SurfaceCard } from "@/components/marketing/page-primitives";

const pricingPrinciples = [
  {
    title: "Pay as you go",
    description: "No subscriptions, no seat licenses, and no monthly minimums. You pay only for successful routed usage.",
  },
  {
    title: "Unified billing",
    description: "Image, video, and future model categories share one balance and one usage ledger across your workspace.",
  },
  {
    title: "Spend visibility",
    description: "Track usage by key, team, and workload so finance and engineering can use the same numbers.",
  },
];

const modelBands = [
  { category: "Image generation", typical: "$0.02 to $0.06 / image", notes: "Fast consumer and premium studio models" },
  { category: "Image editing", typical: "$0.03 to $0.08 / edit", notes: "Inpaint, outpaint, upscale, and transform tasks" },
  { category: "Video generation", typical: "$0.10 to $0.30 / second", notes: "Short-form text-to-video and image-to-video routes" },
];

const faq = [
  {
    question: "Do I need a subscription before I can test the API?",
    answer: "No. You can sign in, create a key, add credits only when needed, and start making requests immediately.",
  },
  {
    question: "Can one balance be shared across a team?",
    answer: "Yes. Workspace billing is shared, and you can still segment usage by key, feature, or internal cost center.",
  },
  {
    question: "How do I know what a model will cost before I call it?",
    answer: "The model catalog exposes current price information and routing metadata so you can choose the right model before sending traffic.",
  },
];

export const metadata = {
  title: "Pricing — OpenOctopus",
  description:
    "Simple, transparent pay-as-you-go pricing for OpenOctopus image generation.",
};

export default function PricingPage() {
  return (
    <>
      <PageHero
        eyebrow="Pricing"
        title="Simple pricing for routed media generation"
        description="Use one balance across image and video models, keep billing predictable, and scale from experiments to production without subscription lock-in."
        primaryAction={{ href: "/login", label: "Get API Key" }}
        secondaryAction={{ href: "/docs", label: "Read docs" }}
        stats={[
          { label: "Subscription", value: "None" },
          { label: "Billing model", value: "Usage-based" },
          { label: "Workspace credits", value: "Shared" },
          { label: "Model types", value: "Image + Video" },
        ]}
      />

      <PageSection
        title="Pricing principles"
        description="The pricing page should read like the homepage: clear cards, tight copy, and zero noise."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {pricingPrinciples.map((item) => (
            <SurfaceCard key={item.title} className="p-6">
              <h3 className="text-[22px] font-semibold tracking-[-0.045em] text-[#111827]">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{item.description}</p>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Typical public pricing"
        description="Representative price bands for common workloads. Exact model pricing is shown in the model catalog and routing surfaces."
      >
        <SurfaceCard className="overflow-hidden">
          <div className="grid grid-cols-[1.1fr_0.8fr_1fr] gap-4 border-b border-black/[0.08] px-6 py-4 text-[11px] uppercase tracking-[0.18em] text-[#9CA3AF]">
            <span>Category</span>
            <span>Typical price</span>
            <span>Notes</span>
          </div>
          {modelBands.map((band, index) => (
            <div
              key={band.category}
              className={`grid grid-cols-[1.1fr_0.8fr_1fr] gap-4 px-6 py-5 ${
                index !== modelBands.length - 1 ? "border-b border-black/[0.06]" : ""
              }`}
            >
              <p className="font-medium text-[#111827]">{band.category}</p>
              <p className="text-[#111827]">{band.typical}</p>
              <p className="text-[#6B7280]">{band.notes}</p>
            </div>
          ))}
        </SurfaceCard>
        <p className="mt-4 text-sm text-[#6B7280]">
          Need dedicated routing, private deployments, or enterprise billing terms?{" "}
          <Link href="/enterprise" className="text-[#111827] underline decoration-black/20 underline-offset-4">
            Talk to enterprise
          </Link>
          .
        </p>
      </PageSection>

      <PageSection
        title="Pricing FAQ"
        description="The same light treatment, just applied to common billing questions."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {faq.map((item) => (
            <SurfaceCard key={item.question} className="p-6">
              <h3 className="text-[18px] font-semibold text-[#111827]">{item.question}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{item.answer}</p>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>
    </>
  );
}
