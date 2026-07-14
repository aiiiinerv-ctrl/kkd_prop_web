"use client";

import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { BrandLogo } from "@/components/site/brand-logo";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/* Minimal brand glyphs (lucide-react ships no brand/social icons) — kept local, no new dependency. */
function IconFacebook(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.51 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94z" />
    </svg>
  );
}
function IconLine(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2C6.48 2 2 5.7 2 10.24c0 4.06 3.54 7.46 8.33 8.11.32.07.76.21.87.49.1.25.07.65.03.9l-.14.85c-.04.25-.19.98.86.53 1.04-.44 5.63-3.32 7.68-5.68C21.03 13.6 22 12 22 10.24 22 5.7 17.52 2 12 2zM8.29 12.7H6.5a.32.32 0 0 1-.32-.32V8.6c0-.18.15-.32.32-.32.18 0 .32.14.32.32v3.46h1.47c.18 0 .32.14.32.32 0 .17-.14.32-.32.32zm1.68 0a.32.32 0 0 1-.32-.32V8.6c0-.18.14-.32.32-.32.17 0 .32.14.32.32v3.78c0 .18-.15.32-.32.32zm4.15 0a.32.32 0 0 1-.32-.32V9.72l-1.63 2.85a.32.32 0 0 1-.28.16h-.03a.32.32 0 0 1-.32-.32V8.6c0-.18.14-.32.32-.32.17 0 .32.14.32.32v2.65l1.62-2.83a.32.32 0 0 1 .28-.16h.04c.18 0 .32.14.32.32v3.78c0 .18-.15.32-.32.32zm3.6 0h-2c-.18 0-.32-.14-.32-.32V8.6c0-.18.14-.32.32-.32h2c.17 0 .32.14.32.32 0 .17-.15.32-.32.32H16.1v1.05h1.62c.18 0 .32.14.32.32 0 .17-.14.32-.32.32H16.1v1.05h1.62c.17 0 .32.14.32.32 0 .17-.15.32-.32.32z" />
    </svg>
  );
}
function IconInstagram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 0 0-2.13 1.39A5.9 5.9 0 0 0 .62 4.14C.32 4.9.12 5.78.06 7.05.01 8.33 0 8.74 0 12s.01 3.67.06 4.95c.06 1.27.26 2.15.56 2.91.31.79.72 1.46 1.39 2.13a5.9 5.9 0 0 0 2.13 1.39c.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.06c1.27-.06 2.15-.26 2.91-.56a5.9 5.9 0 0 0 2.13-1.39 5.9 5.9 0 0 0 1.39-2.13c.3-.76.5-1.64.56-2.91.05-1.28.06-1.69.06-4.95s-.01-3.67-.06-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 0 0-1.39-2.13A5.9 5.9 0 0 0 19.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zm0 10.16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm7.85-10.4a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
    </svg>
  );
}
function IconTiktok(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.6 2h-3.2v13.9c0 1.5-1.2 2.7-2.7 2.7a2.7 2.7 0 0 1-2.7-2.7 2.7 2.7 0 0 1 2.7-2.7c.28 0 .55.04.8.12V10c-.26-.04-.53-.06-.8-.06A5.94 5.94 0 0 0 4.75 21c1.65 1.19 3.63 1.5 5.66.9a5.94 5.94 0 0 0 4.19-5.68V8.34a8.18 8.18 0 0 0 4.5 1.35V6.5a4.9 4.9 0 0 1-2.5-4.5z" />
    </svg>
  );
}
function IconYoutube(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 0 0 .5 6.19 31.6 31.6 0 0 0 0 12a31.6 31.6 0 0 0 .5 5.81 3.02 3.02 0 0 0 2.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 0 0 2.12-2.14A31.6 31.6 0 0 0 24 12a31.6 31.6 0 0 0-.5-5.81zM9.6 15.6V8.4L15.8 12z" />
    </svg>
  );
}

