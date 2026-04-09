import { FadeIn } from "@/components/animations/FadeIn";
import {
  Gauge,
  Headphones,
  Scale,
  Sparkles,
  UserCheck,
  Wallet,
} from "lucide-react";

const BENEFITS = [
  {
    title: "Priority support when you need it",
    description:
      "Fast-track your requests with priority access to our engineering team.",
    icon: Headphones,
  },
  {
    title: "Higher GPU limits for bigger workloads",
    description:
      "Scale without constraints with increased GPU allocation and concurrent processing.",
    icon: Gauge,
  },
  {
    title: "SLAs that meet your requirements",
    description:
      "Guaranteed uptime and performance with enterprise-grade service level agreements.",
    icon: Scale,
  },
  {
    title: "Help with custom models",
    description:
      "Expert guidance to help you deploy custom models and optimize performance.",
    icon: Sparkles,
  },
  {
    title: "Dedicated account manager",
    description:
      "Get personalized support from a dedicated team member who understands your needs.",
    icon: UserCheck,
  },
  {
    title: "Volume discounts",
    description:
      "We've got volume discounts for large amounts of spend. Contact us to learn more.",
    icon: Wallet,
  },
];

export function BenefitsGrid() {
  return (
    <section className="bg-white px-6 pt-16 md:px-12 md:pt-20 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <FadeIn className="mb-12 flex max-w-xl flex-col gap-4">
          <h2 className="text-2xl font-bold leading-none tracking-tight text-[#111111] md:text-4xl">
            There is plenty more...
          </h2>
        </FadeIn>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((benefit, i) => {
            const Icon = benefit.icon;

            return (
              <FadeIn
                key={benefit.title}
                delay={i * 0.05}
                className="flex flex-col gap-4 rounded-xs bg-[#f5f5f3] p-6"
              >
                <Icon
                  className="size-6 text-black/40"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-medium text-[#111111]">
                    {benefit.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-black/60">
                    {benefit.description}
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
