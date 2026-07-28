import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { REF_COOKIE, REF_COOKIE_MAX_AGE } from "@/lib/ref-cookie";

const intl = createIntlMiddleware(routing);

// Automatic channel-attribution capture (spec: "กลไกติดตามช่องทางที่มา").
// A visitor following a promo link like `?ref=CH001` or `?ref=CH001-EX01`
// gets the ref code stored in a 30-day cookie, invisible to them. If a
// visitor already has a cookie and revisits without `?ref=`, the existing
// cookie is left untouched (it persists for its full 30 days). If a new
// explicit `?ref=` shows up on a later visit, we overwrite — last-click
// wins; the spec doesn't address multi-touch conflicts, so this is a
// reasonable default rather than a confirmed requirement.
function applyRefCookie(req: NextRequest, res: NextResponse): NextResponse {
  const ref = req.nextUrl.searchParams.get("ref")?.trim();
  if (ref) {
    res.cookies.set(REF_COOKIE, ref, {
      maxAge: REF_COOKIE_MAX_AGE,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });
  }
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

  return applyRefCookie(req, intl(req));
}

export const config = {
  matcher: ["/((?!api|files|_next|_vercel|.*\\..*).*)"],
};
