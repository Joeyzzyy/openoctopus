import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { communityLinks } from "@/lib/data";

export function CommunityLinks() {
  return (
    <>
      <section className="border-t border-black/10 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <FadeIn>
            <h2 className="mb-4 text-2xl font-bold text-[#111111] md:text-3xl">
              Join the community
            </h2>
            <p className="mb-8 text-black/55">
              Follow our progress, share what you create, and help shape the
              future of AI generation.
            </p>
          </FadeIn>

          <div className="flex flex-wrap justify-center gap-4">
            {communityLinks.map((link, i) => (
              <FadeIn key={link.label} delay={i * 0.1}>
                <Link
                  href={link.href}
                  target={link.href.startsWith("http") ? "_blank" : undefined}
                  rel={link.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-5 py-2.5 text-sm text-black/55 transition-colors hover:border-black/20 hover:text-[#111111]"
                >
                  {link.label}
                </Link>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-black/10 py-12">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <p className="text-sm text-black/55">
            <Link
              href="mailto:support@openoctopus.ai"
              className="text-black/60 transition-colors hover:text-[#111111]"
            >
              support@openoctopus.ai
            </Link>{" "}
            ·{" "}
            <Link
              href="https://status.wavespeed.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-black/60 transition-colors hover:text-[#111111]"
            >
              System Status
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
