import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

// --- Route A: free quote ---
await page.goto("http://localhost:3000/th/booking?tab=quote");
await page.fill('input[name="name"]', "ทดสอบ ใบเสนอราคา");
await page.fill('input[name="phone"]', "0812345678");
await page.fill('input[name="province"]', "สมุทรปราการ");
await page.selectOption('select[name="buildingType"]', "RESIDENTIAL");
await page.fill('input[name="avgMonthlyBill"]', "2500");
await page.click('button[type="submit"]');
await page.waitForSelector("text=ส่งข้อมูลสำเร็จ", { timeout: 15000 });
console.log("QUOTE: success screen shown ✓");

// --- Route B: survey with slip upload ---
// 1x1 red pixel PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const dir = mkdtempSync(path.join(tmpdir(), "slip-"));
const slipPath = path.join(dir, "slip.png");
writeFileSync(slipPath, png);

const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
await page.goto("http://localhost:3000/th/booking?tab=survey");
await page.fill('input[name="name"]', "ทดสอบ นัดสำรวจ");
await page.fill('input[name="phone"]', "0898765432");
await page.fill('input[name="province"]', "กรุงเทพมหานคร");
await page.selectOption('select[name="buildingType"]', "COMMERCIAL");
await page.fill('textarea[name="address"]', "123/45 หมู่บ้านทดสอบ ถนนสุขุมวิท แขวงบางนา");
await page.fill('input[name="preferredDate"]', tomorrow);
await page.selectOption('select[name="timeSlot"]', "MORNING");
await page.setInputFiles('input[type="file"]', slipPath);
await page.click('button[type="submit"]');
await page.waitForSelector("text=ส่งการนัดเรียบร้อยแล้ว", { timeout: 15000 });
console.log("SURVEY: success screen shown ✓");

await browser.close();
