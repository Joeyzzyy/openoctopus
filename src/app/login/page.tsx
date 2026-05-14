import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { EmailPasswordSignInForm } from "@/components/auth/EmailPasswordSignInForm";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FCFCFA] px-4">
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top, rgba(243, 226, 201, 0.56), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.84) 0%, rgba(252,252,250,1) 46%)",
        }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[360px] opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(17,24,39,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.035) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
        }}
      />
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div className="relative rounded-2xl border border-black/[0.08] bg-white shadow-[0_18px_48px_rgba(17,24,39,0.06)]">
          <div className="min-h-80 p-10 md:p-12">
            <div className="mb-8 space-y-3 text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.05em] text-[#111827]">
                Welcome
              </h1>
              <p className="text-sm text-[#6B7280]">
                Sign in to continue to the dashboard
              </p>
            </div>

            <div className="space-y-5">
              <EmailPasswordSignInForm />
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-black/[0.08]" />
                <span className="text-[11px] uppercase tracking-[0.8px] text-black/40">or</span>
                <div className="h-px flex-1 bg-black/[0.08]" />
              </div>
              <GoogleSignInButton />
            </div>

            <p className="mt-8 text-center text-xs leading-5 text-[#6B7280]">
              By signing in, you agree to our{" "}
              <Link
                href="/static/terms"
                className="text-[#111827] underline decoration-black/20 underline-offset-4 transition-colors hover:text-[#111827]"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/static/privacy"
                className="text-[#111827] underline decoration-black/20 underline-offset-4 transition-colors hover:text-[#111827]"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="text-sm text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
