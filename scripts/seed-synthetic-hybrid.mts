// Applies a SYNTHETIC two-sheet (On-grid + Hybrid) calculator table to the LOCAL
// database through the real admin import UI, so the public calculator shows the
// On-grid / Hybrid toggle for manual review on localhost. Every number and brand
// name is made up (never real sales data).
//
//   BASE_URL=http://localhost:3000 npx tsx scripts/seed-synthetic-hybrid.mts
//
// Server must be running. To go back to the default table: admin ->
// เครื่องคำนวณ -> ตัวเลขการคำนวณ -> "คืนค่าเริ่มต้น" (or run e2e-calculator-config,
// which ends with a reset).
import "dotenv/config";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import {
  FIXTURE_BRANDS,
  buildOnGridFixture,
  type FixtureRow,
  type HybridFixtureRow,
} from "./lib/calculator-import-fixtures.js";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const panelsFor = (kw: number) => Math.ceil((kw * 1.2) / 0.63);

// kW -> { bill range, phases, battery sizes }. 50/60 kW offer six battery options (design-157 §1).
const SIZES = [
  { kw: 5, billMin: 3000, billMax: 6000, phases: [1, 3], batteries: [0, 5, 10] },
  { kw: 10, billMin: 6000, billMax: 12000, phases: [1, 3], batteries: [0, 5, 10, 15] },
  { kw: 15, billMin: 12000, billMax: 18000, phases: [3], batteries: [0, 10, 15, 20] },
  { kw: 20, billMin: 18000, billMax: 26000, phases: [3], batteries: [0, 10, 15, 20, 30] },
  { kw: 30, billMin: 26000, billMax: 40000, phases: [3], batteries: [0, 10, 20, 30, 40] },
  { kw: 50, billMin: 40000, billMax: 60000, phases: [3], batteries: [0, 10, 20, 30, 40, 50, 60] },
  // 60 kW has no prices at all -> exercises the "no payback" state.
  { kw: 60, billMin: 60000, billMax: 80000, phases: [3], batteries: [0, 10, 20, 30, 40, 50, 60], noPrice: true },
] as const;

function hybridRows(): HybridFixtureRow[] {
  const rows: HybridFixtureRow[] = [];
  for (const s of SIZES) {
    for (const phase of s.phases) {
      for (const battery of s.batteries) {
        const base = s.kw * 30000 + (phase === 3 ? 6000 : 0) + battery * 9000;
        const noPrice = "noPrice" in s && s.noPrice;
        rows.push({
          kw: s.kw,
          phase,
          battery,
          panels: panelsFor(s.kw),
          roof: Math.round(panelsFor(s.kw) * 2.7 * 10) / 10,
          billMin: s.billMin,
          billMax: s.billMax,
          prices: FIXTURE_BRANDS.map((_, i) => (noPrice || i > 2 ? null : base + i * 5000)),
        });
      }
    }
  }
  return rows;
}

function onGridRows(): FixtureRow[] {
  const sizes = [
    [3, 2000, 3000, [1]],
    [5, 3000, 6000, [1, 3]],
    [10, 6000, 10000, [1, 3]],
    [15, 10000, 15000, [3]],
    [20, 15000, 22000, [3]],
    [30, 22000, 34000, [3]],
    [50, 34000, 55000, [3]],
  ] as const;
  return sizes.flatMap(([kw, billMin, billMax, phases]) =>
    phases.map((phase) => ({
      category: "บ้าน",
      size: kw,
      unit: "kW",
      phase,
      sunHours: 5,
      days: 30,
      panels: panelsFor(kw),
      roof: Math.round(panelsFor(kw) * 2.7 * 10) / 10,
      billMin,
      billMax,
      pricePerKwh: 4.5,
    }))
  );
}

const buf = await buildOnGridFixture({
  includeCategory: true,
  rows: onGridRows(),
  hybrid: { rows: hybridRows(), brands: FIXTURE_BRANDS },
});
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "kkd-synthetic-hybrid-"));
const file = path.join(dir, `synthetic-hybrid-${Date.now()}.xlsx`);
await fs.writeFile(file, buf);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto(`${BASE_URL}/admin/login`);
await page.fill('input[name="email"]', "admin@kkdproperty.com");
await page.fill('input[name="password"]', ADMIN_PASSWORD);
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 15000 });
await page.goto(`${BASE_URL}/admin/pages/calculator`);
await page.locator("#calculator-tab-size-table").click();
await page.waitForSelector("#calc-size-table-summary", { state: "visible", timeout: 10000 });
await page.locator("#calc-import-toggle").click();
await page.setInputFiles("#calc-import-file", file);
await page.click("#calc-import-upload");
await page.waitForSelector("#calc-import-preview", { timeout: 15000 });
await page.click("#calc-import-apply");
await page.click("#calc-import-apply-confirm");
await page.waitForSelector("text=ใช้ตารางใหม่แล้ว", { timeout: 15000 });
await browser.close();
console.log("synthetic On-grid + Hybrid table applied (reset: admin -> calculator -> คืนค่าเริ่มต้น)");
