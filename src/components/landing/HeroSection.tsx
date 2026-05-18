import { Button } from "@/components/ui/button";
import { ArrowRight, Image as ImageIcon, Video } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white/50 pt-20 pb-24 backdrop-blur-sm">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-sky-400/20 blur-[120px]" />
        <div className="absolute top-1/3 left-1/3 h-[300px] w-[400px] rounded-full bg-violet-400/15 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-50 px-4 py-1.5 text-sm text-sky-600">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          1000+ AI Models Available
        </div>

        {/* Headline */}
        <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
          Ultimate AI Media{" "}
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Generation Platform
          </span>
        </h1>

        {/* Subtext */}
        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 leading-relaxed">
          With 1000+ top-tier models, OpenOctopus is the most powerful platform for AI image and video generation — built to help you create faster and scale without limits.
        </p>

        {/* Primary CTAs */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white px-8 h-12 text-base">
            Explore Models <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 h-12 text-base">
            Documentation
          </Button>
        </div>

        {/* Secondary CTAs */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ImageIcon className="h-4 w-4" /> Image Generator
          </button>
          <span className="text-slate-300">|</span>
          <button className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <Video className="h-4 w-4" /> Video Generator
          </button>
        </div>

        {/* Hero visual placeholder - gradient cards */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {[
            "from-blue-500/20 to-purple-500/20",
            "from-sky-400/20 to-cyan-500/20",
            "from-green-500/20 to-teal-500/20",
            "from-cyan-300/20 to-blue-500/20",
          ].map((gradient, i) => (
            <div
              key={i}
              className={`aspect-[3/4] rounded-xl bg-gradient-to-br ${gradient} border border-slate-200/60 animate-pulse`}
              style={{ animationDelay: `${i * 200}ms`, animationDuration: "3s" }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
