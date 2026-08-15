import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import {
  CONSENT_COOKIE,
  hasAdvertisementConsent,
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
} from "@/lib/ref-cookie";
import { parseUtmParams, serializeUtm, UTM_COOKIE } from "@/lib/utm";

const intl = createIntlMiddleware(routing);

// Automatic channel-attribution capture (spec: "กลไกติดตามช่องทางที่มา").
// A visitor following a promo link like `?ref=CH001` or `?ref=CH001-EX01`
// gets the ref code stored in a 30-day cookie, invisible to them. If a
// visitor already has a cookie and revisits without `?ref=`, the existing
// cookie is left untouched (it persists for its full 30 days). If a new
// explicit `?ref=` shows up on a later visit, we overwrite — last-click
// wins; the spec doesn't address multi-touch conflicts, so this is a
// reasonable default rather than a confirmed requirement.
//
// This is a marketing cookie, so it waits for consent. CookieYes runs the
// banner but cannot gate this one itself: it blocks scripts in the browser,
// and this cookie is set here, server-side, before the page exists. So the
// check has to be ours. A visitor who has not agreed to the advertisement
// category simply doesn't get the cookie — we don't stash the code anywhere
// else in the meantime, and we never delete a cookie set earlier under the
// rules that applied then; those expire on their own within 30 days.
function applyRefCookie(req: NextRequest, res: NextResponse): NextResponse {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  if (!ref) return res;
  if (!hasAdvertisementConsent(req.cookies.get(CONSENT_COOKIE)?.value)) {
    return res;
  }
  res.cookies.set(REF_COOKIE, ref, {
    maxAge: REF_COOKIE_MAX_AGE,
    // Only resolveRefAttribution() reads this, always on the server — nothing
    // in the browser needs it, and leaving it readable let a page script forge
    // its own attribution.
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}

// UTM campaign-tracking capture — a parallel system to applyRefCookie()
// above, not a merge into it (docs/plans/sa-channel-taxonomy-utm-tasks.md
// Default #1: `kkd_ref` is per-channel/per-person attribution, UTM is
// campaign tracking; they stay separate columns and separate cookies, and
// `ref` alone decides channel counting in reports).
//
// Same consent rule as `kkd_ref` (Q2 in the plan: gate identically, one PDPA
// standard for the whole site) and the same last-touch semantics: a new
// valid utm_* set overwrites whatever was there, written as one cookie value
// so a later read can never mix utm_source from one campaign with
// utm_campaign from another.
function applyUtmCookie(req: NextRequest, res: NextResponse): NextResponse {
  const utm = parseUtmParams(req.nextUrl.searchParams);
  if (!utm) return res;
  if (!hasAdvertisementConsent(req.cookies.get(CONSENT_COOKIE)?.value)) {
    return res;
  }
  res.cookies.set(UTM_COOKIE, serializeUtm(utm, req.nextUrl.pathname), {
    maxAge: REF_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin")) {
    // Optimistic redirect only — every admin page and action re-checks the
    // session server-side via requireAdmin().
    const sessionCookie =
      req.cookies.get("authjs.session-token") ??
      req.cookies.get("__Secure-authjs.session-token");
    if (pathname !== "/admin/login" && !sessionCookie) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next();
  }

  return applyUtmCookie(req, applyRefCookie(req, intl(req)));
}

export const config = {
  matcher: ["/((?!api|files|_next|_vercel|.*\\..*).*)"],
};
