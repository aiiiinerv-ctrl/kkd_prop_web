// R1-S6 (hand-edit On-grid table, confirm dialog, conflict, export round-trip)
// is the "R1-S6" block after the public-after-reset checks below.
//
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

/** R1-S5: the size table lives in its own tab; the import panel is collapsed by default. */
async function openTablesTab(page: Page) {
  await page.goto(`${BASE_URL}/admin/pages/calculator`);
  await page.locator("#calculator-tab-size-table").click();
  await page.waitForSelector("#calculator-tab-size-table[data-active]", { timeout: 10000 });
  await page.waitForSelector("#calc-size-table-summary", { state: "visible", timeout: 10000 });
}

async function openImportPanel(page: Page) {
  const toggle = page.locator("#calc-import-toggle");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await page.waitForSelector("#calc-import-file", { state: "visible", timeout: 10000 });
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

// --- Size table tab: idle/default state ---
await openTablesTab(page);
const summaryText = await page.locator("#calc-size-table-summary").innerText();
if (!summaryText.includes("ค่าเริ่มต้น")) fail("CALC SIZE TABLE: default summary badge missing");
pass("CALC SIZE TABLE: idle/default state visible");

// List: one row per default size; edit/add are live since R1-S6 and there is no save bar while idle.
const editButtons = page.locator('button[id^="calc-edit-on-grid-"]');
if ((await editButtons.count()) !== 3) fail("CALC SIZE TABLE: default list should have 3 rows");
if ((await editButtons.first().isDisabled()) || (await page.locator("#calc-add-on-grid").isDisabled()))
  fail("CALC SIZE TABLE: edit/add buttons must be enabled when nothing is open");
if ((await page.locator("#calc-tables-savebar").count()) !== 0) fail("CALC SIZE TABLE: no save bar while idle");
pass("CALC SIZE TABLE: On-grid list (3 rows, edit/add enabled, no save bar while idle)");

// Export link: ADMIN download with the R1-S3 route's filename.
const [download] = await Promise.all([page.waitForEvent("download"), page.click("#calc-export")]);
if (!/^kkd-calculator-tables-\d{8}\.xlsx$/.test(download.suggestedFilename()))
  fail(`CALC SIZE TABLE: unexpected export filename ${download.suggestedFilename()}`);
pass("CALC SIZE TABLE: export button downloads kkd-calculator-tables-<date>.xlsx");

// Import panel is collapsed until the toggle is pressed.
if ((await page.locator("#calc-import-file").count()) !== 0) fail("CALC SIZE TABLE: import panel should start collapsed");
await openImportPanel(page);
pass("CALC SIZE TABLE: import toggle opens the panel");

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

// Admin must still be on the "ตารางขนาดระบบ" tab after apply (spec §9.3 —
// no shell remount back to the "เนื้อหา" tab).
const stillOnTablesTab = await page.locator("#calculator-tab-size-table[data-active]").count();
if (stillOnTablesTab === 0) fail("CALC SIZE TABLE: admin left the size-table tab after apply");
pass("CALC SIZE TABLE: still on size-table tab after apply (remount bug fixed)");

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

await openTablesTab(page);
await openImportPanel(page);
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

// --- History source badges: EXCEL shows "Excel: <file>" + original download;
// MANUAL shows "แก้ในหลังบ้าน" and no download link ---
const excelItem = page.locator("#calc-import-history li").filter({ hasText: "warning-fixture.xlsx" }).first();
const excelText = await excelItem.innerText();
if (!excelText.includes("Excel:") || !excelText.includes("ดาวน์โหลดต้นฉบับ"))
  fail(`CALC SIZE TABLE: EXCEL history item needs "Excel: <file>" + download link, got: ${excelText}`);
const adminUser = await prisma.adminUser.findFirstOrThrow({ where: { email: "admin@kkdproperty.com" } });
const manualImport = await prisma.calculatorImport.create({
  data: {
    source: "MANUAL",
    fileName: null,
    fileKey: null,
    sha256: null,
    sizeBytes: null,
    rows: [
      { kw: 3, phases: [1], sunHours: 5, days: 30, pricePerKwh: 4.5, panels: 6, roofM2: 16.2, billMin: 2000, billMax: 3000 },
    ],
    warnings: [],
    uploadedById: adminUser.id,
  },
});
try {
  await openTablesTab(page);
  const manualItem = page.locator("#calc-import-history li").filter({ hasText: "แก้ในหลังบ้าน" }).first();
  await manualItem.waitFor({ timeout: 10000 });
  if ((await manualItem.locator("a").count()) !== 0) fail("CALC SIZE TABLE: MANUAL history item must not have a download link");
  pass("CALC SIZE TABLE: history badges (Excel: <file> + download / แก้ในหลังบ้าน without download)");
} finally {
  await prisma.calculatorImport.delete({ where: { id: manualImport.id } });
}

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

// =====================================================================
// R1-S6: hand-edit the On-grid table (starts from the default table the
// reset above left behind). Every change goes through the UI -> server
// action path; the DB is only READ here.
// =====================================================================
const r1Start = new Date();

/** No horizontal overflow at 1280 and 820 (+ optional screenshots into SCREENSHOT_DIR). */
async function checkLayout(p: Page, name: string, fullPage = false) {
  for (const width of [1280, 820]) {
    await p.setViewportSize({ width, height: 900 });
    await p.waitForTimeout(150);
    const dims = await p.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    if (dims.sw > dims.cw) fail(`LAYOUT ${name} @${width}: page overflows (scrollWidth ${dims.sw} > ${dims.cw})`);
    if (process.env.SCREENSHOT_DIR) {
      await fs.mkdir(process.env.SCREENSHOT_DIR, { recursive: true });
      await p.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `r1s6-${name}-${width}.png`), fullPage });
    }
  }
  await p.setViewportSize({ width: 1280, height: 720 });
}

