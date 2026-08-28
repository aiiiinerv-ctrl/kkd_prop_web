/**
 * Page banners + header/footer logos (#107) — admin save → DB → public render → audit.
 * Mutates services banner + optional header logo; restores in finally.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const BASE = "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

function pass(msg: string) {
  console.log(`${msg} ✓`);
}

function fail(msg: string): never {
  throw new Error(`${msg} ✗ FAIL`);
}

const uploadPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const uploadDir = mkdtempSync(path.join(tmpdir(), "page-banners-e2e-"));
const uploadPath = path.join(uploadDir, "banner.png");
writeFileSync(uploadPath, uploadPng);

const settings = await prisma.siteSettings.findFirstOrThrow({
  select: { id: true, headerLogoKey: true, footerLogoKey: true },
});

const bannerBefore = await prisma.pageBanner.findUnique({
  where: { pageSlug: "services" },
  include: { slides: { orderBy: { sortOrder: "asc" } } },
});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

try {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="email"]', "admin@kkdproperty.com");
  await page.fill('input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
  pass("LOGIN");

  await page.goto(`${BASE}/admin/settings`);
  await page.locator("#st-tab-headfoot").click();
  await page.waitForSelector('input[name="headerLogo"]', { timeout: 10000 });
  pass("SETTINGS: Header/Footer tab + logo inputs");

  await page.goto(`${BASE}/admin/pages/services`);
  await page.locator("#services-tab-banner").click();
  await page.waitForSelector("#banner-mode-services", { timeout: 10000 });
  pass("BANNER: admin tab visible");

  await page.selectOption("#banner-mode-services", "FIXED");
  await page.locator("#banner-file-services-0").setInputFiles(uploadPath);
  await page.fill("#banner-alt-th-services-0", "แบนเนอร์ทดสอบ");
  await page.getByRole("tab", { name: "English" }).click();
  await page.fill("#banner-alt-en-services-0", "E2E test banner");
  await page.fill("#banner-link-services-0", "/packages");
  await page.click('button:has-text("บันทึกแบนเนอร์")');
  await page.waitForSelector("text=บันทึกแบนเนอร์หน้าบริการเรียบร้อย", { timeout: 20000 });
  pass("BANNER: save toast");

  const bannerRow = await prisma.pageBanner.findUnique({
    where: { pageSlug: "services" },
    include: { slides: true },
  });
  if (!bannerRow || bannerRow.mode !== "FIXED" || bannerRow.slides.length !== 1) {
    fail("BANNER: DB row/slides");
  }
  if (bannerRow.slides[0]?.linkPath !== "/packages") {
    fail("BANNER: linkPath not saved");
  }
  pass("BANNER: DB updated");

  const audit = await prisma.auditLog.findFirst({
    where: { entityType: "PageBanner", entityId: bannerRow.id },
    orderBy: { createdAt: "desc" },
  });
  if (!audit) fail("BANNER: audit log missing");
  pass("BANNER: audit log");

  await page.goto(`${BASE}/th/services`);
  await page.waitForSelector("section.page-banner", { timeout: 15000 });
  const html = await page.content();
  if (!html.includes("แบนเนอร์ทดสอบ")) fail("BANNER: public alt not rendered");
  pass("BANNER: public /th/services renders section");
} finally {
  await page.goto(`${BASE}/admin/pages/services`);
  await page.locator("#services-tab-banner").click();
  await page.waitForSelector("#banner-mode-services", { timeout: 10000 });
  await page.selectOption("#banner-mode-services", "OFF");
  await page.click('button:has-text("บันทึกแบนเนอร์")');
  await page.waitForSelector("text=บันทึกแบนเนอร์หน้าบริการเรียบร้อย", { timeout: 20000 });

  if (bannerBefore) {
    await prisma.pageBanner.update({
      where: { id: bannerBefore.id },
      data: { mode: bannerBefore.mode, version: bannerBefore.version },
    });
    await prisma.pageBannerSlide.deleteMany({ where: { bannerId: bannerBefore.id } });
    if (bannerBefore.slides.length > 0) {
      await prisma.pageBannerSlide.createMany({
        data: bannerBefore.slides.map((s) => ({
          id: s.id,
          bannerId: bannerBefore.id,
          sortOrder: s.sortOrder,
          imageKey: s.imageKey,
          altTh: s.altTh,
          altEn: s.altEn,
          linkPath: s.linkPath,
          isActive: s.isActive,
        })),
      });
    }
  } else {
    const row = await prisma.pageBanner.findUnique({ where: { pageSlug: "services" } });
    if (row) {
      await prisma.pageBannerSlide.deleteMany({ where: { bannerId: row.id } });
      await prisma.pageBanner.delete({ where: { id: row.id } });
    }
  }

  await prisma.siteSettings.update({
    where: { id: settings.id },
    data: {
      headerLogoKey: settings.headerLogoKey,
      footerLogoKey: settings.footerLogoKey,
    },
  });

  await browser.close();
  await prisma.$disconnect();
}

console.log("PAGE BANNERS E2E: all checks passed");
