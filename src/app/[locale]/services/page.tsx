import { BatteryCharging, Check, ShieldCheck, SprayCan, Tent, Wrench, Zap, type LucideIcon } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { bookingHref } from "@/lib/booking-links";
import { getPublishedServices, getServicesPageContent, type ServiceView } from "@/lib/content";
import { PAGE_REGISTRY } from "@/lib/pages";
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

  const usePages = PAGE_REGISTRY.services.contentRollout === "pages";
  const [services, pageContent] = await Promise.all([
    getPublishedServices(locale),
    usePages ? getServicesPageContent(locale) : Promise.resolve(null),
  ]);

  const hasRow = Boolean(pageContent);
  const pick = (db: string | null | undefined, key: Parameters<typeof t>[0]) => {
    if (usePages && !hasRow) return t(key);
    if (usePages) return db || "";
    return db ?? t(key);
  };

  const systems = services.filter((s) => s.kind === "SYSTEM");
  const maintenance = services.filter((s) => s.kind === "MAINTENANCE");

  const showSystems = (pageContent?.showSystems !== false) && systems.length > 0;
  const showMaintenance = (pageContent?.showMaintenance !== false) && maintenance.length > 0;
  const showGlobalCta = pageContent?.showGlobalCta !== false;

  const ServiceCard = ({ service }: { service: ServiceView }) => {
    const Icon = SERVICE_ICONS[service.slug] ?? Wrench;
    const isMaintenance = service.kind === "MAINTENANCE";

    return (
      <div className="flex flex-col rounded-xl border border-border/70 bg-card p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="size-5" />
          </span>
          <h3 className="text-lg font-bold text-primary">{service.title}</h3>
        </div>
        <p className="mt-3 flex-1 text-sm text-muted-foreground">{service.description}</p>
        <ul className="mt-4 space-y-2">
          {service.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 size-4 shrink-0 text-brand-orange" />
              {f}
            </li>
          ))}
        </ul>
        <Link
          href={bookingHref({ tab: "quote", service: service.slug })}
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
          title={pick(pageContent?.title, "title")}
          subtitle={pick(pageContent?.subtitle, "subtitle")}
          headingClassName="font-extrabold tracking-[-0.01em]"
          underline
        />

        {showSystems ? (
          <>
            <h2 className="mb-6 text-xl font-extrabold tracking-[-0.01em] text-primary">
              {pick(pageContent?.systemsTitle, "systemsTitle")}
            </h2>
            <div className="grid gap-7 md:grid-cols-2">
              {systems.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </>
        ) : null}

        {showMaintenance ? (
          <>
            <h2
              className={`${showSystems ? "mt-14" : ""} mb-6 text-xl font-extrabold tracking-[-0.01em] text-primary`}
            >
              {pick(pageContent?.maintenanceTitle, "maintenanceTitle")}
            </h2>
            <div className="grid gap-7 md:grid-cols-2">
              {maintenance.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          </>
        ) : null}
      </section>

      {showGlobalCta ? <CtaBanner /> : null}
    </main>
  );
}
