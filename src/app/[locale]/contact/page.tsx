import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { IconFacebook } from "@/components/site/icon-facebook";
import { SectionHeading } from "@/components/site/section-heading";
import { getSiteSettings } from "@/lib/content";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "contact", "/contact");
}

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");

  const settings = await getSiteSettings(locale);

  // Values from DB take precedence; fall back to messages so the page is
  // never blank on a fresh deployment before seed data is in the DB.
  const phone = settings?.phone ?? t("phoneValue");
  // Social links: null/empty means the operator cleared them → do not render.
  const lineUrl = settings?.socialLinks.find((s) => s.key === "line")?.url ?? null;
  const facebookUrl = settings?.facebookUrl ?? null;
  const address = settings?.address ?? t("addressValue");
  const hours = settings?.hours ?? t("hoursValue");
  const contactTitle = settings?.contactTitle ?? t("title");
  const contactSubtitle = settings?.contactSubtitle ?? t("subtitle");

  // Build only the items that have a value; social items without a URL are omitted.
  type Item = { icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>; label: string; value: string; href?: string };
  const ITEMS: Item[] = [
    { icon: MapPin, label: t("address"), value: address },
    { icon: Phone, label: t("phone"), value: phone, href: `tel:${phone.replace(/[-\s]/g, "")}` },
    ...(lineUrl ? [{ icon: MessageCircle, label: t("line"), value: t("lineValue"), href: lineUrl } as Item] : []),
    ...(facebookUrl ? [{ icon: IconFacebook, label: t("facebook"), value: t("facebookValue"), href: facebookUrl } as Item] : []),
    { icon: Clock, label: t("hours"), value: hours },
  ];

  const mapQuery = encodeURIComponent(settings?.mapQuery ?? address);

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={contactTitle}
          subtitle={contactSubtitle}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {ITEMS.map((item) => (
            <div
              key={item.label}
              className="flex items-start gap-4 rounded-xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg"
            >
              <item.icon className="mt-0.5 size-6 shrink-0 text-brand-orange" />
              <div>
                <div className="text-sm font-semibold text-primary">{item.label}</div>
                {item.href ? (
                  <a
                    href={item.href}
                    className="mt-1 block text-sm text-muted-foreground hover:text-brand-orange"
                    {...(item.href.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {item.value}
                  </a>
                ) : (
                  <div className="mt-1 text-sm text-muted-foreground">{item.value}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-xl border border-border/70 shadow-sm">
          <h3 className="sr-only">{t("mapTitle")}</h3>
          <iframe
            title={t("mapTitle")}
            src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`}
            loading="lazy"
            className="h-80 w-full border-0"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
