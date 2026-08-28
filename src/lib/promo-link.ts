/**
 * Builds the promo link handed out for a channel or an executive under it.
 * Lives outside the admin client component because lead detail / export need
 * the exact same URL shape server-side, and a server file can't accidentally
 * import a "use client" module.
 *
 * Promo links use `?ref=` only — channel attribution rides the ref cookie, not
 * UTM params. External campaign visits can still carry `utm_*` in the URL;
 * those are captured separately via `kkd_utm` when the visitor consents.
 */
export function buildPromoLink({
  siteUrl,
  refCode,
  landingPath,
}: {
  siteUrl: string;
  refCode: string;
  landingPath: string;
}): string {
  const params = new URLSearchParams({ ref: refCode });
  return `${siteUrl}${landingPath}?${params.toString()}`;
}
