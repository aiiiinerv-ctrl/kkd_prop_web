// E2E coverage for the automatic channel-attribution mechanism (Sprint 1,
// src/proxy.ts + src/lib/ref-attribution.ts): visiting any page with
// `?ref=<code>` sets a 30-day `kkd_ref` cookie, invisible to the customer,
// and a lead submitted afterwards (with or without the cookie still present
// on the booking page itself) gets attributed to the matching
// PromoChannel/ChannelExecutive. Never previously covered by a dedicated
// script (Sprint 3 note + Sprint 9 task brief).
//
// Since the cookie-consent sprint, `kkd_ref` is only set once the visitor has
// agreed to advertisement cookies, so every case that expects the cookie now
// starts from a context that already carries CookieYes' consent cookie — see
// consentedContext(). Case 6 covers the other direction.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium } from "playwright";

import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const browser = await chromium.launch({ channel: "chrome", headless: true });

// Resolve real seeded ref codes from the DB rather than hardcoding
// "CH001"-style codes, since nextChannelRefCode() in prisma/seed.ts assigns
// sequentially and existing e2e-created channels can shift the numbering.
const facebookChannel = await prisma.promoChannel.findUniqueOrThrow({
  where: { slug: "facebook" },
});
const facebookExecutive = await prisma.channelExecutive.findFirstOrThrow({
  where: { channelId: facebookChannel.id },
});
const referralChannel = await prisma.promoChannel.findUniqueOrThrow({
  where: { slug: "referral" },
});

function randPhone() {
  return `09${String(Math.floor(10000000 + Math.random() * 89999999))}`;
}

// checkRateLimit() (src/lib/rate-limit.ts) keys on x-forwarded-for, which
// falls back to the literal string "unknown" when absent — the case for
// every local Playwright script hitting localhost, so this script's public
// submissions share one budget with e2e-booking.mts's when both run in the
// same verify-all window. In production every visitor has a distinct real
// IP; a documentation-range address (RFC 5737 TEST-NET-3) here just gives
// this script's submissions their own bucket, matching that reality instead
// of an artifact of not setting the header at all.
const FAKE_IP = "203.0.113.50";

// A browser that has already accepted advertisement cookies. Real visitors get
// this cookie from the CookieYes banner; here we plant it directly so these
// cases test attribution rather than the third-party banner's own UI.
async function consentedContext() {
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": FAKE_IP } });
  await context.addCookies([
    {
      name: "cookieyes-consent",
      value:
        "consentid:e2e,consent:yes,action:yes,necessary:yes,functional:no,analytics:no,performance:no,advertisement:yes,other:no",
      domain: "localhost",
      path: "/",
    },
  ]);
  return context;
}

async function submitQuoteLead(page: import("playwright").Page, name: string, phone: string) {
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="phone"]', phone);
  await page.selectOption('select[name="province"]', "กรุงเทพมหานคร");
  await page.selectOption('select[name="buildingType"]', "RESIDENTIAL");
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=ส่งข้อมูลสำเร็จ", { timeout: 15000 });
}

// --- Case 1: ref code = ChannelExecutive.refCode ("CHxxx-EXyy") -> both
// autoSourceChannelId and autoSourceExecutiveId set ---
{
  const context = await consentedContext();
  const page = await context.newPage();
  const phone = randPhone();

  // Cookie is set by proxy.ts on ANY page visit carrying ?ref=, not just the
  // booking page itself — simulate the realistic path of landing on the
  // homepage from a promo link, then navigating to booking separately.
  await page.goto(`http://localhost:3000/th?ref=${facebookExecutive.refCode}`);
  const cookiesAfterLanding = await context.cookies();
  const refCookie = cookiesAfterLanding.find((c) => c.name === "kkd_ref");
  console.log(
    `CHANNEL TRACKING: kkd_ref cookie set on ?ref= visit ${
      refCookie?.value === facebookExecutive.refCode ? "✓" : "✗ FAIL"
    }`
  );

  await page.goto("http://localhost:3000/th/booking?tab=quote");
  await submitQuoteLead(page, "ทดสอบ Ref Executive", phone);

  const lead = await prisma.lead.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  console.log(
    `CHANNEL TRACKING: executive ref attributes channel+executive ${
      lead?.autoSourceChannelId === facebookChannel.id &&
      lead?.autoSourceExecutiveId === facebookExecutive.id
        ? "✓"
        : "✗ FAIL"
    }`
  );

  await context.close();
}

// --- Case 2: ref code = PromoChannel.refCode directly (no executive) ->
// autoSourceChannelId set, autoSourceExecutiveId stays null ---
{
  const context = await consentedContext();
  const page = await context.newPage();
  const phone = randPhone();

  await page.goto(`http://localhost:3000/th/booking?tab=quote&ref=${referralChannel.refCode}`);
  await submitQuoteLead(page, "ทดสอบ Ref Channel", phone);

  const lead = await prisma.lead.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  console.log(
    `CHANNEL TRACKING: channel-only ref attributes channel without executive ${
      lead?.autoSourceChannelId === referralChannel.id && lead?.autoSourceExecutiveId === null
        ? "✓"
        : "✗ FAIL"
    }`
  );

  await context.close();
}

