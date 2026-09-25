// E2E for the S6 admin calculator tab: the trimmed ×10/slider form and the
// "ตารางขนาดระบบ (Excel)" card (upload → preview → apply/reject/duplicate →
// rollback → reset), plus role restriction and audit trail — and S7 public
// calculator checks after apply/reset. See
// docs/plans/calculator-excel-import-sprints.md S6/S7 and
// docs/plans/calculator-excel-import-admin-ui-spec.md.
//
// Server must be running (`npm run start`, production mode) before this
// script runs. Fixtures are synthesized in memory (never the real sales
// Excel file) and written to a scratch temp file per upload — Playwright's
// `setInputFiles` needs a path on disk.
import "dotenv/config";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium, type Page } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { CALCULATOR_DEFAULTS } from "../src/lib/calculator.js";
import {
  buildOnGridFixture,
  goodRows,
  withMacroEntry,
  type FixtureRow,
} from "./lib/calculator-import-fixtures.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

function pass(msg: string) {
  console.log(`${msg} ✓`);
}

function fail(msg: string): never {
  throw new Error(`${msg} ✗ FAIL`);
}

async function captureState(page: Page, name: string) {
  if (!process.env.SCREENSHOT_DIR) return;
  await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `s6-${name}-mobile.png`), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

async function assertConfirmKeyboard(page: Page, trigger: string, confirm: string) {
  await page.waitForFunction((id) => document.activeElement?.id === id, confirm);
  await page.keyboard.press("Escape");
  await page.waitForFunction((id) => document.activeElement?.id === id, trigger);
  await page.locator(`#${trigger}`).click();
  await page.waitForFunction((id) => document.activeElement?.id === id, confirm);
}

async function writeTempXlsx(buf: Buffer, name: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "kkd-calc-e2e-"));
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, buf);
  return filePath;
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/admin/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
}

async function openConfigTab(page: Page) {
  await page.goto(`${BASE_URL}/admin/pages/calculator`);
  await page.locator("#calculator-tab-config").click();
  await page.waitForSelector("#calculator-tab-config[data-active]", { timeout: 10000 });
  await page.waitForSelector("#calc-annual-mult", { state: "visible", timeout: 10000 });
}

