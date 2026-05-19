import { ProductTopTabs } from "@/components/marketing/product-top-tabs";

function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-black/[0.06] ${className}`} />;
}

function SkeletonChip({ className }: { className?: string }) {
  return <div className={`h-7 animate-pulse rounded-full bg-black/[0.06] ${className ?? "w-24"}`} />;
}

export default function Loading() {
  return (
    <main className="relative mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-5 xl:px-0">
      <ProductTopTabs />
      <div className="mb-2 space-y-3 sm:space-y-4">
        <section className="rounded-xl border border-[#BAE6FD] bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5">
          <SkeletonBlock className="h-3 w-28" />
          <SkeletonBlock className="mt-3 h-10 w-full max-w-3xl" />
          <SkeletonBlock className="mt-3 h-5 w-full max-w-4xl" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            <SkeletonChip />
            <SkeletonChip className="w-28" />
            <SkeletonChip className="w-48" />
          </div>
        </section>

        <section className="min-w-0 max-w-full rounded-xl border border-black/[0.08] bg-white p-2 shadow-sm sm:rounded-2xl sm:p-3">
          <div className="mb-3 rounded-lg border border-black/[0.08] bg-[#F6F8FB] p-1">
            <div className="grid grid-cols-2 gap-1">
              <SkeletonBlock className="h-10 rounded-md" />
              <SkeletonBlock className="h-10 rounded-md" />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            <section className="rounded-lg border border-black/[0.08] bg-white p-3 sm:rounded-xl sm:p-4">
              <SkeletonBlock className="mb-3 h-5 w-16" />
              <div className="space-y-3">
                <div>
                  <SkeletonBlock className="mb-2 h-3 w-24" />
                  <SkeletonBlock className="h-12 w-full rounded-md" />
                </div>
                <div>
                  <SkeletonBlock className="mb-2 h-3 w-20" />
                  <SkeletonBlock className="h-32 w-full rounded-md" />
                </div>
                <div>
                  <SkeletonBlock className="mb-2 h-3 w-28" />
                  <SkeletonBlock className="h-24 w-full rounded-md" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SkeletonBlock className="h-12 w-full rounded-md" />
                  <SkeletonBlock className="h-12 w-full rounded-md" />
                </div>
                <SkeletonBlock className="h-11 w-full rounded-md" />
              </div>
            </section>

            <section className="rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-3 sm:rounded-xl sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <SkeletonBlock className="h-5 w-20" />
                <SkeletonBlock className="h-8 w-28 rounded-md" />
              </div>
              <SkeletonBlock className="mt-3 aspect-square w-full rounded-xl sm:aspect-[4/3]" />
              <div className="mt-3 grid grid-cols-3 gap-2">
                <SkeletonBlock className="h-16 rounded-lg" />
                <SkeletonBlock className="h-16 rounded-lg" />
                <SkeletonBlock className="h-16 rounded-lg" />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
