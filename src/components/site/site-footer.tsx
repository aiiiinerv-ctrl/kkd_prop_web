"use client";

import { Clock, Mail, MapPin, Phone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/site/brand-logo";
import { SOCIAL_BRAND_ICON_MAP } from "@/components/site/social-brand-icons";
import { Link } from "@/i18n/navigation";
import type { SiteSettingsView, SocialLink } from "@/lib/content";
import { resolveQuickContact, SITE_CONTACT_FALLBACKS } from "@/lib/site-contact";

const FOOTER_SERVICE_LINKS = ["serviceOnGrid", "serviceHybrid", "serviceOffGrid", "serviceCleaning"] as const;

type Props = { settings: SiteSettingsView | null; footerLogoUrl?: string | null };

type ContactLine = {
  key: string;
  icon: LucideIcon;
  content: React.ReactNode;
};

export function SiteFooter({ settings, footerLogoUrl }: Props) {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const year = new Date().getFullYear();

  const contact = resolveQuickContact(settings);
  const description = settings?.footerDescription ?? null;
  const socialLinks: SocialLink[] = settings?.socialLinks ?? [];

  const contactLines: ContactLine[] = [];

  if (contact.address) {
    contactLines.push({
      key: "address",
      icon: MapPin,
      content: contact.address,
    });
  } else if (!contact.hasRow) {
    contactLines.push({ key: "address", icon: MapPin, content: t("address") });
  }

  const phoneDisplay = contact.phone ?? (!contact.hasRow ? t("phone") : null);
  if (phoneDisplay) {
    const phoneHref = (contact.phone ?? SITE_CONTACT_FALLBACKS.phone).replace(/[-\s]/g, "");
    contactLines.push({
      key: "phone",
      icon: Phone,
      content: (
        <a href={`tel:${phoneHref}`} className="hover:text-brand-orange">
          {phoneDisplay}
        </a>
      ),
    });
  }

  const emailDisplay = contact.email ?? (!contact.hasRow ? t("email") : null);
  if (emailDisplay) {
    const emailHref = contact.email ?? SITE_CONTACT_FALLBACKS.email;
    contactLines.push({
      key: "email",
      icon: Mail,
      content: (
        <a href={`mailto:${emailHref}`} className="hover:text-brand-orange">
          {emailDisplay}
        </a>
      ),
    });
  }

  if (contact.hours) {
    contactLines.push({ key: "hours", icon: Clock, content: contact.hours });
  } else if (!contact.hasRow) {
    contactLines.push({ key: "hours", icon: Clock, content: t("hours") });
  }

  return (
    <footer id="site-footer" className="site-footer border-t border-border bg-muted/50">
      <div className="site-footer-main mx-auto grid max-w-7xl gap-10 px-4 py-14 text-center sm:px-6 sm:text-left md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr_1.5fr]">
        <div className="flex flex-col items-center sm:items-start">
          <BrandLogo className="mb-4" srcOverride={footerLogoUrl} />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description ?? t("description")}
          </p>
          {socialLinks.length > 0 && (
            <div className="mt-4 flex gap-4">
              {socialLinks.map(({ key, url }) => {
                const Icon = SOCIAL_BRAND_ICON_MAP[key];
                if (!Icon) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t(`social${key.charAt(0).toUpperCase() + key.slice(1)}` as Parameters<typeof t>[0])}
                    className="text-foreground transition-colors hover:text-brand-orange"
                  >
                    <Icon className="size-[18px]" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("mainMenu")}</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            {(["home", "about", "portfolio", "calculator"] as const).map((key) => (
              <li key={key}>
                <Link
                  href={key === "home" ? "/" : `/${key}`}
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
                  href="/services"
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
            {contactLines.map(({ key, icon: Icon, content }) => (
              <li key={key} className="flex items-center justify-center gap-2 sm:justify-start">
                <Icon className="size-4 shrink-0 text-brand-orange" />
                {content}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="site-footer-bottom bg-[#1a1a1a] px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs text-brand-gold sm:flex-row">
          <div className="flex flex-wrap justify-center gap-5">
            {/* Privacy policy and terms used to sit here as `href="#"`. A
                policy link that goes nowhere is worse than no link — it
                announces the policy exists and then proves it doesn't. They
                come back when the customer's own wording arrives, TH and EN. */}
            <Link href="/cookie-policy" className="transition-colors hover:text-white">
              {t("cookiePolicy")}
            </Link>
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
