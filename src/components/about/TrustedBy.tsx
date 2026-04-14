import { FadeIn } from "@/components/animations/FadeIn";
import { trustedByCompanies } from "@/lib/data";

export function TrustedBy() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <FadeIn>
          <h2 className="mb-4 text-2xl font-bold text-[#1C1917] md:text-3xl">
            Trusted by innovators
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-black/55">
            From indie creators to enterprise teams, thousands of users rely on
            OpenOctopus every day.
          </p>
        </FadeIn>

        <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-sm text-black/45">
          {trustedByCompanies.map((company, i) => (
            <FadeIn key={company} delay={i * 0.06}>
              <span className="transition-colors hover:text-[#1C1917]">{company}</span>
            </FadeIn>
          ))}
        </div>
    </section>
  );
}
