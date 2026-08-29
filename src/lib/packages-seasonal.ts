// Shared shape/formatting for a Package's `seasonalProduction` JSON field.
// Used by both the packages list page and the package detail page.

export type SeasonRow = {
  monthsTh: string;
  monthsEn: string;
  unitsPerDayMin: number;
  unitsPerDayMax: number;
};

export type Seasonal = Record<"summer" | "earlyRainy" | "rainy" | "winter", SeasonRow>;

export const SEASON_KEYS = [
  ["summer", "seasonSummer"],
  ["earlyRainy", "seasonEarlyRainy"],
  ["rainy", "seasonRainy"],
  ["winter", "seasonWinter"],
] as const;

export type SeasonalBaseline = {
  summer: number;
  earlyRainy: number;
  rainy: number;
  winter: number;
};

/**
 * Average daily production by season, scaled from `baseline` — admin-editable
 * numbers measured at a 5kW reference system (`PackagesPageContent.seasonalBaseline*`).
 */
export function seasonalProduction(sizeKw: number, baseline: SeasonalBaseline): Seasonal {
  const scale = sizeKw / 5;
  const day = (units: number) => Math.round(units * scale);
  return {
    summer: {
      monthsTh: "มี.ค. - พ.ค.",
      monthsEn: "Mar - May",
      unitsPerDayMin: day(baseline.summer),
      unitsPerDayMax: day(baseline.summer),
    },
    earlyRainy: {
      monthsTh: "มิ.ย. - ก.ค.",
      monthsEn: "Jun - Jul",
      unitsPerDayMin: day(baseline.earlyRainy),
      unitsPerDayMax: day(baseline.earlyRainy),
    },
    rainy: {
      monthsTh: "ส.ค. - ต.ค.",
      monthsEn: "Aug - Oct",
      unitsPerDayMin: day(baseline.rainy),
      unitsPerDayMax: day(baseline.rainy),
    },
    winter: {
      monthsTh: "พ.ย. - ก.พ.",
      monthsEn: "Nov - Feb",
      unitsPerDayMin: day(baseline.winter),
      unitsPerDayMax: day(baseline.winter),
    },
  };
}

/** "~20" when min===max (summer), otherwise "12-14". */
export function formatSeasonRange(row: SeasonRow): string {
  return row.unitsPerDayMin === row.unitsPerDayMax
    ? `~${row.unitsPerDayMin}`
    : `${row.unitsPerDayMin}-${row.unitsPerDayMax}`;
}
