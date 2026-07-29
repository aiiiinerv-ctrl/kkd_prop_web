import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const OUT_DIR = "screenshots";
await mkdir(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Scroll-reveal content only animates in as elements cross the viewport, so
// a straight full-page screenshot right after load would still show
// below-the-fold Reveal-wrapped sections mid-transition. Walk the page in
// viewport-height steps (matching how a scrolling user would trigger the
// IntersectionObserver) before capturing.
async function scrollThroughPage() {
  await page.evaluate(async () => {
    const step = window.innerHeight;
    let y = 0;
    const max = document.body.scrollHeight;
    while (y < max) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 200));
      y += step;
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 300));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
}

async function shoot(url: string, file: string) {
  // First-hit dev-mode route compilation can occasionally exceed the
  // default 30s "networkidle" wait (each locale/route pair recompiles
  // independently) — allow more headroom than Playwright's default here.
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await scrollThroughPage();
  await page.screenshot({ path: `${OUT_DIR}/${file}`, fullPage: true });
  console.log(`SCREENSHOT: ${url} -> ${OUT_DIR}/${file} ✓`);
}

// Public site — current real routes only (both locales)
const PUBLIC_PAGES = [
  "",
  "about",
  "services",
  "packages",
  "calculator",
  "testimonials",
  "booking",
  "contact",
  "portfolio",
];
for (const p of PUBLIC_PAGES) {
  const name = p === "" ? "home" : p;
  await shoot(`http://localhost:3000/th${p ? `/${p}` : ""}`, `${name}-th.png`);
  await shoot(`http://localhost:3000/en${p ? `/${p}` : ""}`, `${name}-en.png`);
}

// Mobile viewport — site-header with mobile nav menu OPEN
const mobilePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobilePage.goto("http://localhost:3000/th", { waitUntil: "networkidle" });
await mobilePage.click('button[aria-label="Toggle menu"]');
await mobilePage.waitForTimeout(300);
await mobilePage.screenshot({ path: `${OUT_DIR}/site-header-mobile-nav-open.png` });
console.log(`SCREENSHOT: mobile nav open -> ${OUT_DIR}/site-header-mobile-nav-open.png ✓`);
await mobilePage.close();

// Admin login page
await shoot("http://localhost:3000/admin/login", "admin-login.png");

// Sprint 9 verification — real-render screenshots for the 5 design-business
// -reviewer findings fixed this sprint (PromptPay QR amount/size, EN hardcode
// string, bookings payment-status column, reports table layout). Booking
// pages use ?tab=survey so the PromptPay QR / bank-account panel (the
// SurveyBooking tab, not the default Quote tab) is visible.
await shoot("http://localhost:3000/th/booking?tab=survey", "booking-survey-th.png");
await shoot("http://localhost:3000/en/booking?tab=survey", "booking-survey-en.png");

// Admin pages require an authenticated session. Log in as ADMIN (same
// pattern as scripts/e2e-admin.mts) on the shared `page` before shooting.
await page.goto("http://localhost:3000/admin/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', process.env.ADMIN_EMAIL ?? "admin@kkdproperty.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 15000 });
console.log("ADMIN LOGIN ✓");

await shoot("http://localhost:3000/admin/reports", "admin-reports.png");
await shoot("http://localhost:3000/admin/bookings", "admin-bookings.png");
await shoot("http://localhost:3000/admin/settings", "admin-settings.png");

// Booking detail — pull a real booking id straight from the rendered list
// page rather than hardcoding one, so the script keeps working as seed data
// changes.
await page.goto("http://localhost:3000/admin/bookings", { waitUntil: "networkidle" });
const firstBookingHref = await page
  .locator('a[href^="/admin/bookings/"]')
  .first()
  .getAttribute("href");
if (firstBookingHref) {
  await shoot(`http://localhost:3000${firstBookingHref}`, "admin-bookings-detail.png");
} else {
  console.log("SCREENSHOT: admin-bookings-detail.png SKIPPED (no booking rows found)");
}

await browser.close();
