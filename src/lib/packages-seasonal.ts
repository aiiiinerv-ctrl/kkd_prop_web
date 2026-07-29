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

/** "~20" when min===max (summer), otherwise "12-14". */
export function formatSeasonRange(row: SeasonRow): string {
  return row.unitsPerDayMin === row.unitsPerDayMax
    ? `~${row.unitsPerDayMin}`
    : `${row.unitsPerDayMin}-${row.unitsPerDayMax}`;
}
