import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale, pickLocaleList } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;


export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return pageMetadata(locale, "services", "/services");
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("services");
  const tCommon = await getTranslations("common");

  const services = await prisma.service.findMany({
    where: { isPublished: true },
    orderBy: { sortOrder: "asc" },
  });
  const systems = services.filter((s) => s.kind === "SYSTEM");
  const maintenance = services.filter((s) => s.kind === "MAINTENANCE");

  const ServiceCard = ({ service }: { service: (typeof services)[number] }) => (
    <div className="flex flex-col rounded-xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <h3 className="text-lg font-bold text-primary">
        {pickLocale(service, "title", locale)}
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted-foreground">
        {pickLocale(service, "description", locale)}
      </p>
      <ul className="mt-4 space-y-2">
        {pickLocaleList(service, "features", locale).map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={{ pathname: "/booking", query: { tab: "quote", service: service.slug } }}
        className="mt-6 rounded-full border-2 border-brand-orange px-5 py-2.5 text-center text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
      >
        {tCommon("requestQuote")}
      </Link>
    </div>
  );

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("title")} subtitle={t("subtitle")} />

        <h2 className="mb-6 text-xl font-bold text-primary">{t("systemsTitle")}</h2>
        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-3">
          {systems.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>

        <h2 className="mt-14 mb-6 text-xl font-bold text-primary">
          {t("maintenanceTitle")}
        </h2>
        <div className="grid gap-7 md:grid-cols-2">
          {maintenance.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}
