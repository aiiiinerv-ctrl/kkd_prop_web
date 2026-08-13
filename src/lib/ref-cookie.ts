// Shared between src/proxy.ts (edge middleware, no Prisma access) and
// server actions that resolve the cookie to a PromoChannel/ChannelExecutive.
export const REF_COOKIE = "kkd_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Where CookieYes records what the visitor agreed to. Its value is a flat
// string of comma-separated `key:value` pairs, e.g.
// `consentid:abc123,consent:yes,necessary:yes,analytics:no,advertisement:yes,other:no`
// sometimes wrapped in leading/trailing commas.
export const CONSENT_COOKIE = "cookieyes-consent";

/**
 * Whether the visitor has agreed to advertisement cookies.
 *
 * `kkd_ref` is a marketing cookie, so it needs consent — but CookieYes can
 * only block scripts it sees running in the browser, and `kkd_ref` is set by
 * the middleware before any of the page reaches the client. Nothing on the
 * CookieYes side can stop it, so the gate has to live in our own code; see
 * applyRefCookie() in src/proxy.ts.
 *
 * Absent or unparseable cookie means no consent. Never assume yes.
 *
 * Split on commas rather than searching for the `,advertisement:yes,`
 * substring: the pair is not guaranteed to have a comma on both sides, and a
 * substring miss here fails silently — the visitor consents, attribution
 * quietly never records, and nothing anywhere says why.
 */
export function hasAdvertisementConsent(value: string | undefined): boolean {
  if (!value) return false;
  return decodeURIComponent(value)
    .split(",")
    .some((pair) => pair.trim() === "advertisement:yes");
}
