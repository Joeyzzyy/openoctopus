import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

const footerSections = [
  {
    title: "Learn More",
    links: [
      { label: "Home", href: "/" },
      { label: "Documentation", href: "/docs" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/enterprise" },
      { label: "About Us", href: "/about" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Image Generator", href: "/login" },
      { label: "Studio", href: "/login" },
      { label: "Documentation", href: "/docs" },
      { label: "Sign In", href: "/login" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms of Service", href: "/about" },
      { label: "Privacy Policy", href: "/about" },
      { label: "Support", href: "mailto:support@openoctopus.ai" },
      { label: "Status", href: "https://status.wavespeed.ai/" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-white/70 border-t border-slate-200/60 pt-16 pb-8 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 mb-12">
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
          <Logo className="text-slate-900" />
          <p className="text-xs text-slate-400">
            © 2024 OpenOctopus. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
