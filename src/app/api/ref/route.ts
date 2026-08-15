import { NextResponse, type NextRequest } from "next/server";
import {
  CONSENT_COOKIE,
  hasAdvertisementConsent,
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
} from "@/lib/ref-cookie";
import { parseUtmParams, serializeUtm, UTM_COOKIE } from "@/lib/utm";

// Recovers the attribution the consent gate would otherwise drop.
//
// applyRefCookie() in src/proxy.ts only sets `kkd_ref` when the request
// already carries advertisement consent. On a promo link that is never the
// first request: the visitor arrives at `/th?ref=CH001` with no consent, the
// banner appears, and when they accept, CookieYes writes its cookie in the
// browser without any new request that still carries `?ref=`. Measured on
// production 2026-08-13: the code is gone by then, and attribution is lost
// even though the visitor said yes.
//
// So the browser tells us instead — see RefConsentCapture. The consent is
// re-checked here rather than trusted from the caller: this is a public
// endpoint, and "the client said it consented" is not consent.
//
// The proxy matcher excludes `api`, so this route sets the cookie itself,
// with the same options applyRefCookie() uses.
const REF_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();

  // Shape guard the middleware doesn't need: it only ever sees codes a real
  // promo link carried, while anything on the internet can call this. A code
  // that doesn't match simply never resolves in resolveRefAttribution(), so
  // this only keeps junk out of the cookie.
  if (!ref || !REF_PATTERN.test(ref)) {
    return NextResponse.json({ ok: false, reason: "bad-ref" }, { status: 400 });
  }

  if (!hasAdvertisementConsent(req.cookies.get(CONSENT_COOKIE)?.value)) {
    return NextResponse.json({ ok: false, reason: "no-consent" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(REF_COOKIE, ref, {
    maxAge: REF_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  // Same recovery, same request: a visitor who accepted after landing on a
  // promo link carrying both `?ref=` and `?utm_*=` would otherwise lose the
  // utm set the same way `kkd_ref` was lost before this route existed — see
  // ref-consent-capture.tsx, which now reads both off the URL and sends them
  // here together. Consent was already re-checked above; no separate check
  // needed for utm since it's gated by the exact same advertisement category.
  const utm = parseUtmParams(req.nextUrl.searchParams);
  if (utm) {
    // This request is the recovery ping, not the landing page itself — the
    // landing path comes from the same-origin Referer header the browser
    // attaches to the fetch (see RefConsentCapture), falling back to
    // undefined (no landingPath stored) if it's ever missing.
    let landingPath: string | undefined;
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        landingPath = new URL(referer).pathname;
      } catch {
        landingPath = undefined;
      }
    }
    res.cookies.set(UTM_COOKIE, serializeUtm(utm, landingPath), {
      maxAge: REF_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }

  return res;
}
