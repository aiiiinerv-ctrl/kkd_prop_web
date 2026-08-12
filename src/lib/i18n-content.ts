/**
 * Picks the localized column from a DB row that stores content in per-locale
 * fields (e.g. titleTh/titleEn). Falls back to Thai when the English field is
 * missing *or* blank — a half-translated row shows Thai on the English page
 * rather than nothing at all.
 *
 * The blank case is the one that happens in practice: the admin form requires
 * English for titles and names, but not for the optional list fields, so a
 * package saved without English features previously rendered an empty list on
 * /en while /th showed all of them.
 */
export function pickLocale<
  T extends Record<string, unknown>,
  K extends string,
>(row: T, field: K, locale: string): string {
  const suffix = locale === "en" ? "En" : "Th";
  const preferred = row[`${field}${suffix}`];
  const value =
    typeof preferred === "string" && preferred.trim() !== ""
      ? preferred
      : row[`${field}Th`];
  return typeof value === "string" ? value : "";
}

/** Same as pickLocale but for Json string-array columns (features lists). */
export function pickLocaleList<T extends Record<string, unknown>>(
  row: T,
  field: string,
  locale: string
): string[] {
  const suffix = locale === "en" ? "En" : "Th";
  const preferred = row[`${field}${suffix}`];
  const value =
    Array.isArray(preferred) && preferred.length > 0
      ? preferred
      : row[`${field}Th`];
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}
