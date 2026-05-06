import Link from "next/link";
import { PageHero, PageSection, SurfaceCard } from "@/components/marketing/page-primitives";

const capabilities = [
  {
    title: "Priority routing",
    description: "Reserve premium model paths for production workloads that cannot tolerate provider volatility.",
  },
  {
    title: "Governed workspaces",
    description: "Separate teams, budgets, and API keys while keeping reporting and controls centralized.",
  },
  {
    title: "Custom terms",
    description: "Volume billing, procurement-friendly invoicing, and support paths that match enterprise workflows.",
  },
];

const benefits = [
  "Dedicated onboarding for engineering and platform teams",
  "Model approval and policy controls for regulated workloads",
  "Usage export and audit-friendly spend visibility",
  "Shared workspace billing across teams and environments",
  "Guidance on provider failover and performance routing",
  "Direct support for launch planning and traffic scaling",
];

export const metadata = {
  title: "Enterprise — OpenOctopus",
  description:
    "Enterprise AI infrastructure with dedicated GPUs, priority support, and custom SLAs.",
};

export default function EnterprisePage() {
  return (
    <>
      <PageHero
        eyebrow="Enterprise"
        title="Enterprise routing for teams shipping at scale"
        description="Bring procurement, platform engineering, and product teams onto the same surface for model access, spend control, and production routing."
        primaryAction={{ href: "/login", label: "Get API Key" }}
        secondaryAction={{ href: "/docs", label: "Read docs" }}
        stats={[
          { label: "Workspaces", value: "Multi-team" },
          { label: "Billing", value: "Shared" },
          { label: "Policies", value: "Granular" },
          { label: "Support", value: "Priority" },
        ]}
      />

      <PageSection
        title="What enterprise teams ask for"
        description="The same clean card system as the homepage, but focused on governance and operating leverage."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {capabilities.map((item) => (
            <SurfaceCard key={item.title} className="p-6">
              <h3 className="text-[22px] font-semibold tracking-[-0.045em] text-[#111827]">{item.title}</h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">{item.description}</p>
            </SurfaceCard>
          ))}
        </div>
      </PageSection>

      <PageSection
        title="Common enterprise benefits"
        description="A practical summary of what changes when a team moves from individual usage to organizational adoption."
      >
        <SurfaceCard className="p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-4 py-4 text-[15px] text-[#111827]">
                {benefit}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </PageSection>

      <PageSection
        title="Start the conversation"
        description="If your team needs routing guidance, custom billing, or policy design, use the same light-weight entry point instead of a separate visual system."
      >
        <SurfaceCard className="p-8 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h3 className="text-[28px] font-semibold tracking-[-0.05em] text-[#111827]">
                Enterprise planning should feel as simple as the homepage.
              </h3>
              <p className="mt-3 text-[15px] leading-7 text-[#6B7280]">
                Share your expected traffic, model mix, and governance requirements. We can map a workspace setup that fits how your team already operates.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-md bg-[#111827] px-5 text-[14px] font-medium text-white transition-colors hover:bg-[#0B1220]"
              >
                Get API Key
              </Link>
              <Link
                href="/docs"
                className="inline-flex h-11 items-center justify-center rounded-md border border-black/[0.08] bg-white px-5 text-[14px] font-medium text-[#111827] shadow-sm transition-colors hover:bg-[#F9FAFB]"
              >
                Review docs
              </Link>
            </div>
          </div>
        </SurfaceCard>
      </PageSection>
    </>
  );
}