async function openEdit(p: Page, kw: string) {
  await p.click(`#calc-edit-on-grid-${kw}`);
  await p.waitForSelector("#calc-size-dialog", { state: "visible" });
}
async function closeDialog(p: Page) {
  await p.waitForSelector("#calc-size-dialog", { state: "detached", timeout: 10000 });
}
async function fillFields(p: Page, fields: Record<string, string>) {
  for (const [id, value] of Object.entries(fields)) await p.fill(`#${id}`, value);
}
const rowOf = (p: Page, kw: string) => p.locator("tr", { has: p.locator(`#calc-edit-on-grid-${kw}, #calc-restore-on-grid-${kw}`) });
const activeIdIsAny = (p: Page, id: string) => p.waitForFunction((x) => document.activeElement?.id === x, id);
const configNow = () => prisma.calculatorConfig.findFirstOrThrow();
const publicHas = async (p: Page, locale: "th" | "en", bill: number, re: RegExp) => re.test(await publicCalcBody(p, locale, bill));
const SEVEN = /(?<![\d.])7\s*kW/;

const pub = await browser.newPage();
await openTablesTab(page);

// --- 1. Edit one value -> save bar, locks, tab switch; edit back -> bar gone ---
await openEdit(page, "3");
if (!(await page.locator("#og-kw").evaluate((el) => (el as HTMLInputElement).readOnly))) fail("EDIT: kW of an existing size must be read-only");
await page.fill("#og-bill-max", "3500");
await page.locator("#calc-size-dialog-ok").click();
await closeDialog(page);
await page.waitForSelector("#calc-tables-savebar", { timeout: 5000 });
if (!(await rowOf(page, "3").innerText()).includes("แก้แล้ว")) fail('EDIT: edited row needs the "แก้แล้ว" badge');
if (!(await page.locator("#calc-import-toggle").isDisabled())) fail("LOCK: import button must be disabled while edits are pending");
if (!(await page.locator("#calc-import-lock-hint").isVisible())) fail("LOCK: a visible hint must explain the disabled import button");
await page.locator("#calculator-tab-config").click();
await page.locator("#calculator-tab-size-table").click();
if (!(await page.locator("#calc-tables-savebar").isVisible())) fail("EDIT: pending edits must survive switching tabs");
pass("EDIT: dirty row badge, save bar, import locked with visible hint, edits survive a tab switch");
await checkLayout(page, "dirty-list");

