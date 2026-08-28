/**
 * Optional post-deploy write-path check — submits one [TEST] quote lead on production.
 * Usage: npx tsx scripts/smoke-test-production-write.mts
 */
import { chromium } from "playwright";

const BASE = (process.env.SMOKE_TEST_BASE_URL ?? "https://kkdproperty.co.th").replace(/\/+$/, "");

async function main() {
  const phone = `089${String(Date.now()).slice(-7)}`;
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/th/booking?tab=quote`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.fill('input[name="name"]', `[TEST] Deploy verify ${new Date().toISOString().slice(0, 10)}`);
  await page.fill('input[name="phone"]', phone);
  await page.selectOption('select[name="province"]', "สมุทรปราการ");
  await page.selectOption('select[name="buildingType"]', "RESIDENTIAL");
  await page.selectOption('select[name="avgMonthlyBillBucket"]', "7500");
  await page.check('input[name="interestedSystems"][value="ON_GRID"]');
  await page.click('button[type="submit"]');

  const ok = await page
    .waitForSelector("text=ส่งข้อมูลสำเร็จ", { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);

  await browser.close();

  if (ok) {
    console.log(`PROD WRITE: quote submit ✓ (phone ${phone} — delete in admin when convenient)`);
    process.exit(0);
  }
  console.error("PROD WRITE: quote submit ✗ FAIL — no success screen");
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
