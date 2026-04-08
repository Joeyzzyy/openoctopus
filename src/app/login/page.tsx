import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f2ed] px-4">
      <div className="w-full max-w-[420px] rounded-[32px] border border-black/8 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.06)] md:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#111111] text-white">
          <Wallet className="h-6 w-6" />
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[1px] text-black/45">
          Sign In
        </p>
        <h2 className="mt-2 font-mono text-2xl font-semibold tracking-[-0.04em] text-[#111111]">
          Access the billing dashboard
        </h2>
        <p className="mt-3 text-sm leading-6 text-black/55">
          Sign in with your Google account to manage wallet balance, API keys,
          budgets, and model spend.
        </p>

        <div className="mt-6">
          <GoogleSignInButton />
        </div>

        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-black/55 transition-colors hover:text-black"
          >
            Back to home
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
