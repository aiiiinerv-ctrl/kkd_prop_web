import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/site/reveal";

const STATS = [
  { valueKey: "statsProjectsValue", labelKey: "statsProjects" },
  { valueKey: "statsYearsValue", labelKey: "statsYears" },
  { valueKey: "statsEngineersValue", labelKey: "statsEngineers" },
  { valueKey: "statsCustomersValue", labelKey: "statsCustomers" },
] as const;

type OverridableStatKey =
  | "statsProjectsValue"
  | "statsCustomersValue"
  | "statsYearsValue"
  | "statsEngineersValue";

/**
 * Grid columns adapt to how many stats actually render — Tailwind classes
 * must be written out in full (not built with template strings) so the v4
 * scanner picks them up.
 */
const GRID_COLS_BY_COUNT: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
};

export async function StatsRow({
  overrides,
}: {
  /**
   * Real DB-derived numbers that replace the placeholder message-file value.
   * A key mapped to `null` means "no real data yet" — that stat item is
   * skipped entirely rather than falling back to the message-file `—`
   * placeholder, so the page never shows a number that contradicts reality.
   */
  overrides?: Partial<Record<OverridableStatKey, string | null>>;
} = {}) {
  const t = await getTranslations("home");

  const visibleStats = STATS.filter((stat) => {
    const key = stat.valueKey as OverridableStatKey;
    return !(key in (overrides ?? {}) && overrides?.[key] === null);
  });

  if (visibleStats.length === 0) return null;

  const gridColsClass =
    GRID_COLS_BY_COUNT[visibleStats.length] ?? GRID_COLS_BY_COUNT[4];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
      <div className={`grid gap-6 ${gridColsClass}`}>
        {visibleStats.map((stat, i) => (
          <Reveal key={stat.valueKey} delay={i * 100} className="text-center">
            <p className="text-3xl font-extrabold tracking-[-0.01em] text-primary sm:text-4xl">
              {overrides?.[stat.valueKey as OverridableStatKey] ?? t(stat.valueKey)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t(stat.labelKey)}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
