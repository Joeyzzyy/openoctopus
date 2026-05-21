import Link from "next/link";
import { AuthInlineAlert } from "@/components/auth/auth-inline-alert";
import { Logo } from "@/components/layout/Logo";
import { getFriendlyAuthError } from "@/lib/auth-error";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;
  const friendly = getFriendlyAuthError(message);

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
      <div className="relative w-full max-w-xl rounded-[32px] border border-[#BAE6FD]/80 bg-white/94 p-8 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div
            className="animate-auth-logo-float mb-5 flex size-24 items-center justify-center rounded-[28px] border border-[#BAE6FD] bg-[linear-gradient(160deg,rgba(255,255,255,0.96),rgba(224,242,254,0.92))] shadow-[0_18px_50px_rgba(14,165,233,0.14)]"
          >
            <Logo className="scale-95 flex-col gap-2 text-[#0F172A]" />
          </div>
          <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#0284C7]">
            Authentication
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#0F172A]">
            Google sign-in needs another pass
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#0F172A]/60">
            The sign-in flow did not finish cleanly. Review the message below, then retry from the Gmail entry point.
          </p>
        </div>

        <div className="mt-6">
          <AuthInlineAlert title={friendly.title} message={friendly.message} />
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#0F172A] bg-[#0F172A] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#020617]"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
