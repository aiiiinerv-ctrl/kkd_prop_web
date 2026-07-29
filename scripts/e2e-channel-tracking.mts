// E2E coverage for the automatic channel-attribution mechanism (Sprint 1,
// src/proxy.ts + src/lib/ref-attribution.ts): visiting any page with
// `?ref=<code>` sets a 30-day `kkd_ref` cookie, invisible to the customer,
// and a lead submitted afterwards (with or without the cookie still present
// on the booking page itself) gets attributed to the matching
// PromoChannel/ChannelExecutive. Never previously covered by a dedicated
// script (Sprint 3 note + Sprint 9 task brief).
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { chromium } from "playwright";

import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
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
  const context = await browser.newContext();
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
  const context = await browser.newContext();
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

// --- Case 3: no ref at all -> lead stays unattributed (direct) ---
{
  const context = await browser.newContext();
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

// Cases 4-5 below deliberately avoid a 4th/5th public form submission: the
// public submit actions (submit-quote.ts/submit-survey-booking.ts) share a
// single in-memory IP rate limit (src/lib/rate-limit.ts, MAX_PER_WINDOW=5
// per 10 min, keyed by "unknown" when no x-forwarded-for header is present
// — i.e. shared across every local Playwright run hitting localhost).
// e2e-booking.mts already spends 2 of that budget and this script spends 3
// more above (exactly 5) — a 4th/5th submission here would flake against
// e2e-booking.mts run in the same window. These two cases only need cookie
// inspection (no submission) to prove their behavior; resolveRefAttribution
// (src/lib/ref-attribution.ts) is already exercised end-to-end by the three
// submission cases above.

// --- Case 4: unknown ref code -> cookie is still set (proxy.ts never
// validates the code against the DB), the DB-miss fallback to DIRECT is
// covered by src/lib/ref-attribution.ts's early-return structure (same
// function already proven above to resolve real codes correctly). ---
{
  const context = await browser.newContext();
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
  const context = await browser.newContext();
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

await browser.close();
await prisma.$disconnect();
