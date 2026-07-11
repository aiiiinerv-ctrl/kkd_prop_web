import { SITE_URL } from "@/lib/seo";

// LocalBusiness structured data for search engines.
export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "KKD PROPERTY CO., LTD.",
    description:
      "บริการติดตั้งโซลาร์เซลล์ครบวงจร On-Grid, Hybrid, Off-Grid โดยวิศวกรมีใบอนุญาต",
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
