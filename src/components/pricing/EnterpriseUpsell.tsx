import Link from "next/link";
import {
  ArrowRight,
  Gauge,
  Headphones,
  Scale,
  Sparkles,
  UserCheck,
  Wallet,
} from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";

const ENTERPRISE_FEATURES = [
  {
    title: "Dedicated account manager",
    description:
      "Get personalized support from a dedicated team member who understands your needs.",
    icon: UserCheck,
  },
  {
    title: "Priority support",
    description:
      "Fast-track your requests with priority access to our engineering team.",
    icon: Headphones,
  },
  {
    title: "Higher GPU limits",
    description:
      "Scale without constraints with increased GPU allocation and concurrent processing.",
    icon: Gauge,
  },
  {
    title: "Performance SLAs",
    description:
      "Guaranteed uptime and performance with enterprise-grade service level agreements.",
    icon: Scale,
  },
  {
    title: "Custom model deployment",
    description:
      "Expert guidance to help you deploy custom models and optimize performance.",
    icon: Sparkles,
  },
  {
    title: "Volume discounts",
    description:
      "We've got volume discounts for large amounts of spend. Contact us to learn more.",
    icon: Wallet,
  },
];

export function EnterpriseUpsell() {
  return (
    <section className="bg-[#F8FCFF] px-6 py-20 md:px-12 md:py-28 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-12 flex max-w-xl flex-col gap-4">
          <h2 className="font-display text-2xl font-bold leading-none tracking-tight text-[#1C1917] md:text-4xl">
            Need more? Talk to us.
          </h2>
          <p className="text-sm text-black/60 md:text-base">
            For teams that need higher limits, dedicated support, and custom
            deployment options.
          </p>
          <Link
            href="/enterprise"
            className="mt-2 inline-flex w-fit items-center gap-2.5 rounded-lg bg-[#1C1917] px-6 py-3 text-white transition-colors duration-150 hover:bg-[#1C1917]/80"
          >
            <span className="text-sm font-bold uppercase leading-4 tracking-[1.2px]">
              Contact Sales
            </span>
            <ArrowRight className="size-4" />
          </Link>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTERPRISE_FEATURES.map((feature, i) => {
            const Icon = feature.icon;

            return (
              <FadeIn
                key={feature.title}
                delay={i * 0.05}
                className="flex flex-col gap-4 rounded-lg bg-[#f5f5f3] p-6"
              >
                <Icon
                  className="size-6 text-black/40"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-medium text-[#1C1917]">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-black/60">
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
