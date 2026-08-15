import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/seo";

// LocalBusiness structured data for search engines.
export async function LocalBusinessJsonLd() {
  const t = await getTranslations("meta");
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "KKD PROPERTY CO., LTD.",
    description: t("localBusinessDescription"),
    url: SITE_URL,
    telephone: "+66824731567",
    email: "contact@kkdproperty.com",
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
    sameAs: ["https://line.me/R/ti/p/@kkdsolar"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