// --- Case 3: no ref at all -> lead stays unattributed (direct). Plain
// context, no consent cookie: this is the ordinary first-time visitor, and
// it is also the shape Case 6's visitor ends up in. ---
{
  const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": FAKE_IP } });
  const page = await context.newPage();
  const phone = randPhone();

  await page.goto("http://localhost:3000/th/booking?tab=quote");
  await submitQuoteLead(page, "ทดสอบ ไม่มี Ref", phone);

  const lead = await prisma.lead.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  console.log(
    `CHANNEL TRACKING: no ref cookie -> lead unattributed (direct) ${
      lead?.autoSourceChannelId === null && lead?.autoSourceExecutiveId === null ? "✓" : "✗ FAIL"
    }`
  );

  await context.close();
}

// Cases 4-5 below deliberately avoid further public form submissions: the
// public submit actions (submit-quote.ts/submit-survey-booking.ts) share a
// single in-memory IP rate limit (src/lib/rate-limit.ts, MAX_PER_WINDOW=5
// per 10 min, keyed by x-forwarded-for — this script's submissions above use
// FAKE_IP precisely so they don't share a budget with e2e-booking.mts's three
// submissions when both run in the same verify-all window, but there's still
// only 5 per window per IP, and this script already spends 3 of its own
// above. These two cases only need cookie inspection (no submission) to
// prove their behavior; resolveRefAttribution (src/lib/ref-attribution.ts)
// is already exercised end-to-end by the three submission cases above.

// --- Case 4: unknown ref code -> cookie is still set (proxy.ts never
// validates the code against the DB), the DB-miss fallback to DIRECT is
// covered by src/lib/ref-attribution.ts's early-return structure (same
// function already proven above to resolve real codes correctly). ---
{
  const context = await consentedContext();
  const page = await context.newPage();

  await page.goto("http://localhost:3000/th/booking?tab=quote&ref=NOT-A-REAL-CODE");
  const cookies = await context.cookies();
  const refCookie = cookies.find((c) => c.name === "kkd_ref");
  console.log(
    `CHANNEL TRACKING: unknown ref code still sets cookie (validated at attribution time, not capture time) ${
      refCookie?.value === "NOT-A-REAL-CODE" ? "✓" : "✗ FAIL"
    }`
  );

  await context.close();
}

// --- Case 5: cookie persists across a later visit without ?ref= (30-day
// stickiness, per the proxy.ts comment: "if a visitor already has a cookie
// and revisits without ?ref=, the existing cookie is left untouched") ---
{
  const context = await consentedContext();
  const page = await context.newPage();

  await page.goto(`http://localhost:3000/th?ref=${facebookChannel.refCode}`);
  // Revisit without ?ref= — cookie must survive.
  await page.goto("http://localhost:3000/th/booking?tab=quote");
  const cookiesBeforeSubmit = await context.cookies();
  const refCookie = cookiesBeforeSubmit.find((c) => c.name === "kkd_ref");
  console.log(
    `CHANNEL TRACKING: cookie persists on later visit without ?ref= ${
      refCookie?.value === facebookChannel.refCode ? "✓" : "✗ FAIL"
    }`
  );

  await context.close();
}

// --- Case 6: `?ref=` without consent -> no cookie at all, and an existing
// cookie from an earlier consented visit is left alone rather than deleted.
// The second half matters: the agreed position is that cookies set under the
// rules in force at the time expire on their own within 30 days; clearing
// them protects nobody and destroys real attribution data. No submission
// here — Case 3 already proves that a visitor with no `kkd_ref` is recorded
// as direct, and the rate-limit budget explained above is spent. ---
{
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`http://localhost:3000/th?ref=${facebookChannel.refCode}`);
  const withoutConsent = await context.cookies();
  console.log(
    `CHANNEL TRACKING: ?ref= without advertisement consent sets no kkd_ref ${
      withoutConsent.find((c) => c.name === "kkd_ref") === undefined ? "✓" : "✗ FAIL"
    }`
  );

  // Same browser, now consenting: the cookie appears...
  await context.addCookies([
    {
      name: "cookieyes-consent",
      value: "consent:yes,necessary:yes,advertisement:yes,other:no",
      domain: "localhost",
      path: "/",
    },
  ]);
  await page.goto(`http://localhost:3000/th?ref=${facebookChannel.refCode}`);
  const afterConsent = await context.cookies();
  console.log(
    `CHANNEL TRACKING: same visitor after consenting does get kkd_ref ${
      afterConsent.find((c) => c.name === "kkd_ref")?.value === facebookChannel.refCode
        ? "✓"
        : "✗ FAIL"
    }`
  );

  // ...and withdrawing consent must not wipe it.
  await context.clearCookies({ name: "cookieyes-consent" });
  await page.goto(`http://localhost:3000/th?ref=${facebookChannel.refCode}`);
  const afterWithdrawal = await context.cookies();
  console.log(
    `CHANNEL TRACKING: withdrawing consent leaves an existing kkd_ref in place ${
      afterWithdrawal.find((c) => c.name === "kkd_ref")?.value === facebookChannel.refCode
        ? "✓"
        : "✗ FAIL"
    }`
  );

  await context.close();
}

