import { SITE_URL } from "@/lib/seo";
import type { SiteSettingsView } from "@/lib/content";

type Props = { settings: SiteSettingsView | null };

// LocalBusiness structured data for search engines.
export function LocalBusinessJsonLd({ settings }: Props) {
  const telephone = settings?.phone
    ? `+66${settings.phone.replace(/^0/, "").replace(/[-\s]/g, "")}`
    : "+66824731567";
  const email = settings?.email ?? "contact@kkdproperty.com";

  const sameAs = settings?.socialLinks.map((s) => s.url).filter(Boolean) ?? [
    "https://line.me/R/ti/p/@kkdsolar",
  ];

  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "KKD PROPERTY CO., LTD.",
    url: SITE_URL,
    telephone,
    email,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Samut Prakan",
      addressCountry: "TH",
    },
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