const SOCIAL_LINKS = [
  { key: "socialFacebook", Icon: IconFacebook },
  { key: "socialLine", Icon: IconLine },
  { key: "socialInstagram", Icon: IconInstagram },
  { key: "socialTiktok", Icon: IconTiktok },
  { key: "socialYoutube", Icon: IconYoutube },
] as const;

const FOOTER_SERVICE_LINKS = ["serviceOnGrid", "serviceHybrid", "serviceOffGrid", "serviceCleaning"] as const;

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

export function SiteFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const [pathForTheme, setPathForTheme] = useState(pathname);
  const themePrefix = themePrefixForPath(pathname);
  const shellThemePrefix = themePrefixForPath(pathForTheme);
  const year = new Date().getFullYear();

  useEffect(() => {
    // window.location.pathname still carries the locale segment (e.g. "/th/theme-4");
    // themePrefixForPath expects the locale-stripped path that usePathname() returns.
    setPathForTheme(window.location.pathname.replace(/^\/(th|en)(?=\/|$)/, "") || "/");
  }, [pathname]);

  return (
    <footer
      className={cn(
        "site-footer border-t border-border bg-muted/50",
        (shellThemePrefix === "/theme-2" || shellThemePrefix === "/theme-4") &&
          "theme-2-site-footer",
        shellThemePrefix === "/theme-3" && "theme-3-site-footer"
      )}
    >
      <div className="site-footer-main mx-auto grid max-w-7xl gap-10 px-4 py-14 text-center sm:px-6 sm:text-left md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr_1.5fr]">
        <div className="flex flex-col items-center sm:items-start">
          <BrandLogo className="mb-4" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
          <div className="mt-4 flex gap-4">
            {SOCIAL_LINKS.map(({ key, Icon }) => (
              <a
                key={key}
                href="#"
                aria-label={t(key)}
                className="text-foreground transition-colors hover:text-brand-orange"
              >
                <Icon className="size-[18px]" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("mainMenu")}</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {(["home", "about", "portfolio", "calculator"] as const).map((key) => (
              <li key={key}>
                <Link
                  href={hrefForTheme(themePrefix, key === "home" ? "/" : `/${key}`)}
                  className="transition-colors hover:text-brand-orange"
                >
                  {tNav(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("ourServices")}</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {FOOTER_SERVICE_LINKS.map((key) => (
              <li key={key}>
                <Link
                  href={hrefForTheme(themePrefix, "/services")}
                  className="transition-colors hover:text-brand-orange"
                >
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("contactUs")}</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <MapPin className="size-4 shrink-0 text-brand-orange" />
              {t("address")}
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <Phone className="size-4 shrink-0 text-brand-orange" />
              <a href="tel:0824731567" className="hover:text-brand-orange">
                {t("phone")}
              </a>
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <Mail className="size-4 shrink-0 text-brand-orange" />
              <a href="mailto:contact@kkdproperty.com" className="hover:text-brand-orange">
                {t("email")}
              </a>
            </li>
            <li className="flex items-center justify-center gap-2 sm:justify-start">
              <Clock className="size-4 shrink-0 text-brand-orange" />
              {t("hours")}
            </li>
          </ul>
        </div>
      </div>

      <div className="site-footer-bottom bg-[#1a1a1a] px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs text-brand-gold sm:flex-row">
          <div className="flex flex-wrap justify-center gap-5">
            <a href="#" className="transition-colors hover:text-white">
              {t("privacyPolicy")}
            </a>
            <a href="#" className="transition-colors hover:text-white">
              {t("termsOfUse")}
            </a>
            <a href="#" className="transition-colors hover:text-white">
              {t("cookiePolicy")}
            </a>
            <a href="/sitemap.xml" className="transition-colors hover:text-white">
              {t("siteMap")}
            </a>
          </div>
          <div>{t("copyright", { year })}</div>
        </div>
      </div>
    </footer>
  );
}
