import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
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

  const ITEMS = [
    { icon: MapPin, label: t("address"), value: t("addressValue") },
    {
      icon: Phone,
      label: t("phone"),
      value: t("phoneValue"),
      href: "tel:0824731567",
    },
    {
      icon: MessageCircle,
      label: t("line"),
      value: t("lineValue"),
      href: "https://line.me/R/ti/p/@kkdsolar",
    },
    { icon: Clock, label: t("hours"), value: t("hoursValue") },
  ];

  return (
    <main>
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
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
      </section>

      <CtaBanner />
    </main>
  );
}
