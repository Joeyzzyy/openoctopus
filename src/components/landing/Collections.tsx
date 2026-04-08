import { collections, categories } from "@/lib/data";

export function Collections() {
  return (
    <section className="bg-white/50 py-20 border-t border-slate-200/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-3xl font-bold text-slate-900">Get any tool you want</h2>
        <p className="mt-2 text-slate-500 mb-10">
          Browse collections and categories to find the perfect model
        </p>

        {/* Collections */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-12">
          {collections.map((col) => (
            <div
              key={col.name}
              className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200/60 bg-white/70 p-4 hover:bg-white/90 hover:border-slate-300/80 transition-all cursor-pointer backdrop-blur-sm"
            >
              <span className="text-2xl">{col.icon}</span>
              <span className="text-sm font-medium text-slate-900">{col.name}</span>
              <span className="text-xs text-slate-500">{col.count} models</span>
            </div>
          ))}
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="group rounded-xl border border-slate-200/60 bg-white/70 p-5 hover:bg-white/90 hover:border-slate-300/80 transition-all cursor-pointer backdrop-blur-sm"
            >
              <h3 className="text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors">
                {cat.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">{cat.count} models</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