await openEdit(page, "3");
await page.fill("#og-bill-max", "3000");
await page.locator("#calc-size-dialog-ok").click();
await closeDialog(page);
if ((await page.locator("#calc-tables-savebar").count()) !== 0) fail("EDIT: editing back to the original must remove the save bar");
if (await page.locator("#calc-import-toggle").isDisabled()) fail("LOCK: import button must re-enable once nothing is pending");
pass("EDIT: editing a value back to the original removes the save bar and unlocks import");

// --- 2. Add a size with a bad bill range -> error pointing at the field ---
await openEdit(page, "3");
await page.fill("#og-bill-max", "3500");
await page.locator("#calc-size-dialog-ok").click();
await closeDialog(page);
await page.click("#calc-add-on-grid");
await page.waitForSelector("#calc-size-dialog", { state: "visible" });
await fillFields(page, { "og-kw": "7", "og-panels": "13", "og-bill-min": "6000", "og-bill-max": "5000" });
await page.locator("#og-bill-max").blur();
await page.waitForSelector("#og-bill-min[aria-invalid='true']", { timeout: 5000 });
const dialogErrors = await page.locator("#calc-size-dialog-errors").innerText();
if (!dialogErrors.includes("ต้องแก้ 1 จุดก่อนบันทึก")) fail(`ERROR: dialog summary box missing, got: ${dialogErrors}`);
if (!(await page.locator("#og-bill-min-error").innerText()).includes("ต้องน้อยกว่า")) fail("ERROR: message under the field missing");
await page.locator('#calc-size-dialog-errors button').first().click();
await activeIdIsAny(page, "og-bill-min");
pass("ERROR: aria-invalid + message under the field + summary box whose link focuses the field");
await checkLayout(page, "edit-dialog-error");
await page.locator("#calc-size-dialog-ok").click(); // allowed with errors (design-162 §5.1)
await closeDialog(page);
await page.waitForSelector("#calc-tables-errline", { timeout: 5000 });
if (!(await page.locator("#calc-tables-save").isDisabled())) fail("ERROR: save button must be disabled while there are errors");
if (!(await rowOf(page, "7").innerText()).includes("ผิด 1")) fail('ERROR: row needs the "ผิด 1" badge');
await page.click("#calc-tables-goto-error");
await page.waitForSelector("#calc-size-dialog", { state: "visible" });
await activeIdIsAny(page, "og-bill-min");
pass('ERROR: save disabled, row badge "ผิด 1", "ไปที่จุดแรก" reopens the dialog on the bad field');
await fillFields(page, { "og-bill-max": "8000" });
await page.locator("#calc-size-dialog-ok").click();
await closeDialog(page);
if ((await page.locator("#calc-tables-errline").count()) !== 0 || (await page.locator("#calc-tables-save").isDisabled()))
  fail("ERROR: fixing the field must re-enable save");

// --- 3. Confirm dialog with diff, then save ---
const before1 = await configNow();
for (const locale of ["th", "en"] as const) {
  if (await publicHas(pub, locale, 7000, SEVEN)) fail(`PUBLIC ${locale}: 7 kW must not be recommended before saving`);
}
await page.click("#calc-tables-save");
await page.waitForSelector("#calc-tables-confirm", { state: "visible" });
const confirmText = await page.locator("#calc-tables-confirm").innerText();
for (const needle of ["ผลต่อบิลตัวอย่าง", "สิ่งที่เปลี่ยน", "เปลี่ยน", "เพิ่ม", "On-grid 7 kW", "ลูกค้าเห็นทันที"])
  if (!confirmText.includes(needle)) fail(`CONFIRM: dialog missing "${needle}"`);
