import { PageHero } from "@/components/marketing/page-primitives";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";

export const metadata = {
  title: "API Docs — OpenOctopus",
  description:
    "Public API documentation for authenticating, listing models, and submitting OpenOctopus generation requests.",
};

export default function DocsPage() {
  return (
    <>
      <PageHero
        eyebrow="API Documentation"
        title="Build against the OpenOctopus API"
        description="Unified image and video API docs. This page uses the same source as the dashboard API Calling Doc, so updates stay in sync automatically."
        primaryAction={{ href: "/login", label: "Get API Key" }}
        secondaryAction={{ href: "/pricing", label: "View pricing" }}
      />

      <div className="px-6 pb-14 md:px-8 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <ApiQuickstartCard />
        </div>
      </div>
    </>
  );
}
