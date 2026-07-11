import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { BrandLogo } from "@/components/site/brand-logo";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tNav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-muted/50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1.5fr_1.5fr]">
        <div>
          <BrandLogo className="mb-4" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t("description")}
          </p>
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
            <li>
              <Link href="/services" className="transition-colors hover:text-brand-orange">
                On-Grid
              </Link>
            </li>
            <li>
              <Link href="/services" className="transition-colors hover:text-brand-orange">
                Hybrid
              </Link>
            </li>
            <li>
              <Link href="/services" className="transition-colors hover:text-brand-orange">
                Off-Grid
              </Link>
            </li>
            <li>
              <Link href="/packages" className="transition-colors hover:text-brand-orange">
                {tNav("packages")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-bold">{t("contactUs")}</h4>
          <ul className="space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <MapPin className="size-4 shrink-0 text-brand-orange" />
              {t("address")}
            </li>
            <li className="flex items-center gap-2">
              <Phone className="size-4 shrink-0 text-brand-orange" />
              <a href="tel:0824731567" className="hover:text-brand-orange">
                {t("phone")}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="size-4 shrink-0 text-brand-orange" />
              <a href="mailto:contact@kkdproperty.com" className="hover:text-brand-orange">
                {t("email")}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Clock className="size-4 shrink-0 text-brand-orange" />
              {t("hours")}
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-[#1a1a1a] px-4 py-5 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-center text-xs text-brand-gold sm:flex-row">
          <div className="flex gap-5">
            <span>{t("privacyPolicy")}</span>
            <span>{t("termsOfUse")}</span>
          </div>
          <div>{t("copyright", { year })}</div>
        </div>
      </div>
    </footer>
  );
}
