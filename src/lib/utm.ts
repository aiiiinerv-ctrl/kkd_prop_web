// Shared between src/proxy.ts (edge middleware, no Prisma access) and
// server actions that resolve the cookie into columns on a Lead — the same
// split as src/lib/ref-cookie.ts, which this deliberately mirrors rather than
// merges into (see resolveUtmAttribution() in src/lib/ref-attribution.ts for
// why the two systems stay separate).
export const UTM_COOKIE = "kkd_utm";

// The 5 standard UTM params, per the SA taxonomy (docs/plans/
// sa-channel-taxonomy-utm-tasks.md). Anything outside this whitelist is
// dropped rather than stored — an attacker-controlled query string is not a
// place to accept arbitrary keys into a cookie that later lands in the DB.
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export type UtmParams = Record<UtmKey, string>;

const MAX_LEN = 120;

/**
 * Reads the 5 whitelisted utm_* params off a URLSearchParams, trims each
 * value to 120 chars (matching the Lead column width, VarChar(120)), and
 * drops the whole set if `utm_source` is missing — a lone utm_content or
 * utm_campaign with no utm_source isn't a real campaign link, it's noise
 * (e.g. someone pasting a URL with a stray param), and storing it would
 * misattribute a lead to "some campaign" with no source to report against.
 */
export function parseUtmParams(searchParams: URLSearchParams): UtmParams | null {
  const source = searchParams.get("utm_source")?.trim().slice(0, MAX_LEN);
  if (!source) return null;

  const result = { utm_source: source } as UtmParams;
  for (const key of UTM_KEYS) {
    if (key === "utm_source") continue;
    const value = searchParams.get(key)?.trim().slice(0, MAX_LEN);
    if (value) result[key] = value;
  }
  return result;
}

// `landingPath` rides in the same cookie value as the utm params rather than
// its own cookie (Default #5: one cookie for the whole utm set) — it's the
// path of the request that captured this utm set, so it's written alongside
// the params by whichever caller captures them (src/proxy.ts for the normal
// case, src/app/api/ref/route.ts for the consent-recovery path).
export type UtmCookiePayload = UtmParams & { landingPath?: string };

export function serializeUtm(params: UtmParams, landingPath?: string): string {
  const payload: UtmCookiePayload = landingPath ? { ...params, landingPath } : params;
  return JSON.stringify(payload);
}

/**
 * Parses the `kkd_utm` cookie value back into UtmCookiePayload. Never
 * throws — a malformed or stale cookie value (e.g. from an older cookie
 * shape) just means "no utm data", the same as a missing cookie.
 */
export function parseUtmCookie(cookieValue: string | undefined): UtmCookiePayload | null {
  if (!cookieValue) return null;
  try {
    const parsed: unknown = JSON.parse(cookieValue);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as Record<string, unknown>).utm_source !== "string"
    ) {
      return null;
    }
    return parsed as UtmCookiePayload;
  } catch {
    return null;
  }
}
