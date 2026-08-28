import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { calculateSavings, CALCULATOR_DEFAULTS } from "../src/lib/calculator.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

function pass(msg: string) {
  console.log(`${msg} ✓`);
}

function fail(msg: string): never {
  throw new Error(`${msg} ✗ FAIL`);
}

await page.goto("http://localhost:3000/admin/login");
await page.fill('input[name="email"]', "admin@kkdproperty.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 15000 });
pass("LOGIN");

await page.goto("http://localhost:3000/admin/pages/calculator");
await page.click('text=ตัวเลขการคำนวณ');
await page.waitForSelector("#calc-price-kwh", { timeout: 10000 });
pass("CALC CONFIG: admin tab visible");

const testPrice = 5.5;
await page.fill("#calc-price-kwh", String(testPrice));
await page.click("#calc-config-submit");
await page.waitForSelector("text=บันทึกตัวเลขการคำนวณแล้ว", { timeout: 15000 });
pass("CALC CONFIG: save toast");

const row = await prisma.calculatorConfig.findFirst();
if (!row || row.pricePerKwhThb !== testPrice) {
  fail("CALC CONFIG: DB price not updated");
}

const params = {
  ...CALCULATOR_DEFAULTS,
  pricePerKwhThb: testPrice,
};
const expected = calculateSavings("3500", [], params);
if (!expected) {
  fail("CALC CONFIG: calculateSavings returned null");
}
const savingText = `฿${expected.monthlySaving.toLocaleString("th-TH")}`;
await page.goto("http://localhost:3000/th/calculator");
await page.fill("#monthly-bill", "3500");
await page.waitForFunction(
  (text) => document.body.innerText.includes(text),
  savingText,
  { timeout: 10000 }
);
pass("CALC CONFIG: public /th/calculator reflects new price");

await page.goto("http://localhost:3000/admin/pages/calculator");
await page.click('text=ตัวเลขการคำนวณ');
await page.waitForSelector("#calc-price-kwh", { timeout: 10000 });
page.once("dialog", (d) => d.accept());
await page.click('button:has-text("คืนค่าเริ่มต้น")');
await page.waitForSelector("text=คืนค่าเริ่มต้นแล้ว", { timeout: 15000 });
const resetRow = await prisma.calculatorConfig.findFirst();
if (!resetRow || resetRow.pricePerKwhThb !== CALCULATOR_DEFAULTS.pricePerKwhThb) {
  fail("CALC CONFIG: reset failed");
}

const audit = await prisma.auditLog.findFirst({
  where: { entityType: "CalculatorConfig" },
  orderBy: { createdAt: "desc" },
});
if (!audit) {
  fail("CALC CONFIG: no audit log");
}
pass("CALC CONFIG: reset + audit log");

await browser.close();
await prisma.$disconnect();
console.log("CALC CONFIG LIVE-VERIFY: all checks passed");
