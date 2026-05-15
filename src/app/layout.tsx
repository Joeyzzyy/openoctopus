import type { Metadata } from "next";
import { DM_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";
import { GlobalAlertToaster } from "@/components/ui/global-alert-toaster";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

function resolveMetadataBase() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: "OpenOctopus",
  description:
    "OpenOctopus — AI media generation platform with model budgets, API keys, and spend oversight.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${inter.variable} ${jetbrainsMono.variable} dark`}>
      <body className="min-h-full bg-[#0C0A09] text-[#FAFAF8] font-sans">
        {children}
        <Suspense fallback={null}>
          <GlobalAlertToaster />
        </Suspense>
      </body>
    </html>
  );
}
