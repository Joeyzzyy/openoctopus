import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-6 py-16 text-[#17110B]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(199,126,55,0.14),transparent_28rem),radial-gradient(circle_at_78%_26%,rgba(77,45,22,0.08),transparent_26rem),linear-gradient(180deg,#ffffff_0%,#fdfaf5_56%,#ffffff_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(78,52,31,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(78,52,31,0.035)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_0%,rgba(0,0,0,0.46)_48%,transparent_76%)]"
      />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[32px] border border-[#D9C8AE]/70 bg-white/90 p-8 text-center shadow-[0_34px_110px_rgba(77,45,22,0.14)] backdrop-blur-md sm:p-10">
        <div className="flex justify-center">
          <Logo className="text-[#17110B]" />
        </div>
        <p className="mt-8 font-serif text-7xl font-bold italic tracking-[-0.06em] text-[#C27B3B] sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-[-0.035em] text-[#17110B] sm:text-4xl">
          This page drifted away.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#5F564C] sm:text-base">
          The page you are looking for does not exist, or the link may have changed. Head back home to keep exploring OpenOctopus.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#17110B] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2A1D12] sm:w-auto"
          >
            <Home className="size-4" />
            Back to Home
          </Link>
          <Link
            href="/models"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/[0.12] bg-white px-5 text-sm font-semibold text-[#17110B] transition-colors hover:bg-black/[0.03] sm:w-auto"
          >
            Explore Models
            <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  );
}
