import { SITE_URL } from "@/lib/seo";
import type { SiteSettingsView } from "@/lib/content";
import {
  formatThTelephoneE164,
  resolveQuickContact,
  SITE_CONTACT_FALLBACKS,
} from "@/lib/site-contact";

type Props = { settings: SiteSettingsView | null };

// LocalBusiness structured data for search engines.
export function LocalBusinessJsonLd({ settings }: Props) {
  const contact = resolveQuickContact(settings);

  const telephone = contact.phone
    ? formatThTelephoneE164(contact.phone)
    : !contact.hasRow
      ? formatThTelephoneE164(SITE_CONTACT_FALLBACKS.phone)
      : undefined;

  const email = contact.email ?? (!contact.hasRow ? SITE_CONTACT_FALLBACKS.email : undefined);

  const sameAs = contact.hasRow
    ? settings!.socialLinks.map((s) => s.url).filter(Boolean)
    : [SITE_CONTACT_FALLBACKS.lineUrl];

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "KKD PROPERTY CO., LTD.",
    url: SITE_URL,
    ...(telephone ? { telephone } : {}),
    ...(email ? { email } : {}),
    ...(settings?.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: settings.address,
            addressCountry: "TH",
          },
        }
      : !contact.hasRow
        ? {
            address: {
              "@type": "PostalAddress",
              addressLocality: "Samut Prakan",
              addressCountry: "TH",
            },
          }
        : {}),
    ...(settings?.hours
      ? { openingHours: settings.hours }
      : !contact.hasRow
        ? {
            openingHoursSpecification: {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: "09:00",
              closes: "18:00",
            },
          }
        : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
