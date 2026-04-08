import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f2ed] px-4">
      <div className="w-full max-w-lg rounded-[28px] border border-black/8 bg-white p-8 text-center shadow-[0_24px_60px_rgba(0,0,0,0.06)]">
        <p className="font-mono text-[10px] uppercase tracking-[1px] text-black/45">
          Authentication Error
        </p>
        <h1 className="mt-3 font-mono text-3xl font-bold tracking-[-0.04em] text-[#111111]">
          Sign-in could not be completed.
        </h1>
        <p className="mt-4 text-sm leading-6 text-black/55">
          {message ??
            "Check your Supabase Auth provider setup and redirect URL allow list, then try again."}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-[14px] bg-[#111111] px-4 font-mono text-[11px] font-semibold uppercase tracking-[1px] text-white"
        >
          Back To Login
        </Link>
      </div>
    </main>
  );
}