/** S7: set the public bill field and read the recommendation panel text. */
async function publicCalcBody(page: Page, locale: "th" | "en", bill: number): Promise<string> {
  await page.goto(`${BASE_URL}/${locale}/calculator`);
  await page.waitForSelector("#monthly-bill", { timeout: 15000 });
  await page.fill("#monthly-bill", String(bill));
  await page.locator("#monthly-bill").blur();
  // Client state updates synchronously; give a tick for React to paint.
  await page.waitForTimeout(200);
  return page.locator("body").innerText();
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

await login(page, "admin@kkdproperty.com", ADMIN_PASSWORD);
pass("LOGIN");

await openConfigTab(page);
pass("CALC CONFIG: admin tab visible (trimmed form)");

// Start deterministically even when an earlier run stopped after applying a table.
await page.click("#calc-reset");
await assertConfirmKeyboard(page, "calc-reset", "calc-reset-confirm");
await captureState(page, "reset-confirm");
await page.click("#calc-reset-confirm");
await page.waitForSelector("text=คืนค่าเริ่มต้นแล้ว");
await openConfigTab(page);
await page.locator("#calc-size-table-summary").filter({ hasText: "ค่าเริ่มต้น" }).waitFor();
await page.waitForFunction(() => (document.querySelector("#calc-annual-mult") as HTMLInputElement)?.value === "10");

// --- The old per-row / threshold fields are gone ---
const oldFieldGone = await page.locator("#calc-sun-hours").count();
if (oldFieldGone !== 0) fail("CALC CONFIG: old sunHoursPerDay field should be removed");
pass("CALC CONFIG: old sun-hours/threshold fields removed from form");

// --- Save ×10 multiplier + slider bounds ---
await page.fill("#calc-annual-mult", "12");
await page.fill("#calc-min-bill", "600");
await page.fill("#calc-max-bill", "9000");
await page.fill("#calc-step-bill", "100");
await page.click("#calc-config-submit");
await page.waitForSelector("text=บันทึกตัวเลขการคำนวณแล้ว", { timeout: 15000 });
const savedRow = await prisma.calculatorConfig.findFirst();
if (
  !savedRow ||
  savedRow.annualSavingMonthsMultiplier !== 12 ||
  savedRow.minBill !== 600 ||
  savedRow.maxBill !== 9000
) {
  fail("CALC CONFIG: multiplier/slider not saved");
}
pass("CALC CONFIG: save ×10 multiplier + slider bounds");

// "5kw kW" bug is gone: the preview shows "3 kW · 1 เฟส" style text, never "3kw kW"
const bodyText = await page.locator("body").innerText();
if (/\d+kw kW/i.test(bodyText)) fail('CALC CONFIG: "Nkw kW" bug still present');
pass('CALC CONFIG: no "Nkw kW" duplicated-unit bug in preview');

// Restore slider bounds to defaults for the rest of the run (reset happens later anyway).
await page.fill("#calc-annual-mult", String(CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier));
await page.fill("#calc-min-bill", String(CALCULATOR_DEFAULTS.minBill));
await page.fill("#calc-max-bill", String(CALCULATOR_DEFAULTS.maxBill));
await page.fill("#calc-step-bill", String(CALCULATOR_DEFAULTS.stepBill));
await page.click("#calc-config-submit");
await page.waitForSelector("text=บันทึกตัวเลขการคำนวณแล้ว", { timeout: 15000 });

// --- Size table card: idle/default state ---
await page.waitForSelector("#calc-size-table-summary", { timeout: 10000 });
const summaryText = await page.locator("#calc-size-table-summary").innerText();
if (!summaryText.includes("ค่าเริ่มต้น")) fail("CALC SIZE TABLE: default summary badge missing");
pass("CALC SIZE TABLE: idle/default state visible");

// --- Upload: a good fixture that also produces a warning (drops the 10 kW
// row — a published Package.sizeKw=10 then has no matching table row) ---
const warningRows: FixtureRow[] = goodRows().filter((r) => r.size !== 10);
const warningBuf = await buildOnGridFixture({ includeCategory: true, rows: warningRows });
const warningFilePath = await writeTempXlsx(warningBuf, "warning-fixture.xlsx");

await page.setInputFiles("#calc-import-file", warningFilePath);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-preview", { timeout: 15000 });
const previewText = await page.locator("#calc-import-preview").innerText();
if (!previewText.includes("คำเตือน")) fail("CALC SIZE TABLE: expected warning box in preview");
if (!previewText.includes("ไม่มีในตาราง")) fail("CALC SIZE TABLE: expected package-not-in-table warning text");
pass("CALC SIZE TABLE: upload good fixture -> preview + warning shown");
if (!previewText.includes("ไม่แสดง (เกินตาราง)")) fail("CALC SIZE TABLE: oversized sample must hide payback");
await page.getByRole("button", { name: /ดูตารางทั้งหมด/ }).click();
await captureState(page, "expanded-table");
await page.getByRole("button", { name: /ซ่อนตาราง/ }).click();
if (process.env.SCREENSHOT_DIR) {
  await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, "s6-preview-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, "s6-preview-mobile.png"), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
}

await page.click("#calc-import-apply");
await assertConfirmKeyboard(page, "calc-import-apply", "calc-import-apply-confirm");
await captureState(page, "apply-confirm");
const applyRequestPromise = page.waitForRequest((request) =>
  request.method() === "POST" && Boolean(request.headers()["next-action"])
);
await page.click("#calc-import-apply-confirm");
const applyRequest = await applyRequestPromise;
await page.waitForSelector("text=ใช้ตารางใหม่แล้ว", { timeout: 15000 });
await page.locator("#calc-size-table-summary").filter({ hasText: "warning-fixture.xlsx" }).waitFor({ timeout: 10000 });
const appliedSummary = await page.locator("#calc-size-table-summary").innerText();
if (!appliedSummary.includes("warning-fixture.xlsx")) {
  fail("CALC SIZE TABLE: applied summary should show the uploaded file name");
}
pass("CALC SIZE TABLE: apply -> summary shows file");
await captureState(page, "active-summary");

// Admin must still be on the "ตัวเลขการคำนวณ" tab after apply (spec §9.3 —
// no shell remount back to the "เนื้อหา" tab).
const stillOnConfigTab = await page.locator("#calculator-tab-config[data-active]").count();
if (stillOnConfigTab === 0) fail("CALC SIZE TABLE: admin left the config tab after apply");
pass("CALC SIZE TABLE: still on config tab after apply (remount bug fixed)");

const firstAppliedRow = await prisma.calculatorConfig.findFirst();
const firstImportId = firstAppliedRow?.sizeTableImportId ?? null;
if (!firstImportId) fail("CALC SIZE TABLE: sizeTableImportId not set after apply");
pass("CALC SIZE TABLE: DB sizeTableImportId set to the applied import");

// --- S7 public: after apply (3+5 kW table, last billMax=6000) ---
const publicPage = await browser.newPage();
for (const locale of ["th", "en"] as const) {
  const at2500 = await publicCalcBody(publicPage, locale, 2500);
  if (!/3\s*kW/i.test(at2500)) fail(`PUBLIC ${locale}: bill 2500 should recommend 3 kW after apply`);
  const at500 = await publicCalcBody(publicPage, locale, 500);
  const covers =
    locale === "th" ? at500.includes("ครอบคลุมค่าไฟเต็ม 100%") : at500.includes("Covers 100% of your electricity bill");
  if (!covers) fail(`PUBLIC ${locale}: bill 500 should show covers-full-bill after apply`);
  const atTooLarge = await publicCalcBody(publicPage, locale, 10000);
  const tooLarge =
    locale === "th" ? atTooLarge.includes("ระบบเกิน") : atTooLarge.includes("System larger than");
  if (!tooLarge) fail(`PUBLIC ${locale}: bill 10000 should show tooLarge after apply (last billMax 6000)`);
  pass(`PUBLIC ${locale}: applied table → 3 kW / 100% / tooLarge`);
}
await publicPage.close();

// --- Macro-enabled file -> reject list ---
const macroBuf = await withMacroEntry(await buildOnGridFixture({ includeCategory: true, rows: goodRows() }));
const macroFilePath = await writeTempXlsx(macroBuf, "macro-fixture.xlsx");
await page.setInputFiles("#calc-import-file", macroFilePath);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-reject", { timeout: 15000 });
const rejectText = await page.locator("#calc-import-reject").innerText();
if (!rejectText.includes("macro") && !rejectText.includes("ธรรมดา")) {
  fail("CALC SIZE TABLE: expected a macro-related reject message");
}
pass("CALC SIZE TABLE: macro fixture -> reject list shown");
await captureState(page, "reject");

// --- Same file again -> duplicate ("เคย upload แล้ว") ---
await page.setInputFiles("#calc-import-file", warningFilePath);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-preview", { timeout: 15000 });
const duplicateText = await page.locator("#calc-import-preview").innerText();
if (!duplicateText.includes("เคย upload แล้ว")) {
  fail('CALC SIZE TABLE: re-uploading the same file should show "เคย upload แล้ว"');
}
if (!duplicateText.includes("เป็นชุดที่ใช้อยู่ตอนนี้")) {
  fail("CALC SIZE TABLE: re-uploading the active file should say it's already active");
}
pass("CALC SIZE TABLE: same sha256 upload -> duplicate banner (already active)");
await page.click('button:has-text("ปิด")');

// --- Conflict: two admin sessions, second save wins, first apply gets conflict ---
const pageB = await browser.newPage();
await login(pageB, "admin@kkdproperty.com", ADMIN_PASSWORD);

// Session A: prepare a fresh distinct import (adds a 7 kW row nobody has a Package for).
const distinctRows: FixtureRow[] = [
  ...goodRows(),
  {
    category: "บ้าน",
    size: 7,
    unit: "kW",
    phase: 1,
    sunHours: 5,
    days: 30,
    panels: 14,
    roof: 37.8,
    billMin: 6000,
    billMax: 6500,
    pricePerKwh: 4.5,
  },
];
const distinctBuf = await buildOnGridFixture({ includeCategory: true, rows: distinctRows });
const distinctFilePath = await writeTempXlsx(distinctBuf, "distinct-fixture.xlsx");

await openConfigTab(page);
await page.setInputFiles("#calc-import-file", distinctFilePath);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-preview", { timeout: 15000 });
await page.click("#calc-import-apply");

// Session B bumps CalculatorConfig.version first (a plain numeric save).
await openConfigTab(pageB);
await pageB.fill("#calc-annual-mult", "11");
await pageB.click("#calc-config-submit");
await pageB.waitForSelector("text=บันทึกตัวเลขการคำนวณแล้ว", { timeout: 15000 });
await pageB.close();

// Session A's stale confirm now conflicts.
await page.click("#calc-import-apply-confirm");
await page.waitForSelector("#calc-import-conflict", { timeout: 15000 });
pass("CALC SIZE TABLE: conflict from a stale version shows conflict box");
await captureState(page, "conflict");
await page.click('#calc-import-conflict button:has-text("โหลดข้อมูลล่าสุด")');
await page.waitForSelector("#calc-size-table-summary", { timeout: 10000 });
pass("CALC SIZE TABLE: conflict reload refreshes data (stays on tab)");

// Re-apply the same distinct import after reload — should now succeed.
await page.setInputFiles("#calc-import-file", distinctFilePath);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-preview", { timeout: 15000 });
await page.click("#calc-import-apply");
await page.click("#calc-import-apply-confirm");
await page.waitForSelector("text=ใช้ตารางใหม่แล้ว", { timeout: 15000 });
pass("CALC SIZE TABLE: re-apply after conflict reload succeeds");

// --- Rollback: use the earlier "warning-fixture" import from history ---
await page.waitForSelector(`#calc-import-use-${firstImportId}`, { timeout: 10000 });
await page.click(`#calc-import-use-${firstImportId}`);
await assertConfirmKeyboard(page, `calc-import-use-${firstImportId}`, `calc-import-use-confirm-${firstImportId}`);
await captureState(page, "rollback-confirm");
await page.click(`#calc-import-use-confirm-${firstImportId}`);
await page.waitForSelector("text=กลับไปใช้ชุด", { timeout: 15000 });
const rolledBackRow = await prisma.calculatorConfig.findFirst();
if (!rolledBackRow || rolledBackRow.sizeTableImportId !== firstImportId) {
  fail("CALC SIZE TABLE: rollback did not restore the earlier import");
}
pass("CALC SIZE TABLE: rollback to a previous set from history");

// --- Reset: back to the default 3-row table ---
await openConfigTab(page);
await page.waitForSelector("#calc-reset", { timeout: 10000 });
await page.click("#calc-reset");
await assertConfirmKeyboard(page, "calc-reset", "calc-reset-confirm");
await captureState(page, "reset-confirm");
await page.click("#calc-reset-confirm");
await page.waitForSelector("text=คืนค่าเริ่มต้นแล้ว", { timeout: 15000 });
const resetRow = await prisma.calculatorConfig.findFirst();
if (!resetRow || resetRow.sizeTable !== null || resetRow.sizeTableImportId !== null) {
  fail("CALC SIZE TABLE: reset did not clear sizeTable/sizeTableImportId");
}
if (resetRow.annualSavingMonthsMultiplier !== CALCULATOR_DEFAULTS.annualSavingMonthsMultiplier) {
  fail("CALC SIZE TABLE: reset did not restore default multiplier");
}
pass("CALC SIZE TABLE: reset -> default table + default multiplier/slider");

// --- S7 public: after reset → legacy 3/5/10 (S0 baseline sizes) ---
const publicAfterReset = await browser.newPage();
for (const locale of ["th", "en"] as const) {
  const at2500 = await publicCalcBody(publicAfterReset, locale, 2500);
  if (!/3\s*kW/i.test(at2500)) fail(`PUBLIC ${locale}: reset → bill 2500 should be 3 kW`);
  const at3000 = await publicCalcBody(publicAfterReset, locale, 3000);
  if (!/5\s*kW/i.test(at3000)) fail(`PUBLIC ${locale}: reset → bill 3000 should be 5 kW`);
  const at6000 = await publicCalcBody(publicAfterReset, locale, 6000);
  if (!/10\s*kW/i.test(at6000)) fail(`PUBLIC ${locale}: reset → bill 6000 should be 10 kW`);
  pass(`PUBLIC ${locale}: reset → legacy 3/5/10 kW sizes`);
}
await publicAfterReset.close();

// --- Audit trail ---
const importCreateAudit = await prisma.auditLog.findFirst({
  where: { entityType: "CalculatorImport", action: "CREATE" },
  orderBy: { createdAt: "desc" },
});
if (!importCreateAudit) fail("AUDIT: no CalculatorImport CREATE row");
const configUpdateAudit = await prisma.auditLog.findFirst({
  where: { entityType: "CalculatorConfig", action: "UPDATE" },
  orderBy: { createdAt: "desc" },
});
if (!configUpdateAudit) fail("AUDIT: no CalculatorConfig UPDATE row");
pass("AUDIT: CalculatorImport CREATE + CalculatorConfig UPDATE recorded");

await page.goto(`${BASE_URL}/admin/audit`);
await page.waitForSelector("text=ประวัติการแก้ไข", { timeout: 10000 });
const auditPageVisible = await page
  .waitForSelector("text=ชุดตารางคำนวณ (Excel)", { timeout: 10000 })
  .then(() => true)
  .catch(() => false);
if (!auditPageVisible) fail("AUDIT: CalculatorImport entity label not visible on /admin/audit");
pass("AUDIT: admin audit page shows the Excel import entity");

// --- Role restriction: MARKETING doesn't see the card ---
const pageMarketing = await browser.newPage();
await login(pageMarketing, "marketing.test@kkdproperty.local", "Test1234!");
await pageMarketing.goto(`${BASE_URL}/admin/pages/calculator`);
await pageMarketing.waitForSelector("text=เครื่องคำนวณ", { timeout: 10000 });
const configTabForMarketing = await pageMarketing.locator("#calculator-tab-config").count();
if (configTabForMarketing !== 0) {
  fail("ROLE: MARKETING should not see the ตัวเลขการคำนวณ tab");
}
pass("ROLE: MARKETING does not see the config tab / Excel card");
const beforeDeniedApply = await prisma.calculatorConfig.findFirst();
const deniedApply = await pageMarketing.request.post(applyRequest.url(), {
  headers: {
    "next-action": applyRequest.headers()["next-action"],
    "content-type": applyRequest.headers()["content-type"],
    origin: BASE_URL,
  },
  data: applyRequest.postDataBuffer()!,
});
if (!deniedApply.headers()["x-action-redirect"]?.startsWith("/admin;")) {
  fail("ROLE: direct apply action must redirect MARKETING to /admin");
}
const afterDeniedApply = await prisma.calculatorConfig.findFirst();
if (afterDeniedApply?.version !== beforeDeniedApply?.version) {
  fail("ROLE: denied direct apply must not change config");
}
pass("ROLE: direct apply action rejects MARKETING before mutation");
await pageMarketing.close();

await browser.close();
await prisma.$disconnect();
console.log("CALC CONFIG LIVE-VERIFY: all checks passed");
