import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { SOCIAL_BRAND_ICON_MAP, SOCIAL_LINK_ORDER } from "@/components/site/social-brand-icons";
import { getSiteSettings } from "@/lib/content";
import { pickSiteContactValue } from "@/lib/site-contact";
import { pageMetadata } from "@/lib/seo";

type ContactCard = {
  key: string;
  icon: React.ComponentType<React.SVGAttributes<SVGSVGElement>>;
  label: string;
  value: string;
  href?: string;
};

const SOCIAL_MESSAGE_KEYS = {
  line: { label: "line", value: "lineValue" },
  facebook: { label: "facebook", value: "facebookValue" },
  instagram: { label: "instagram", value: "instagramValue" },
  tiktok: { label: "tiktok", value: "tiktokValue" },
  youtube: { label: "youtube", value: "youtubeValue" },
} as const;

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
  const hasRow = settings !== null;

  const pickText = (
    dbValue: string | null | undefined,
    fallbackKey: "addressValue" | "phoneValue" | "hoursValue"
  ) => pickSiteContactValue(dbValue, hasRow, t(fallbackKey));

  const address = pickText(settings?.address, "addressValue");
  const phone = pickText(settings?.phone, "phoneValue");
  const email = pickSiteContactValue(settings?.email, hasRow, t("emailValue"));
  const hours = pickText(settings?.hours, "hoursValue");
  const contactTitle = settings?.contactTitle ?? t("title");
  const contactSubtitle = settings?.contactSubtitle ?? t("subtitle");

  const socialUrlByKey = new Map(settings?.socialLinks.map((s) => [s.key, s.url]) ?? []);

  const items: ContactCard[] = [];

  if (address) {
    items.push({ key: "address", icon: MapPin, label: t("address"), value: address });
  }
  if (phone) {
    items.push({
      key: "phone",
      icon: Phone,
      label: t("phone"),
      value: phone,
      href: `tel:${phone.replace(/[-\s]/g, "")}`,
    });
  }
  if (email) {
    items.push({
      key: "email",
      icon: Mail,
      label: t("email"),
      value: email,
      href: `mailto:${email}`,
    });
  }

  for (const socialKey of SOCIAL_LINK_ORDER) {
    const url = socialUrlByKey.get(socialKey);
    if (!url) continue;
    const msg = SOCIAL_MESSAGE_KEYS[socialKey];
    const Icon = SOCIAL_BRAND_ICON_MAP[socialKey];
    if (!Icon) continue;
    items.push({
      key: socialKey,
      icon: Icon,
      label: t(msg.label),
      value: t(msg.value),
      href: url,
    });
  }

  if (hours) {
    items.push({ key: "hours", icon: Clock, label: t("hours"), value: hours });
  }

  const mapQuery = encodeURIComponent(settings?.mapQuery ?? address ?? t("addressValue"));

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={contactTitle}
          subtitle={contactSubtitle}
          headingClassName="font-extrabold tracking-[-0.01em]"
        />

        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.key}
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
