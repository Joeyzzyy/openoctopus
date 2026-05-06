import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { message } = await searchParams;

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
      <div className="relative w-full max-w-lg rounded-[24px] border border-black/[0.08] bg-white p-8 text-center shadow-[0_24px_60px_rgba(17,24,39,0.08)]">
        <p className="text-[10px] uppercase tracking-[1px] text-black/45">
          Authentication Error
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111111]">
          Sign-in could not be completed.
        </h1>
        <p className="mt-4 text-sm leading-6 text-black/55">
          {message ??
            "Check your Supabase Auth provider setup and redirect URL allow list, then try again."}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-[#111111] px-4 text-[13px] font-medium text-white"
        >
          Back To Login
        </Link>
      </div>
    </main>
  );
}
