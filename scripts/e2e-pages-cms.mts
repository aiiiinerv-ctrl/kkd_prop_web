/**
 * Pages CMS Sprint 11 — focused production-mode browser checks.
 * Requires `npm run start` on port 3000 (or set PAGES_CMS_BASE_URL).
 *
 * Usage: npx tsx scripts/e2e-pages-cms.mts
 */
import "dotenv/config";
import { chromium } from "playwright";

const BASE = (process.env.PAGES_CMS_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const PUBLIC_SLUGS = ["", "about", "services", "packages", "portfolio", "calculator"] as const;
const PAGE_KEYS = ["home", "about", "services", "packages", "portfolio", "calculator"] as const;

const LEGACY_ADMIN_REDIRECTS: { from: string; expectPath: string }[] = [
  { from: "/admin/content/about", expectPath: "/admin/pages/about" },
  { from: "/admin/services", expectPath: "/admin/pages/services" },
  { from: "/admin/packages", expectPath: "/admin/pages/packages" },
  { from: "/admin/portfolio", expectPath: "/admin/pages/portfolio" },
];


let failed = 0;

function pass(label: string) {
  console.log(`${label} ✓`);
}

function fail(label: string, detail?: string) {
  failed += 1;
  console.log(`${label} ✗ FAIL${detail ? ` (${detail})` : ""}`);
}

async function loginAdmin(page: import("playwright").Page) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="email"]', process.env.ADMIN_EMAIL ?? "admin@kkdproperty.com");
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // --- Public routes (12) — warm twice per matrix ---
  for (const slug of PUBLIC_SLUGS) {
    for (const locale of ["th", "en"] as const) {
      const path = slug ? `/${locale}/${slug}` : `/${locale}`;
      for (let passNum = 1; passNum <= 2; passNum++) {
        const res = await fetch(`${BASE}${path}`);
        if (res.status !== 200) {
          fail(`PUBLIC warm ${passNum}`, `${path} -> ${res.status}`);
        }
      }
      const html = await (await fetch(`${BASE}${path}`)).text();
      if (html.length < 500) fail(`PUBLIC body`, `${path} suspiciously short`);
      else pass(`PUBLIC ${path} 200`);
    }
  }

  // --- sitemap + robots ---
  const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
  if (sitemapRes.status !== 200) {
    fail("SITEMAP", `status ${sitemapRes.status}`);
  } else {
    const sitemapXml = await sitemapRes.text();
    const locCount = (sitemapXml.match(/<loc>/g) ?? []).length;
    if (!sitemapXml.includes("/th/calculator") || !sitemapXml.includes("/en/calculator")) {
      fail("SITEMAP", "missing calculator locales");
    } else if (locCount < 12) {
      fail("SITEMAP", `only ${locCount} loc entries`);
    } else {
      pass(`SITEMAP ${locCount} entries incl. calculator`);
    }
  }

  const robotsRes = await fetch(`${BASE}/robots.txt`);
  if (robotsRes.status !== 200) fail("ROBOTS", `status ${robotsRes.status}`);
  else pass("ROBOTS 200");

  // --- Unauthenticated admin guard ---
  for (const path of ["/admin/pages/home", "/admin/pages/calculator", ...LEGACY_ADMIN_REDIRECTS.map((r) => r.from)]) {
    const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
    const loc = res.headers.get("location") ?? "";
    const ok = res.status === 307 && loc.includes("/admin/login");
    if (ok) pass(`UNAUTH ${path} -> login`);
    else fail(`UNAUTH ${path}`, `status ${res.status} location ${loc}`);
  }

  const page = await browser.newPage();
  await loginAdmin(page);
  pass("ADMIN login");

  // --- Legacy 307 after auth ---
  for (const { from, expectPath } of LEGACY_ADMIN_REDIRECTS) {
    const res = await page.request.get(`${BASE}${from}`, { maxRedirects: 0 });
    const loc = res.headers()["location"] ?? "";
    if (res.status() === 307 && loc.includes(expectPath)) {
      pass(`LEGACY 307 ${from} -> ${expectPath}`);
    } else {
      fail(`LEGACY 307 ${from}`, `status ${res.status()} location ${loc}`);
    }
  }

  // --- Six canonical admin routes ---
  for (const key of PAGE_KEYS) {
    await page.goto(`${BASE}/admin/pages/${key}`);
    const ok = page.url().includes(`/admin/pages/${key}`);
    if (ok) pass(`ADMIN /admin/pages/${key} renders`);
    else fail(`ADMIN /admin/pages/${key}`, `url ${page.url()}`);
  }

  // --- Settings SEO tab removed entirely (admin no longer edits page SEO here) ---
  await page.goto(`${BASE}/admin/settings`);
  await page.waitForSelector("text=ตั้งค่าระบบ", { timeout: 10000 });
  const seoTabCount = await page.locator("#st-tab-seo").count();
  if (seoTabCount === 0) pass("SETTINGS no SEO / Meta tab");
  else fail("SETTINGS no SEO / Meta tab", "still present");

  await page.close();
  await browser.close();

  if (failed > 0) {
    console.error(`\n${failed} Pages CMS check(s) failed`);
    process.exit(1);
  }
  console.log("\nAll Pages CMS e2e checks passed ✓");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
