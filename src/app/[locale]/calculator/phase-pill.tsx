import { useTranslations } from "next-intl";

/** Which mains phases a Hybrid size works with (customers cannot choose; they must see it). */
export function PhasePill({ phases }: { phases: (1 | 3)[] }) {
  const t = useTranslations("calculator");
  const text = phases.includes(1) && phases.includes(3)
    ? t("phaseSupportBoth")
    : phases.includes(1)
      ? t("phaseOnly1")
      : t("phaseOnly3");
  return (
    <span className="inline-flex items-center rounded-full border border-primary/25 bg-white px-2.5 py-0.5 text-xs font-semibold text-primary">
      {text}
    </span>
  );
}
