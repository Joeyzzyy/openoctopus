import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="bg-white/50 py-24 border-t border-slate-200/60 backdrop-blur-sm">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
        {/* Background glow */}
        <div className="relative">
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 h-40 w-[500px] rounded-full bg-sky-400/20 blur-[80px]" />
          <h2 className="relative text-4xl font-bold text-slate-900 sm:text-5xl">
            Unlock Your AI Potential{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Today
            </span>
          </h2>
          <p className="relative mt-4 text-lg text-slate-500">
            Start building with the fastest AI inference platform. Free credits included.
          </p>
          <div className="relative mt-8 flex items-center justify-center gap-4">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base">
              Start Building <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 h-12 text-base">
              View Documentation
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
