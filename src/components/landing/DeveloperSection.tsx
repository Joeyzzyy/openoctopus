export function DeveloperSection() {
  const codeExample = `import OpenOctopus from '@openoctopus/sdk';

const client = new OpenOctopus({
  apiKey: process.env.OPENOCTOPUS_API_KEY
});

const result = await client.generate({
  model: 'wan-2.1/text-to-video',
  prompt: 'A serene lake at sunrise with mist',
  width: 1280,
  height: 720,
  duration: 5
});

console.log(result.url);`;

  return (
    <section className="bg-white/50 py-20 border-t border-slate-200/60 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900">Built For Developers</h2>
          <p className="mt-2 text-slate-500">
            Integrate any model with a single API call. Node, Python, or cURL — ship in minutes, not days.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Code block */}
          <div className="rounded-xl border border-slate-200/60 bg-slate-50 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-200/60">
              {["Node.js", "Python", "cURL"].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    i === 0
                      ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50/50"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            {/* Code */}
            <pre className="p-5 text-sm leading-relaxed overflow-x-auto">
              <code className="text-slate-700">
                {codeExample.split("\n").map((line, i) => (
                  <span key={i} className="block">
                    {colorize(line)}
                  </span>
                ))}
              </code>
            </pre>
          </div>

          {/* Output preview */}
          <div className="rounded-xl border border-slate-200/60 bg-white/70 p-6 backdrop-blur-sm">
            <h3 className="text-sm font-medium text-slate-500 mb-4">Output Preview</h3>
            <div className="aspect-video rounded-lg bg-gradient-to-br from-sky-100 to-violet-100 border border-slate-200/60 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm text-slate-600">Generated Video</p>
                <p className="text-xs text-slate-400 mt-1">1280 × 720 · MP4 · 8.4 MB</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-white/60 border border-slate-200/60 p-3 backdrop-blur-sm">
                <p className="text-lg font-semibold text-slate-900">~2s</p>
                <p className="text-xs text-slate-500">Latency</p>
              </div>
              <div className="rounded-lg bg-white/60 border border-slate-200/60 p-3 backdrop-blur-sm">
                <p className="text-lg font-semibold text-slate-900">$0.30</p>
                <p className="text-xs text-slate-500">Per video</p>
              </div>
              <div className="rounded-lg bg-white/60 border border-slate-200/60 p-3 backdrop-blur-sm">
                <p className="text-lg font-semibold text-slate-900">720p</p>
                <p className="text-xs text-slate-500">Resolution</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function colorize(line: string) {
  if (line.startsWith("import") || line.startsWith("const") || line.startsWith("await"))
    return <span className="text-purple-400">{line}</span>;
  if (line.includes("//") || line.includes("console"))
    return <span className="text-gray-500">{line}</span>;
  if (line.includes("'") || line.includes('"'))
    return (
      <span>
        {line.split(/(["'][^"']*["'])/).map((part, i) =>
          part.match(/^["']/) ? (
            <span key={i} className="text-green-400">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  return <span>{line}</span>;
}
