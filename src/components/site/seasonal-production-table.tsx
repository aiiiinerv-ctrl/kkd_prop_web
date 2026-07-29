import { SEASON_KEYS, type Seasonal, formatSeasonRange } from "@/lib/packages-seasonal";

/** Renders the "ผลิตไฟเฉลี่ย/วัน" table for one package's seasonalProduction JSON. */
export function SeasonalProductionTable({
  seasonal,
  locale,
  t,
  tCommon,
}: {
  seasonal: Seasonal;
  locale: string;
  t: (key: string) => string;
  tCommon: (key: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-primary text-white">
            <th className="border border-border px-4 py-2.5 font-semibold">{t("colSeason")}</th>
            <th className="border border-border px-4 py-2.5 font-semibold">{t("colMonths")}</th>
            <th className="border border-border px-4 py-2.5 font-semibold">{t("colProduction")}</th>
          </tr>
        </thead>
        <tbody>
          {SEASON_KEYS.map(([dataKey, labelKey]) => {
            const row = seasonal[dataKey];
            if (!row) return null;
            return (
              <tr key={dataKey} className="text-center even:bg-muted/40">
                <td className="border border-border px-4 py-2.5">{t(labelKey)}</td>
                <td className="border border-border px-4 py-2.5">
                  {locale === "en" ? row.monthsEn : row.monthsTh}
                </td>
                <td className="border border-border px-4 py-2.5">
                  {formatSeasonRange(row)} {tCommon("unitsPerDay")}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
