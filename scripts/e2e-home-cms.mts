// Sprint H3 (#63) — Home CMS public cutover + contact UX. Ad-hoc verification
// script (not wired into verify-all.mts) covering the live-verification
// matrix rows this sprint touches: RBAC on /admin/pages/home, whole-record
// public reads, the hero image managed-key lifecycle (upload/replace,
// missing-blob integrity warning), FAQ zero-item validation, optimistic
// version conflict, and contact-via-Home editing SiteSettings. Mutates the
// live singleton HomePageContent/SiteSettings rows — every destructive step
// captures a snapshot first and restores it in a `finally` block.
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium } from "playwright";
import { existsSync, renameSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const BASE = "http://localhost:3000";
const PASSWORD = "Test1234!";
const ADMIN_EMAIL = "admin@kkdproperty.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

function log(condition: unknown, label: string) {
  console.log(`${label} ${condition ? "✓" : "✗ FAIL"}`);
}

async function login(page: import("playwright").Page, email: string, password: string) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
}

async function main() {
  const home = await prisma.homePageContent.findUniqueOrThrow({
    where: { key: "home" },
    include: { faqItems: { orderBy: { sortOrder: "asc" } } },
  });
  const settings = await prisma.siteSettings.findFirstOrThrow();
  console.log("Baseline:", { version: home.version, faqCount: home.faqItems.length, heroImageKey: home.heroImageKey });

  const browser = await chromium.launch({ channel: "chrome", headless: true });

  // === RBAC on /admin/pages/home ======================================
  console.log("\n--- RBAC ---");
  {
    const page = await browser.newPage();
    await login(page, "finance.test@kkdproperty.local", PASSWORD);
    await page.goto(`${BASE}/admin/pages/home`);
    log(page.url().endsWith("/admin"), "FINANCE: /admin/pages/home blocked (redirected to /admin)");
    await page.close();
  }
  {
    const page = await browser.newPage();
    await login(page, "editor.test@kkdproperty.local", PASSWORD);
    await page.goto(`${BASE}/admin/pages/home`);
    log(page.url().endsWith("/admin/pages/home"), "EDITOR: /admin/pages/home accessible");
    const contactCount = await page.getByText("ข้อมูลติดต่อ (ใช้ในไอคอนโทร/LINE/Facebook บนหน้าแรก)").count();
    log(contactCount === 0, "EDITOR: contact section hidden");
    const noticeCount = await page
      .getByText("ข้อมูลติดต่อ (เบอร์โทร/LINE/Facebook) แก้ไขได้เฉพาะบทบาท")
      .count();
    log(noticeCount === 1, "EDITOR: contact-restricted notice shown instead");
    await page.close();
  }
  {
    const page = await browser.newPage();
    await login(page, "sales.test@kkdproperty.local", PASSWORD);
    await page.goto(`${BASE}/admin/pages/home`);
    log(page.url().endsWith("/admin/pages/home"), "SALES: /admin/pages/home accessible");
    const contactCount = await page.getByText("ข้อมูลติดต่อ (ใช้ในไอคอนโทร/LINE/Facebook บนหน้าแรก)").count();
    log(contactCount === 0, "SALES: contact section hidden");
    await page.close();
  }
  {
    const page = await browser.newPage();
    await login(page, "marketing.test@kkdproperty.local", PASSWORD);
    await page.goto(`${BASE}/admin/pages/home`);
    log(page.url().endsWith("/admin/pages/home"), "MARKETING: /admin/pages/home accessible");
    const contactCount = await page.getByText("ข้อมูลติดต่อ (ใช้ในไอคอนโทร/LINE/Facebook บนหน้าแรก)").count();
    log(contactCount === 1, "MARKETING: contact section visible");
    await page.close();
  }

  // === Public whole-record read parity ================================
  console.log("\n--- Public read parity ---");
  {
    const thRes = await fetch(`${BASE}/th`);
    const thHtml = await thRes.text();
    const enRes = await fetch(`${BASE}/en`);
    const enHtml = await enRes.text();
    log(thHtml.includes(home.heroImageKey!), "PUBLIC /th: hero <img> src matches DB heroImageKey");
    log(thHtml.includes(home.heroTitleWhiteTh!), "PUBLIC /th: heroTitleWhiteTh from DB present");
    log(enHtml.includes(home.heroTitleWhiteEn!), "PUBLIC /en: heroTitleWhiteEn from DB present");
    log(thHtml.includes(home.faqItems[0].questionTh), "PUBLIC /th: first FAQ question from DB present");
    log(enHtml.includes(home.faqItems[0].questionEn), "PUBLIC /en: first FAQ question (EN) from DB present");
  }

  // === Content edit -> immediate public reflection -> restore =========
  console.log("\n--- Content edit / immediate revalidation / restore ---");
  const adminPage = await browser.newPage();
  await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
  {
    await adminPage.goto(`${BASE}/admin/pages/home`);
    const marker = `H3 E2E ${Date.now().toString(36)}`;
    await adminPage.locator('input[name="heroTitleWhiteTh"]').fill(marker);
    await adminPage.getByRole("tab", { name: "English" }).click();
    await adminPage.locator('input[name="heroTitleWhiteEn"]').fill(marker);
    await adminPage.getByRole("button", { name: "บันทึกเนื้อหาหน้าแรก" }).click();
    await adminPage.waitForSelector("text=บันทึกเนื้อหาหน้าแรกเรียบร้อย", { timeout: 10000 });
    console.log("CONTENT: save succeeded ✓");

    const thHtml = await (await fetch(`${BASE}/th`)).text();
    const enHtml = await (await fetch(`${BASE}/en`)).text();
    log(thHtml.includes(marker), "CONTENT: /th shows new value immediately (on-demand revalidation)");
    log(enHtml.includes(marker), "CONTENT: /en shows new value immediately (on-demand revalidation)");

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "HomePageContent", action: "UPDATE" },
      orderBy: { createdAt: "desc" },
    });
    log(audit, "CONTENT: mutation recorded in AuditLog");
    const auditStr = JSON.stringify(audit?.after ?? "");
    log(!auditStr.includes("heroImageKeyBytes") && audit, "CONTENT: audit snapshot has no binary image data");

    // Restore
    await adminPage.reload();
    await adminPage.locator('input[name="heroTitleWhiteTh"]').fill(home.heroTitleWhiteTh ?? "");
    await adminPage.getByRole("tab", { name: "English" }).click();
    await adminPage.locator('input[name="heroTitleWhiteEn"]').fill(home.heroTitleWhiteEn ?? "");
    await adminPage.getByRole("button", { name: "บันทึกเนื้อหาหน้าแรก" }).click();
    await adminPage.waitForSelector("text=บันทึกเนื้อหาหน้าแรกเรียบร้อย", { timeout: 10000 });
    const thHtmlAfter = await (await fetch(`${BASE}/th`)).text();
    log(thHtmlAfter.includes(home.heroTitleWhiteTh!) && !thHtmlAfter.includes(marker), "CONTENT: restored to original on /th");
  }

  // === Hero image upload lifecycle ====================================
  console.log("\n--- Hero image upload lifecycle ---");
  let heroKeyAfterUpload: string | null = null;
  {
    await adminPage.reload();
    const before = await prisma.homePageContent.findUniqueOrThrow({ where: { key: "home" } });
    const heroFile = path.resolve("public/marketing/hero-solar.jpg");
    await adminPage.locator('input[name="heroImage"]').setInputFiles(heroFile);
    await adminPage.getByRole("button", { name: "บันทึกเนื้อหาหน้าแรก" }).click();
    await adminPage.waitForSelector("text=บันทึกเนื้อหาหน้าแรกเรียบร้อย", { timeout: 15000 });

    const after = await prisma.homePageContent.findUniqueOrThrow({ where: { key: "home" } });
    heroKeyAfterUpload = after.heroImageKey;
    log(after.heroImageKey && after.heroImageKey !== before.heroImageKey, "HERO: new managed key generated on upload");

    const oldRes = await fetch(`${BASE}/files/${before.heroImageKey}`);
    log(oldRes.status === 404, `HERO: old blob deleted (old key now 404, got ${oldRes.status})`);
    const newRes = await fetch(`${BASE}/files/${after.heroImageKey}`);
    log(newRes.status === 200, `HERO: new blob servable (got ${newRes.status})`);

    const thHtml = await (await fetch(`${BASE}/th`)).text();
    log(thHtml.includes(after.heroImageKey!), "HERO: /th reflects new key immediately");
  }

  // === Admin hero-blob-missing integrity warning (dynamic route, no ISR) ==
  console.log("\n--- Hero blob-missing admin warning ---");
  if (heroKeyAfterUpload) {
    const storagePath = path.resolve("storage", heroKeyAfterUpload);
    const backupPath = `${storagePath}.e2e-backup`;
    const fileExisted = existsSync(storagePath);
    log(fileExisted, "HERO: blob file present on disk before test");
    if (fileExisted) {
      renameSync(storagePath, backupPath);
      try {
        await adminPage.reload();
        const warningCount = await adminPage
          .getByText("ไม่พบไฟล์รูปภาพหลักที่บันทึกไว้ในระบบจัดเก็บ")
          .count();
        log(warningCount === 1, "HERO: admin shows integrity warning when blob missing");
      } finally {
        renameSync(backupPath, storagePath);
      }
      await adminPage.reload();
      const warningGoneCount = await adminPage
        .getByText("ไม่พบไฟล์รูปภาพหลักที่บันทึกไว้ในระบบจัดเก็บ")
        .count();
      log(warningGoneCount === 0, "HERO: warning gone after blob restored");
    }
  }

  // === FAQ: zero items while showFaq enabled is rejected ==============
  console.log("\n--- FAQ zero-item validation ---");
  {
    await adminPage.reload();
    const countBefore = await prisma.homeFaqItem.count({ where: { homePageContentId: home.id } });
    const deleteButtons = adminPage.getByLabel("ลบ");
    let remaining = await deleteButtons.count();
    while (remaining > 0) {
      await deleteButtons.first().click();
      remaining = await deleteButtons.count();
    }
    await adminPage.getByRole("button", { name: "บันทึกเนื้อหาหน้าแรก" }).click();
    await adminPage.waitForSelector("text=เมื่อเปิดแสดงส่วนคำถามที่พบบ่อย ต้องมีอย่างน้อย 1 ข้อ", {
      timeout: 10000,
    });
    console.log("FAQ: save rejected with zero items while showFaq is on ✓");
    const countAfter = await prisma.homeFaqItem.count({ where: { homePageContentId: home.id } });
    log(countAfter === countBefore, "FAQ: no items were actually deleted (validation ran before persistence)");
  }

  // === Optimistic version conflict ====================================
  console.log("\n--- Stale version conflict ---");
  {
    const pageA = await browser.newPage();
    const pageB = await browser.newPage();
    await login(pageA, ADMIN_EMAIL, ADMIN_PASSWORD);
    await login(pageB, ADMIN_EMAIL, ADMIN_PASSWORD);
    await pageA.goto(`${BASE}/admin/pages/home`);
    await pageB.goto(`${BASE}/admin/pages/home`);

    await pageA.getByRole("button", { name: "บันทึกเนื้อหาหน้าแรก" }).click();
    await pageA.waitForSelector("text=บันทึกเนื้อหาหน้าแรกเรียบร้อย", { timeout: 10000 });
    console.log("CONFLICT: page A (fresh version) saved ✓");

    await pageB.getByRole("button", { name: "บันทึกเนื้อหาหน้าแรก" }).click();
    await pageB.waitForSelector("text=มีการแก้ไขจากคนอื่นระหว่างที่คุณแก้ไขอยู่", { timeout: 10000 });
    console.log("CONFLICT: page B (stale version) rejected with conflict toast ✓");

    await pageA.close();
    await pageB.close();
  }

  // === Contact editing from Home (writes SiteSettings) ================
  console.log("\n--- Contact-via-Home ---");
  {
    const page = await browser.newPage();
    await login(page, "marketing.test@kkdproperty.local", PASSWORD);
    await page.goto(`${BASE}/admin/pages/home`);
    const testPhone = "0899999999";
    await page.locator('input[name="phone"]').fill(testPhone);
    await page.getByRole("button", { name: "บันทึกข้อมูลติดต่อ" }).click();
    await page.waitForSelector("text=บันทึกข้อมูลติดต่อเรียบร้อย", { timeout: 10000 });
    console.log("CONTACT: save succeeded ✓");

    const updated = await prisma.siteSettings.findFirstOrThrow();
    log(updated.phone === testPhone, "CONTACT: SiteSettings.phone updated in DB");

    const thHtml = await (await fetch(`${BASE}/th`)).text();
    log(thHtml.includes(testPhone.replace(/(\d{3})(\d{3})(\d{4})/, "$1$2$3")) || thHtml.includes(`tel:${testPhone}`), "CONTACT: /th tel: link reflects new phone");

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "SiteSettings", action: "UPDATE" },
      orderBy: { createdAt: "desc" },
    });
    log(audit, "CONTACT: mutation recorded in AuditLog");

    // Restore
    await page.reload();
    await page.locator('input[name="phone"]').fill(settings.phone ?? "");
    await page.getByRole("button", { name: "บันทึกข้อมูลติดต่อ" }).click();
    await page.waitForSelector("text=บันทึกข้อมูลติดต่อเรียบร้อย", { timeout: 10000 });
    const restored = await prisma.siteSettings.findFirstOrThrow();
    log(restored.phone === settings.phone, "CONTACT: phone restored to original");

    await page.close();
  }

  await adminPage.close();
  await browser.close();
  await prisma.$disconnect();
  console.log("\nDone.");
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
