/**
 * Picks the localized column from a DB row that stores content in
 * per-locale fields (e.g. titleTh/titleEn). Falls back to Thai when the
 * English field is empty.
 */
export function pickLocale<
  T extends Record<string, unknown>,
  K extends string,
>(row: T, field: K, locale: string): string {
  const suffix = locale === "en" ? "En" : "Th";
  const value = row[`${field}${suffix}`] ?? row[`${field}Th`];
  return typeof value === "string" ? value : "";
}

/** Same as pickLocale but for Json string-array columns (features lists). */
export function pickLocaleList<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: string
): string[] {
  const suffix = locale === "en" ? "En" : "Th";
  const value = row[`${field}${suffix}`] ?? row[`${field}Th`];
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}
