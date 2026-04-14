import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { aboutPersonas } from "@/lib/data";

const personaLinks = {
  Developers: { href: "https://openoctopus.ai/docs", label: "Read the docs →", external: true },
  Creators: { href: "/models", label: "Try the generators →", external: false },
  Enterprises: { href: "/enterprise", label: "Contact sales →", external: false },
} as const;

export function BuiltForEveryone() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
        <FadeIn>
          <h2 className="mb-12 text-center text-2xl font-bold text-[#1C1917] md:text-3xl">
            Built for everyone
          </h2>
        </FadeIn>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {aboutPersonas.map((persona, i) => {
            const link = personaLinks[persona.title as keyof typeof personaLinks];

            return (
              <FadeIn key={persona.title} delay={i * 0.1}>
                <div className="flex h-full flex-col rounded-xl border border-black/10 bg-white p-6">
                  <h3 className="mb-3 text-xl font-semibold text-[#1C1917]">
                    {persona.title}
                  </h3>
                  <p className="flex-1 text-sm leading-relaxed text-black/55">
                    {persona.description}
                  </p>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="mt-4 text-sm font-medium text-[#1C1917] transition-colors hover:underline"
                  >
                    {link.label}
                  </Link>
                </div>
              </FadeIn>
            );
          })}
        </div>
    </section>
  );
}
