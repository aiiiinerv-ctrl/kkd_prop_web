import { Award, BadgeCheck, Building2, Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CtaBanner } from "@/components/site/cta-banner";
import { SectionHeading } from "@/components/site/section-heading";

const NUMBERS = [
  { value: "200+", key: "statsProjects" },
  { value: "10+", key: "statsYears" },
  { value: "100%", key: "statsEngineers" },
  { value: "98%", key: "statsSatisfaction" },
] as const;

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("about");
  const tHome = await getTranslations("home");

  const CREDENTIALS = [
    { icon: Building2, title: t("credRegisteredTitle"), desc: t("credRegisteredDesc") },
    { icon: BadgeCheck, title: t("credEngineerTitle"), desc: t("credEngineerDesc") },
    { icon: Award, title: t("credExperienceTitle"), desc: t("credExperienceDesc") },
  ];

  return (
    <main>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeading title={t("title")} subtitle={t("intro")} />

        <div className="grid gap-7 md:grid-cols-3">
          {CREDENTIALS.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-border/70 bg-card p-7 text-center shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <c.icon className="mx-auto size-10 text-brand-orange" />
              <h3 className="mt-4 font-bold text-primary">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-bold text-white">
            {t("numbersTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
            {NUMBERS.map((n) => (
              <div key={n.key}>
                <div className="text-3xl font-bold text-brand-gold">{n.value}</div>
                <div className="mt-1 text-sm text-white/85">{tHome(n.key)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
        <Users className="mx-auto size-10 text-brand-gold" />
        <h2 className="mt-4 text-2xl font-bold text-primary">{t("teamTitle")}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("teamDesc")}</p>
      </section>

      <CtaBanner />
    </main>
  );
}
