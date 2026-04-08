import { Library, Zap, Server, Shield } from "lucide-react";
import { techFeatures } from "@/lib/data";

const iconMap: Record<string, React.ElementType> = {
  Library,
  Zap,
  Server,
  Shield,
};

export function TechFeatures() {
  return (
    <section className="bg-white/50 py-20 border-t border-slate-200/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Engineered for Velocity</h2>
          <p className="mt-2 text-slate-500">
            Infrastructure designed for speed, reliability, and scale
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {techFeatures.map((feature) => {
            const Icon = iconMap[feature.icon] || Zap;
            return (
              <div
                key={feature.title}
                className="group rounded-xl border border-slate-200/60 bg-white/70 p-6 hover:bg-white/90 hover:border-sky-500/40 transition-all backdrop-blur-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-600 group-hover:bg-sky-200 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