if ((await configNow()).version !== before1.version) fail("CONFIRM: opening the dialog must not save anything");
await checkLayout(page, "confirm-diff");
await page.click("#calc-tables-confirm-save");
await page.getByText("บันทึกแล้ว — หน้าเครื่องคำนวณอัปเดตแล้ว").first().waitFor({ timeout: 15000 });
await page.waitForSelector("#calc-tables-confirm", { state: "detached", timeout: 10000 });
await page.waitForFunction(() => document.activeElement?.id === "calc-tables-heading", null, { timeout: 5000 });
const cfg1 = await configNow();
if (cfg1.version !== before1.version + 1 || !cfg1.sizeTableImportId) fail("SAVE: config version must bump by 1 and point at the new import");
const imp1 = await prisma.calculatorImport.findUniqueOrThrow({ where: { id: cfg1.sizeTableImportId } });
if (imp1.source !== "MANUAL") fail("SAVE: new set must be a MANUAL import");
const r1Rows = (cfg1.sizeTable as { kw: number; billMax: number }[]) ?? [];
if (!r1Rows.some((r) => r.kw === 7 && r.billMax === 8000) || r1Rows.find((r) => r.kw === 3)?.billMax !== 3500) fail("SAVE: table in DB does not match the edits");
const summary1 = await page.locator("#calc-size-table-summary").innerText();
if (!summary1.includes("แก้ในหลังบ้าน") || !summary1.includes("ใช้อยู่")) fail("SAVE: summary must show the MANUAL source + ใช้อยู่");
if ((await page.locator("#calc-tables-savebar").count()) !== 0) fail("SAVE: save bar must disappear after saving");
pass("SAVE: confirm diff -> MANUAL import + config v+1, summary shows แก้ในหลังบ้าน, focus on heading, bar gone");
await checkLayout(page, "active-manual-and-history", true);
for (const locale of ["th", "en"] as const) {
  if (!(await publicHas(pub, locale, 7000, SEVEN))) fail(`PUBLIC ${locale}: bill 7000 should recommend 7 kW after the save`);
}
pass("PUBLIC /th + /en: bill 7000 recommends the new 7 kW size");
const histManual = page.locator("#calc-import-history li").first();
if (!(await histManual.innerText()).includes("แก้ในหลังบ้าน")) fail('HISTORY: newest item must carry the "แก้ในหลังบ้าน" badge');
pass("HISTORY: newest version is labelled แก้ในหลังบ้าน");

// --- 4. Second save: mark delete + restore + delete; history locked while dirty ---
const save1ImportId = cfg1.sizeTableImportId;
await openEdit(page, "7");
await page.click("#calc-size-dialog-delete");
await closeDialog(page);
let row7 = await rowOf(page, "7").innerText();
if (!row7.includes("จะลบ") || !row7.includes("คืนขนาดนี้")) fail('DELETE: row must show "จะลบ" + "คืนขนาดนี้"');
await page.click("#calc-restore-on-grid-7");
if ((await page.locator("#calc-tables-savebar").count()) !== 0) fail("DELETE: restoring the size must clear the dirty state");
await openEdit(page, "7");
await page.click("#calc-size-dialog-delete");
await closeDialog(page);
if ((await page.locator("#calc-history-lock-hint").count()) !== 1) fail("LOCK: history needs a visible hint while edits are pending");
for (const btn of await page.locator('button[id^="calc-import-use-"]').all()) {
  if (!(await btn.isDisabled())) fail('LOCK: "ใช้ชุดนี้" must be disabled while edits are pending');
}
pass('DELETE: จะลบ/คืนขนาดนี้ round trip; "ใช้ชุดนี้" disabled with a visible hint while dirty');
await page.click("#calc-tables-save");
await page.waitForSelector("#calc-tables-confirm", { state: "visible" });
if (!(await page.locator("#calc-tables-confirm").innerText()).includes("ขนาดนี้จะไม่ถูกแนะนำอีก")) fail("CONFIRM: removed size needs the explanatory line");
await page.click("#calc-tables-confirm-save");
await page.waitForSelector("#calc-tables-confirm", { state: "detached", timeout: 15000 });
for (const locale of ["th", "en"] as const) {
  if (await publicHas(pub, locale, 7000, SEVEN)) fail(`PUBLIC ${locale}: 7 kW must be gone after deleting it`);
}
pass("SAVE #2: deleting 7 kW removes it from /th + /en");

