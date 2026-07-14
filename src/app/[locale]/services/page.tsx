import { BatteryCharging, Check, ShieldCheck, SprayCan, Tent, Wrench, Zap, type LucideIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale, pickLocaleList } from "@/lib/i18n-content";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

const SERVICE_ICONS: Record<string, LucideIcon> = {
  "on-grid": Zap,
  hybrid: BatteryCharging,
  "off-grid": Tent,
  "panel-cleaning": SprayCan,
  "system-inspection": ShieldCheck,
};


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

  const ServiceCard = ({ service }: { service: (typeof services)[number] }) => {
    const Icon = SERVICE_ICONS[service.slug] ?? Wrench;
    const isMaintenance = service.kind === "MAINTENANCE";

    return (
      <div className="flex flex-col rounded-xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <h3 className="text-lg font-bold text-primary">
            {pickLocale(service, "title", locale)}
          </h3>
        </div>
        <p className="mt-3 flex-1 text-sm text-muted-foreground">
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
          className="btn-pill-outline mt-6"
        >
          {isMaintenance ? tCommon("requestMaintenance") : tCommon("requestQuote")}
        </Link>
      </div>
    );
  };

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          headingClassName="font-extrabold tracking-[-0.01em]"
          underline
        />

        <h2 className="mb-6 text-xl font-extrabold tracking-[-0.01em] text-primary">
          {t("systemsTitle")}
        </h2>
        <div className="grid gap-7 md:grid-cols-2">
          {systems.map((s) => (
            <ServiceCard key={s.id} service={s} />
          ))}
        </div>

        <h2 className="mt-14 mb-6 text-xl font-extrabold tracking-[-0.01em] text-primary">
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
