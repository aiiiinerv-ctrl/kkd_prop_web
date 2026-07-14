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

// Public site — home page in both locales
await shoot("http://localhost:3000/th", "home-th.png");
await shoot("http://localhost:3000/en", "home-en.png");

// Public site — theme preview routes (both locales)
const THEME_NUMBERS = [1, 2, 3, 4, 5, 6];
for (const n of THEME_NUMBERS) {
  await shoot(`http://localhost:3000/th/theme-${n}`, `theme-${n}-th.png`);
  await shoot(`http://localhost:3000/en/theme-${n}`, `theme-${n}-en.png`);
}

// Public site — Phase 6 rollout pages (both locales)
const PUBLIC_PAGES = [
  "about",
  "services",
  "packages",
  "portfolio",
  "booking",
  "calculator",
  "contact",
];
for (const p of PUBLIC_PAGES) {
  await shoot(`http://localhost:3000/th/${p}`, `${p}-th.png`);
  await shoot(`http://localhost:3000/en/${p}`, `${p}-en.png`);
}

// Admin login page
await shoot("http://localhost:3000/admin/login", "admin-login.png");

// Log in, then capture the dashboard
await page.goto("http://localhost:3000/admin/login");
await page.fill('input[name="email"]', "admin@kkdproperty.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 15000 });
await page.waitForSelector("text=แดชบอร์ด", { timeout: 10000 });
await shoot("http://localhost:3000/admin", "admin-dashboard.png");

// Admin — Phase 6 rollout pages
const ADMIN_PAGES = [
  ["leads", "Leads"],
  ["packages", "Packages"],
  ["services", "Services"],
  ["portfolio", "Portfolio"],
  ["channels", "Channels"],
  ["audit", "Audit"],
  ["users", "Users"],
] as const;
for (const [slug] of ADMIN_PAGES) {
  await shoot(`http://localhost:3000/admin/${slug}`, `admin-${slug}.png`);
}

await browser.close();
