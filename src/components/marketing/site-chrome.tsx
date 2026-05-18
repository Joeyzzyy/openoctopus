import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { HeaderUserMenu } from "@/components/marketing/header-user-menu";
import { LanguageSwitcher } from "@/components/marketing/language-switcher";
import { getI18n } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export async function MarketingHeader({
  isLoggedIn = false,
  userLabel,
  userAvatarUrl,
  walletBalanceLabel,
}: {
  isLoggedIn?: boolean;
  userLabel?: string | null;
  userAvatarUrl?: string | null;
  walletBalanceLabel?: string | null;
}) {
  const locale = await getLocale();
  const copy = getI18n(locale);
  const headerNavItems = [
    { label: copy.nav.explore, href: "/dashboard?view=explore" },
    { label: copy.nav.pricing, href: "/pricing" },
    { label: copy.nav.learnMore, href: "/resource" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-black/[0.06] bg-[#FCFCFA]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center px-6 md:px-8">
        <div className="relative flex w-full items-center text-sm md:text-base">
          <Link
            href="/"
            className="-ml-2 rounded-md px-2 py-1.5 text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
          >
            <Logo className="text-[#111827]" />
          </Link>

          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 lg:flex">
            {headerNavItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-[14px] font-medium text-[#6B7280] transition-colors hover:bg-black/[0.03] hover:text-[#111827]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <HeaderUserMenu
                  locale={locale}
                  userLabel={userLabel}
                  userAvatarUrl={userAvatarUrl}
                  walletBalanceLabel={walletBalanceLabel}
                  labels={{
                    openMenu: copy.account.openMenu,
                    userFallback: copy.account.userFallback,
                    walletBalance: copy.account.walletBalance,
                    dashboard: copy.nav.dashboard,
                    signOut: copy.nav.signOut,
                    refreshingBalance: copy.account.refreshingBalance,
                    refreshBalance: copy.account.refreshBalance,
                    language: copy.account.language,
                    english: copy.account.english,
                    chinese: copy.account.chinese,
                  }}
                />
              </>
            ) : (
              <>
                <LanguageSwitcher
                  locale={locale}
                  label={copy.language.short}
                  nextLabel={copy.language.nextShort}
                  ariaLabel={copy.language.switchTo}
                />
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center justify-center rounded-md bg-[#111827] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0B1220]"
                >
                  {copy.nav.signIn}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export async function MarketingFooter() {
  const locale = await getLocale();
  const copy = getI18n(locale);
  const footerNavItems = [
    { label: copy.nav.models, href: "/models" },
    { label: copy.nav.pricing, href: "/pricing" },
    { label: copy.nav.docs, href: "/docs" },
    { label: copy.nav.learnMore, href: "/resource" },
    { label: copy.nav.tools, href: "/tools" },
  ];

  return (
    <footer className="border-t border-black/[0.06] bg-[#FCFCFA]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-8 md:py-12">
        <div className="flex items-center gap-4">
          <Logo className="text-[#111827]" />
          <span className="hidden text-[13px] text-[#9CA3AF] md:inline">
            {copy.footer.tagline}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#6B7280]">
          {footerNavItems.map((item) => (
            <Link key={item.label} href={item.href} className="transition-colors hover:text-[#111827]">
              {item.label}
            </Link>
          ))}
          <span className="text-[#D1D5DB]">•</span>
          <span>© 2026 OpenOctopus</span>
        </div>
      </div>
    </footer>
  );
}
