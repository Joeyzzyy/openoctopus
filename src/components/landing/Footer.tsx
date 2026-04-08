import Link from "next/link";

const footerSections = [
  {
    title: "Learn More",
    links: [
      { label: "Home", href: "/" },
      { label: "Explore", href: "/explore" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "About Us", href: "/about" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Image Generator", href: "/generators/image" },
      { label: "Video Generator", href: "/generators/video" },
      { label: "Desktop App", href: "/desktop" },
      { label: "Studio", href: "/studio" },
      { label: "Documentation", href: "/docs" },
      { label: "Blog", href: "/blog" },
    ],
  },
  {
    title: "Models",
    links: [
      { label: "Wan 2.1", href: "/models/wan" },
      { label: "Flux", href: "/models/flux" },
      { label: "Kling", href: "/models/kling" },
      { label: "Seedream", href: "/models/seedream" },
      { label: "Gemini", href: "/models/gemini" },
      { label: "View All", href: "/explore" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Support", href: "/support" },
      { label: "Affiliate", href: "/affiliate" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-white/70 border-t border-slate-200/60 pt-16 pb-8 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">{section.title}</h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-200/60 pt-8 gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-xs">
              W
            </div>
            <span className="text-sm font-semibold text-slate-900">WaveSpeed</span>
          </div>
          <p className="text-xs text-slate-400">
            © 2024 WaveSpeed AI. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {/* Social icons as text for now */}
            <a href="#" className="text-slate-500 hover:text-slate-700 transition-colors text-sm">GitHub</a>
            <a href="#" className="text-slate-500 hover:text-slate-700 transition-colors text-sm">Discord</a>
            <a href="#" className="text-slate-500 hover:text-slate-700 transition-colors text-sm">𝕏</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