// --- Case 7: `/api/ref` recovers the attribution the banner would otherwise
// cost. This is the sequence a real promo visitor follows and Case 6 cannot
// reach: they arrive with `?ref=` and no consent, so the middleware sets
// nothing, and they accept in the browser — where no further request carries
// the code. The page then reports the code it still has in its URL, and the
// route sets the cookie only after re-checking consent server-side. ---
{
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`http://localhost:3000/th?ref=${facebookChannel.refCode}`);

  // Consent arrives client-side, exactly as the banner grants it: no
  // navigation, so the middleware never sees it.
  await context.addCookies([
    {
      name: "cookieyes-consent",
      value: "consent:yes,necessary:yes,advertisement:yes,other:no",
      domain: "localhost",
      path: "/",
    },
  ]);
  const status = await page.evaluate(async (code) => {
    const res = await fetch(`/api/ref?ref=${encodeURIComponent(code)}`, {
      credentials: "same-origin",
    });
    return res.status;
  }, facebookChannel.refCode);
  const recovered = await context.cookies();
  console.log(
    `CHANNEL TRACKING: /api/ref after in-browser consent restores kkd_ref ${
      status === 200 &&
      recovered.find((c) => c.name === "kkd_ref")?.value === facebookChannel.refCode
        ? "✓"
        : `✗ FAIL (status ${status})`
    }`
  );

  await context.close();
}

// --- Case 8: the same route refuses everything else. A public endpoint that
// sets a marketing cookie has to be uninteresting to anyone who calls it
// without consent, and unusable as a way to write arbitrary cookie values. ---
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("http://localhost:3000/th");

  // Inlined rather than pulled into a helper: tsx compiles named functions
  // with an esbuild `__name` annotation, which doesn't exist inside the page.
  const denied = await page.evaluate(async (code) => {
    const opts = { credentials: "same-origin" as const };
    return {
      noConsent: (await fetch(`/api/ref?ref=${encodeURIComponent(code)}`, opts)).status,
      noRef: (await fetch("/api/ref", opts)).status,
      junkRef: (await fetch(`/api/ref?ref=${encodeURIComponent("../../etc/passwd")}`, opts))
        .status,
    };
  }, facebookChannel.refCode);
  const after = await context.cookies();
  console.log(
    `CHANNEL TRACKING: /api/ref without consent is refused and sets nothing ${
      denied.noConsent === 403 && after.find((c) => c.name === "kkd_ref") === undefined
        ? "✓"
        : `✗ FAIL (status ${denied.noConsent})`
    }`
  );
  console.log(
    `CHANNEL TRACKING: /api/ref rejects a missing or malformed ref code ${
      denied.noRef === 400 && denied.junkRef === 400
        ? "✓"
        : `✗ FAIL (missing ${denied.noRef}, junk ${denied.junkRef})`
    }`
  );

  await context.close();
}

// --- Case 9: exec ref code + consent -> the "ผู้แนะนำ" field on the booking
// page arrives prefilled with the executive's name (resolveRefReferrerName,
// src/lib/ref-attribution.ts). No submission needed — this is a prefill
// check, not an attribution check, and the rate-limit budget is spent. ---
{
  const context = await consentedContext();
  const page = await context.newPage();

  await page.goto(`http://localhost:3000/th?ref=${facebookExecutive.refCode}`);
  await page.goto("http://localhost:3000/th/booking?tab=quote");
  const value = await page.inputValue('input[name="referrerName"]');
  console.log(
    `CHANNEL TRACKING: executive ref prefills the referrer field ${
      value === facebookExecutive.name ? "✓" : `✗ FAIL (got "${value}")`
    }`
  );

  await context.close();
}

// --- Case 10: channel-only ref code (no executive) -> referrer field stays
// empty; the channel is already captured via autoSourceChannelId and there is
// no person's name to fill in. ---
{
  const context = await consentedContext();
  const page = await context.newPage();

  await page.goto(`http://localhost:3000/th/booking?tab=quote&ref=${referralChannel.refCode}`);
  const value = await page.inputValue('input[name="referrerName"]');
  console.log(
    `CHANNEL TRACKING: channel-only ref leaves the referrer field empty ${
      value === "" ? "✓" : `✗ FAIL (got "${value}")`
    }`
  );

  await context.close();
}

// --- Case 11: no consent -> no kkd_ref cookie -> referrer field stays empty,
// even with an exec ref code in the URL. ---
{
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`http://localhost:3000/th/booking?tab=quote&ref=${facebookExecutive.refCode}`);
  const value = await page.inputValue('input[name="referrerName"]');
  console.log(
    `CHANNEL TRACKING: ref without consent leaves the referrer field empty ${
      value === "" ? "✓" : `✗ FAIL (got "${value}")`
    }`
  );

  await context.close();
}

await browser.close();
await prisma.$disconnect();
