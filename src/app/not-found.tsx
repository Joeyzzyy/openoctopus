import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06131F] px-6 py-16 text-[#E0F2FE]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,#06131F_0%,#0B2545_48%,#075985_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.26),transparent_42rem),linear-gradient(135deg,rgba(14,165,233,0.14),rgba(3,105,161,0.08)_44%,transparent_72%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.24] [background-image:linear-gradient(rgba(186,230,253,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(186,230,253,0.12)_1px,transparent_1px)] [background-size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_0%,rgba(0,0,0,0.48)_48%,transparent_76%)]"
      />

      <section className="relative z-10 w-full max-w-xl overflow-hidden rounded-[28px] border border-[#7DD3FC]/45 bg-[#F8FCFF]/94 p-8 text-center shadow-[0_34px_110px_rgba(2,132,199,0.22)] backdrop-blur-md sm:p-10">
        <div className="flex justify-center">
          <Logo className="text-[#082F49]" />
        </div>
        <p className="mt-8 font-serif text-7xl font-bold italic text-[#0284C7] sm:text-8xl">
          404
        </p>
        <h1 className="mt-4 text-3xl font-bold text-[#082F49] sm:text-4xl">
          This page drifted away.
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#475569] sm:text-base">
          The page you are looking for does not exist, or the link may have changed. Head back home to keep exploring OpenOctopus.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#082F49] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0C4A6E] sm:w-auto"
          >
            <Home className="size-4" />
            Back to Home
          </Link>
          <Link
            href="/models"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/[0.12] bg-white px-5 text-sm font-semibold text-[#082F49] transition-colors hover:bg-black/[0.03] sm:w-auto"
          >
            Explore Models
            <ArrowLeft className="size-4 rotate-180" />
          </Link>
        </div>
      </section>
    </main>
  );
}
