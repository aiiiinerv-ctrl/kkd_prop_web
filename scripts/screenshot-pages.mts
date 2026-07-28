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
  await page.goto(url, { waitUntil: "networkidle" });
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

await browser.close();
