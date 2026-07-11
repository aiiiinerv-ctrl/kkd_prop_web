"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/site/brand-logo";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/use-ui-store";

const NAV_ITEMS = [
  { key: "home", href: "/" },
  { key: "about", href: "/about" },
  { key: "services", href: "/services" },
  { key: "packages", href: "/packages" },
  { key: "portfolio", href: "/portfolio" },
  { key: "calculator", href: "/calculator" },
  { key: "contact", href: "/contact" },
] as const;

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();

  return (
    <header className="sticky top-0 z-50 bg-background shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" onClick={() => setMobileNavOpen(false)}>
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "border-b-2 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  active
                    ? "border-brand-orange text-brand-orange"
                    : "border-transparent text-foreground hover:border-brand-orange hover:text-brand-orange"
                )}
              >
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher />
          <Link
            href="/booking"
            className="rounded-full bg-brand-orange px-5 py-2 text-sm font-semibold whitespace-nowrap text-white transition-all hover:bg-brand-orange-dark hover:shadow-[0_4px_8px_rgba(255,127,0,0.3)]"
          >
            {t("booking")}
          </Link>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <LanguageSwitcher />
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="text-foreground"
          >
            {mobileNavOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {mobileNavOpen && (
        <nav className="border-t border-border bg-background shadow-lg lg:hidden">
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.key} className="border-b border-border/60">
                <Link
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="block px-6 py-4 text-center text-sm font-medium hover:text-brand-orange"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
            <li className="p-4 text-center">
              <Link
                href="/booking"
                onClick={() => setMobileNavOpen(false)}
                className="inline-block rounded-full bg-brand-orange px-6 py-2.5 text-sm font-semibold text-white"
              >
                {t("booking")}
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
