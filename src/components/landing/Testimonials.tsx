import { testimonials } from "@/lib/data";

export function Testimonials() {
  return (
    <section className="bg-white/50 py-20 border-t border-slate-200/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">What people are saying</h2>
          <p className="mt-2 text-slate-500">
            Trusted by teams building the future of AI content
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="rounded-xl border border-slate-200/60 bg-white/70 p-6 hover:bg-white/90 transition-colors backdrop-blur-sm"
            >
              <p className="text-sm text-slate-600 leading-relaxed mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-violet-500 text-white text-sm font-semibold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  <p className="text-xs text-slate-500">{t.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
