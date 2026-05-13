import { PageHero } from "@/components/marketing/page-primitives";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";
import { createClient } from "@/lib/supabase/server";
import { unstable_noStore as noStore } from "next/cache";

export const metadata = {
  title: "API Docs — OpenOctopus",
  description:
    "Public API documentation for authenticating, listing models, and submitting OpenOctopus generation requests.",
};

export default async function DocsPage() {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const destination = user ? "/dashboard" : "/login";
  const destinationLabel = user ? "Dashboard" : "Get API Key";

  return (
    <>
      <PageHero
        eyebrow="API Documentation"
        title="Build against the OpenOctopus API"
        description="Unified image and video API docs. This page uses the same source as the dashboard API Calling Doc, so updates stay in sync automatically."
        primaryAction={{ href: destination, label: destinationLabel }}
        secondaryAction={{ href: "/models", label: "View models" }}
      />

      <div className="px-6 pb-14 md:px-8 md:pb-20">
        <div className="mx-auto max-w-6xl">
          <ApiQuickstartCard />
        </div>
      </div>
    </>
  );
}