// --- 5. "ใช้ชุดนี้" rolls back to the first manual version ---
await page.waitForSelector(`#calc-import-use-${save1ImportId}`, { state: "visible", timeout: 10000 });
await page.click(`#calc-import-use-${save1ImportId}`);
await page.click(`#calc-import-use-confirm-${save1ImportId}`);
await page.getByText("กลับไปใช้เวอร์ชันแก้ในหลังบ้าน").first().waitFor({ timeout: 15000 });
if ((await configNow()).sizeTableImportId !== save1ImportId) fail("ROLLBACK: config must point at the first manual version");
for (const locale of ["th", "en"] as const) {
  if (!(await publicHas(pub, locale, 7000, SEVEN))) fail(`ROLLBACK ${locale}: 7 kW must be back after "ใช้ชุดนี้"`);
}
pass("ROLLBACK: ใช้ชุดนี้ on the first manual version restores 7 kW on /th + /en");

// --- 6. Conflict: another admin saves while this draft is open ---
const adminB = await browser.newPage();
await login(adminB, "admin@kkdproperty.com", ADMIN_PASSWORD);
await openTablesTab(adminB);
await openEdit(adminB, "5");
await adminB.fill("#og-sun", "5.5");
await adminB.locator("#calc-size-dialog-ok").click();
await closeDialog(adminB);
await openTablesTab(page);
await openEdit(page, "10");
await page.fill("#og-panels", "19");
await page.locator("#calc-size-dialog-ok").click();
await closeDialog(page);
await page.click("#calc-tables-save");
await page.waitForSelector("#calc-tables-confirm", { state: "visible" });
const saveRequestPromise = page.waitForRequest((r) => r.method() === "POST" && Boolean(r.headers()["next-action"]));
await page.click("#calc-tables-confirm-save");
const saveRequest = await saveRequestPromise;
await page.waitForSelector("#calc-tables-confirm", { state: "detached", timeout: 15000 });
const versionAfterA = (await configNow()).version;
await adminB.click("#calc-tables-save");
await adminB.waitForSelector("#calc-tables-confirm", { state: "visible" });
await adminB.click("#calc-tables-confirm-save");
await adminB.waitForSelector("#calc-tables-conflict", { timeout: 15000 });
const conflictText = await adminB.locator("#calc-tables-conflict").innerText();
if (!conflictText.includes("มีคนแก้ตารางก่อนคุณ") || !conflictText.includes("On-grid 5 kW")) fail(`CONFLICT: box text unexpected: ${conflictText}`);
if (!(await adminB.locator("#calc-tables-confirm-save").isDisabled())) fail("CONFLICT: confirm button must be disabled");
if ((await configNow()).version !== versionAfterA) fail("CONFLICT: the losing save must not change the config");
pass("CONFLICT: stale draft -> conflict box listing the edited sizes, confirm disabled, nothing saved");
await checkLayout(adminB, "conflict");
await adminB.click("#calc-tables-conflict-reload");
await adminB.waitForSelector("#calc-tables-confirm", { state: "detached", timeout: 10000 });
await adminB.waitForSelector("#calc-tables-savebar", { state: "detached", timeout: 10000 });
await adminB.waitForFunction(() => document.querySelector("tr:has(#calc-edit-on-grid-10)")?.querySelectorAll("td")[6]?.textContent === "19", null, { timeout: 15000 });
pass("CONFLICT: โหลดข้อมูลล่าสุด drops the draft and shows the other admin's value (10 kW panels 19)");
await adminB.close();

// --- 7. Export -> import the same file -> same table (overwrite box over a MANUAL set) ---
const preExport = (await configNow()).sizeTable;
const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#calc-export")]);
const exportedPath = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "kkd-r1s6-")), "exported.xlsx");
await dl.saveAs(exportedPath);
await openImportPanel(page);
await page.setInputFiles("#calc-import-file", exportedPath);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-preview", { timeout: 15000 });
await page.waitForSelector("#calc-import-overwrite", { state: "visible", timeout: 5000 });
if (!(await page.locator("#calc-import-overwrite").innerText()).includes("ไฟล์นี้จะแทนที่ตารางทั้งชุด")) fail("IMPORT: overwrite box text missing");
await checkLayout(page, "import-overwrite");
await page.click("#calc-import-apply");
await page.click("#calc-import-apply-confirm");
await page.getByText("ใช้ตารางใหม่แล้ว").first().waitFor({ timeout: 15000 });
const norm = (t: unknown) =>
  JSON.stringify(
    (t as Record<string, unknown>[]).map((r) => [r.kw, [...(r.phases as number[])].sort(), r.sunHours, r.days, r.pricePerKwh, r.panels, r.roofM2, r.billMin, r.billMax])
  );
