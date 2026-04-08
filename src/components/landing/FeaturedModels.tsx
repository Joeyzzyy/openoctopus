import { Badge } from "@/components/ui/badge";
import { featuredModels } from "@/lib/data";

const badgeStyles: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  new: "bg-green-500/20 text-green-400 border-green-500/30",
  feature: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const taskColors: Record<string, string> = {
  "text-to-video": "bg-blue-500/15 text-blue-400",
  "text-to-image": "bg-emerald-500/15 text-emerald-400",
  "image-to-video": "bg-orange-500/15 text-orange-400",
  "audio-to-video": "bg-pink-500/15 text-pink-400",
};

export function FeaturedModels() {
  return (
    <section className="bg-white/50 py-20 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Featured Models</h2>
            <p className="mt-2 text-slate-500">Explore our most popular AI models</p>
          </div>
          <button className="text-sm text-sky-600 hover:text-sky-700 transition-colors">
            View all →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredModels.map((model) => (
            <div
              key={model.id}
              className="group rounded-xl border border-slate-200/60 bg-white/70 hover:bg-white/90 transition-all duration-200 overflow-hidden cursor-pointer hover:border-slate-300/80 backdrop-blur-sm"
            >
              {/* Image placeholder */}
              <div className="relative aspect-video bg-gradient-to-br from-slate-100 to-slate-200">
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                  Preview
                </div>
                {model.badge && (
                  <Badge
                    variant="outline"
                    className={`absolute top-2 left-2 text-xs ${badgeStyles[model.badge] || ""}`}
                  >
                    {model.badge}
                  </Badge>
                )}
                {model.discount && (
                  <Badge className="absolute top-2 right-2 bg-sky-600 text-white text-xs border-0">
                    {model.discount}
                  </Badge>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 truncate group-hover:text-sky-600 transition-colors">
                      {model.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{model.provider}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${taskColors[model.task] || "bg-gray-500/15 text-gray-400"}`}>
                    {model.task}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {model.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">{model.originalPrice}</span>
                    )}
                    <span className="text-sm font-semibold text-sky-600">{model.price}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
