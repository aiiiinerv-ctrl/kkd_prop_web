"use client";

import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
  { key: "testimonials", href: "/testimonials" },
  { key: "calculator", href: "/calculator" },
  { key: "contact", href: "/contact" },
] as const;

function themePrefixForPath(pathname: string) {
  if (pathname === "/theme-2" || pathname.startsWith("/theme-2/")) return "/theme-2";
  if (pathname === "/theme-3" || pathname.startsWith("/theme-3/")) return "/theme-3";
  if (pathname === "/theme-4" || pathname.startsWith("/theme-4/")) return "/theme-4";
  if (pathname === "/theme-5" || pathname.startsWith("/theme-5/")) return "/theme-5";
  if (pathname === "/theme-6" || pathname.startsWith("/theme-6/")) return "/theme-6";
  if (pathname === "/theme-1" || pathname.startsWith("/theme-1/")) return "/theme-1";
  return "";
}

function hrefForTheme(prefix: string, href: string) {
  if (!prefix) return href;
  return href === "/" ? prefix : `${prefix}${href}`;
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const { mobileNavOpen, setMobileNavOpen } = useUiStore();
  const [pathForTheme, setPathForTheme] = useState(pathname);
  const themePrefix = themePrefixForPath(pathname);
  const activePath = themePrefix ? pathname.slice(themePrefix.length) || "/" : pathname;
  const shellThemePrefix = themePrefixForPath(pathForTheme);

  useEffect(() => {
    // window.location.pathname still carries the locale segment (e.g. "/th/theme-4");
    // themePrefixForPath expects the locale-stripped path that usePathname() returns.
    setPathForTheme(window.location.pathname.replace(/^\/(th|en)(?=\/|$)/, "") || "/");
  }, [pathname]);

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-50 bg-background shadow-md",
        ["/theme-3", "/theme-4", "/theme-5", "/theme-6"].includes(shellThemePrefix) &&
          "theme-3-site-header"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={hrefForTheme(themePrefix, "/")} onClick={() => setMobileNavOpen(false)}>
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? activePath === "/" : activePath.startsWith(item.href);
            return (
              <Link
                key={item.key}
                href={hrefForTheme(themePrefix, item.href)}
                data-active={active ? "true" : "false"}
                className={cn(
                  "border-b-[3px] py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
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
          <Link href={hrefForTheme(themePrefix, "/booking")} className="btn-pill px-5 py-2">
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
                  href={hrefForTheme(themePrefix, item.href)}
                  onClick={() => setMobileNavOpen(false)}
                  className="block px-6 py-4 text-center text-sm font-medium hover:text-brand-orange"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
            <li className="p-4 text-center">
              <Link
                href={hrefForTheme(themePrefix, "/booking")}
                onClick={() => setMobileNavOpen(false)}
                className="btn-pill inline-flex px-6 py-2.5"
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
