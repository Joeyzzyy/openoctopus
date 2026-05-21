import Link from "next/link";
import { EmailPasswordSignInForm } from "@/components/auth/EmailPasswordSignInForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { Logo } from "@/components/layout/Logo";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSafeNextPath(value: string | string[] | undefined) {
  const next = Array.isArray(value) ? value[0] : value;
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const resolvedSearchParams = await searchParams;
  const nextPath = getSafeNextPath(resolvedSearchParams.next);

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F8FCFF] px-4 py-10">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(186,230,253,0.78), transparent 28%), radial-gradient(circle at 80% 16%, rgba(125,211,252,0.34), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,252,255,1) 48%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[420px] opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(7,89,133,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(7,89,133,0.045) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        }}
      />
      <div className="relative mx-auto w-full max-w-md">
        <section className="rounded-[28px] border border-[#BAE6FD]/80 bg-white/94 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center">
            <Logo className="mb-2 scale-[1.28] text-[#0F172A] sm:scale-[1.4]" />
          </div>

          <div className="space-y-4">
            <EmailPasswordSignInForm nextPath={nextPath} />

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-black/[0.08]" />
              <span className="text-[11px] tracking-[0.06em] text-[#64748B]">Sign in Or Sign up with Google</span>
              <div className="h-px flex-1 bg-black/[0.08]" />
            </div>

            <GoogleSignInButton nextPath={nextPath} />

            <p className="text-center text-xs leading-5 text-[#64748B]">
              <span className="block">By signing in, you agree to our</span>
              <Link
                href="/static/terms"
                className="text-[#0F172A] underline decoration-[#7DD3FC] underline-offset-4 transition-colors hover:text-[#0284C7]"
              >
                Terms of Service
              </Link>{" "}
              <span className="text-[#64748B]">and</span>{" "}
              <Link
                href="/static/privacy"
                className="text-[#0F172A] underline decoration-[#7DD3FC] underline-offset-4 transition-colors hover:text-[#0284C7]"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 border-t border-black/[0.06] pt-4 text-center">
            <Link
              href="/"
              className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
            >
              Back to home
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