if (norm((await configNow()).sizeTable) !== norm(preExport)) fail("ROUND-TRIP: re-importing the exported file must give the same table");
await page.locator("#calc-size-table-summary").filter({ hasText: "exported.xlsx" }).waitFor({ timeout: 10000 });
pass("ROUND-TRIP: export -> import gives the same table; overwrite box shown over a MANUAL set; summary shows Excel: exported.xlsx");
await checkLayout(page, "active-excel-and-history", true);

// --- 8. Audit rows for the manual saves ---
const audits = await prisma.auditLog.findMany({ where: { createdAt: { gte: r1Start }, entityType: { in: ["CalculatorImport", "CalculatorConfig"] } } });
const manualCreates = audits.filter((a) => a.entityType === "CalculatorImport" && a.action === "CREATE" && JSON.stringify(a.after).includes('"source":"MANUAL"'));
const cfgUpdates = audits.filter((a) => a.entityType === "CalculatorConfig" && a.action === "UPDATE");
if (manualCreates.length < 3 || cfgUpdates.length < 3) fail(`AUDIT: expected >=3 MANUAL import CREATE + >=3 config UPDATE, got ${manualCreates.length}/${cfgUpdates.length}`);
if (manualCreates.some((a) => /"rows"|fileKey/.test(JSON.stringify(a.after)))) fail("AUDIT: MANUAL import snapshots must not contain rows/fileKey");
pass(`AUDIT: ${manualCreates.length} CalculatorImport CREATE (source MANUAL) + ${cfgUpdates.length} CalculatorConfig UPDATE, no rows blob`);

// --- 9. Another role cannot call the save action ---
const marketingR1 = await browser.newPage();
await login(marketingR1, "marketing.test@kkdproperty.local", "Test1234!");
const beforeDeniedSave = await configNow();
const deniedSave = await marketingR1.request.post(saveRequest.url(), {
  headers: { "next-action": saveRequest.headers()["next-action"], "content-type": saveRequest.headers()["content-type"], origin: BASE_URL },
  data: saveRequest.postDataBuffer()!,
});
if (!deniedSave.headers()["x-action-redirect"]?.startsWith("/admin;")) fail("ROLE: direct save action must redirect MARKETING to /admin");
if ((await configNow()).version !== beforeDeniedSave.version) fail("ROLE: denied direct save must not change config");
pass("ROLE: direct saveCalculatorTables as MARKETING -> redirect, config unchanged");
await marketingR1.close();

// --- 10. Reset (UI) -> back to the baseline default table ---
await openConfigTab(page);
await page.click("#calc-reset");
await page.click("#calc-reset-confirm");
await page.waitForSelector("text=คืนค่าเริ่มต้นแล้ว", { timeout: 15000 });
if ((await configNow()).sizeTable !== null) fail("RESET: size table must be cleared");
for (const locale of ["th", "en"] as const) {
  if (await publicHas(pub, locale, 7000, SEVEN)) fail(`RESET ${locale}: 7 kW must be gone`);
  if (!(await publicHas(pub, locale, 7000, /(?<![\d.])10\s*kW/))) fail(`RESET ${locale}: bill 7000 must recommend 10 kW again (baseline)`);
}
await pub.close();
pass("RESET: /th + /en back to the default table (bill 7000 -> 10 kW)");

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
  .waitForSelector("text='ชุดตารางคำนวณ'", { timeout: 10000 })
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
if ((await pageMarketing.locator("#calculator-tab-size-table").count()) !== 0) {
  fail("ROLE: MARKETING should not see the ตารางขนาดระบบ tab");
}
pass("ROLE: MARKETING does not see the config tab / size-table tab");
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
