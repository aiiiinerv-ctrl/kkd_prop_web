import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/db";
import { pickLocale } from "@/lib/i18n-content";
import { storage } from "@/lib/storage";

export const revalidate = 300;

const STATS = [
  { value: "200+", key: "statsProjects" },
  { value: "10+", key: "statsYears" },
  { value: "100%", key: "statsEngineers" },
  { value: "98%", key: "statsSatisfaction" },
] as const;

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const tCommon = await getTranslations("common");
  const tPortfolio = await getTranslations("portfolio");

  const [projects, packages] = await Promise.all([
    prisma.portfolioProject.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 6,
    }),
    prisma.package.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <main>
      {/* Hero */}
      <section className="flex min-h-[520px] flex-col lg:flex-row">
        <div className="min-h-[280px] flex-[1.2] bg-gradient-to-br from-primary via-[#0a6ab8] to-[#4d9fdc]">
          <div className="flex h-full items-center justify-center p-10">
            <SolarPanelArt />
          </div>
        </div>
        <div className="relative flex flex-1 flex-col justify-center bg-gradient-to-br from-[#fff5e6] to-[#fbe2c0] px-6 py-12 sm:px-12">
          <div className="absolute top-[20%] left-0 hidden h-[60%] w-1.5 rounded-r bg-brand-orange lg:block" />
          <h1 className="text-3xl leading-snug font-bold sm:text-4xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-xl text-muted-foreground">{t("heroSubtitle")}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={{ pathname: "/booking", query: { tab: "survey" } }}
              className="rounded-full border-2 border-brand-orange px-7 py-3 text-sm font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
            >
              {tCommon("bookSurvey")}
            </Link>
            <Link
              href={{ pathname: "/booking", query: { tab: "quote" } }}
              className="rounded-full bg-brand-orange px-7 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-orange-dark hover:shadow-[0_4px_10px_rgba(255,127,0,0.3)]"
            >
              {tCommon("requestQuote")}
            </Link>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="bg-primary">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 text-center sm:px-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.key}>
              <div className="text-3xl font-bold text-brand-gold">{s.value}</div>
              <div className="mt-1 text-sm text-white/85">{t(s.key)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Latest projects */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("latestProjects")} />
        <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const imageKeys = p.imageKeys as string[];
            return (
              <Link
                key={p.id}
                href="/portfolio"
                className="group overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                {imageKeys[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={storage.publicUrl(imageKeys[0])}
                    alt={pickLocale(p, "title", locale)}
                    className="h-48 w-full object-cover"
                    loading="lazy"
                  />
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-primary">
                    {pickLocale(p, "title", locale)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tPortfolio("province")}: {p.province} · {p.systemSizeKw}KW
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/portfolio"
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            {tCommon("viewAll")} →
          </Link>
        </div>
      </section>

      {/* Packages preview */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeading title={t("ourPackagesTitle")} />
          <div className="grid gap-7 md:grid-cols-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={
                  pkg.isPopular
                    ? "relative rounded-xl border-2 border-brand-orange bg-card p-6 text-center shadow-md"
                    : "rounded-xl border border-border/70 bg-card p-6 text-center shadow-sm"
                }
              >
                {pkg.isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-orange px-4 py-0.5 text-xs font-semibold text-white">
                    {tCommon("popular")}
                  </span>
                )}
                <h3
                  className={
                    pkg.isPopular
                      ? "text-xl font-bold text-brand-orange"
                      : "text-xl font-bold text-primary"
                  }
                >
                  {pickLocale(pkg, "name", locale)}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {pickLocale(pkg, "suitable", locale)}
                </p>
                <Link
                  href="/packages"
                  className="mt-5 inline-block text-sm font-semibold text-brand-orange hover:underline"
                >
                  {tCommon("learnMore")} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner />
    </main>
  );
}

function SolarPanelArt() {
  return (
    <svg viewBox="0 0 400 300" className="max-h-72 w-full max-w-md" aria-hidden>
      <circle cx="330" cy="60" r="36" fill="#ffcc66" opacity="0.9" />
      <g transform="skewX(-12)">
        {[0, 1, 2].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect
              key={`${r}${c}`}
              x={70 + c * 72}
              y={90 + r * 58}
              width="64"
              height="50"
              rx="4"
              fill="#0b3b66"
              stroke="#7fb3d9"
              strokeWidth="2"
            />
          ))
        )}
      </g>
      <rect x="40" y="266" width="330" height="8" rx="4" fill="#0b3b66" />
    </svg>
  );
}
