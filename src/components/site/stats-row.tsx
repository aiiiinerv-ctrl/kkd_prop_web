import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/site/reveal";

const STATS = [
  { valueKey: "statsProjectsValue", labelKey: "statsProjects" },
  { valueKey: "statsYearsValue", labelKey: "statsYears" },
  { valueKey: "statsEngineersValue", labelKey: "statsEngineers" },
  { valueKey: "statsSatisfactionValue", labelKey: "statsSatisfaction" },
] as const;

export async function StatsRow() {
  const t = await getTranslations("home");

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
        {STATS.map((stat, i) => (
          <Reveal key={stat.valueKey} delay={i * 100} className="text-center">
            <p className="text-3xl font-extrabold tracking-[-0.01em] text-primary sm:text-4xl">
              {t(stat.valueKey)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t(stat.labelKey)}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
