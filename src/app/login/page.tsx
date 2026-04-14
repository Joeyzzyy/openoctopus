import Link from "next/link";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-4">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <div className="rounded-lg border border-black/10 bg-white shadow-none">
          <div className="min-h-80 p-10 md:p-12">
            <div className="mb-8 space-y-3 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1C1917]">
                Welcome
              </h1>
              <p className="text-sm text-[#1C1917]/60">
                Sign in to continue to the dashboard
              </p>
            </div>

            <div className="space-y-4">
              <GoogleSignInButton />
            </div>

            <p className="mt-8 text-center text-xs leading-5 text-[#1C1917]/50">
              By signing in, you agree to our{" "}
              <Link
                href="/static/terms"
                className="text-[#1C1917]/70 underline underline-offset-2 transition-colors hover:text-[#1C1917]"
              >
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link
                href="/static/privacy"
                className="text-[#1C1917]/70 underline underline-offset-2 transition-colors hover:text-[#1C1917]"
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
            className="text-sm text-[#1C1917]/60 transition-colors hover:text-[#1C1917]"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
