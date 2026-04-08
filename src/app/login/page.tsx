import Link from "next/link";
import { ArrowRight, ShieldCheck, Wallet } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f3f2ed] px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1400px] gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-black/8 bg-[linear-gradient(180deg,#ffffff,#f6f4ee)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.06)] md:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3 py-1 font-mono text-[10px] uppercase tracking-[1px] text-black/45">
            <ShieldCheck className="h-3.5 w-3.5" />
            OpenOctopus Control
          </div>
          <h1 className="mt-4 max-w-3xl font-mono text-[38px] leading-[0.94] font-bold tracking-[-0.05em] text-[#111111] md:text-[56px]">
            Sign in to manage wallet balance, API keys, budgets, and model spend.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-black/58 md:text-[15px]">
            This dashboard uses real Supabase auth and real database queries. If
            your workspace has never been recharged, all financial and usage
            metrics will naturally remain at zero until requests are recorded.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Google OAuth",
                text: "Sign in through Supabase Auth using your configured Google provider.",
              },
              {
                title: "Workspace Bootstrap",
                text: "New users get a default workspace and membership automatically.",
              },
              {
                title: "Real Queries",
                text: "Dashboard reads actual keys, budgets, usage events, and wallet ledger rows.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[20px] border border-black/8 bg-white p-4"
              >
                <p className="font-mono text-sm font-semibold text-[#111111]">
                  {item.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-black/55">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="flex items-center">
          <div className="w-full rounded-[32px] border border-black/8 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.06)] md:p-8">
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
              Use the Google provider configured in Supabase. After sign-in,
              you will be redirected to `/dashboard`.
            </p>

            <div className="mt-6">
              <GoogleSignInButton />
            </div>

            <div className="mt-6 rounded-[20px] border border-black/8 bg-[#f7f5ef] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
                Required env vars
              </p>
              <div className="mt-3 space-y-2 font-mono text-[11px] text-black/62">
                <p>NEXT_PUBLIC_SUPABASE_URL</p>
                <p>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</p>
              </div>
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
        </section>
      </div>
    </main>
  );
}
