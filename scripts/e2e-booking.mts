import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium } from "playwright";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

// --- Route A: free quote (Sprint 6 fields: province dropdown, buildingType
// OTHER + free text, avgMonthlyBill dropdown bucket value, interestedSystems
// checkboxes, notes) ---
const quotePhone = "0812345678";
await page.goto("http://localhost:3000/th/booking?tab=quote");
await page.fill('input[name="name"]', "ทดสอบ ใบเสนอราคา");

// Invalid submit first: an 11-digit phone passed the old hand-written client
// rules but always failed the server schema — with the shared schema driving
// zodResolver, the form must now reject it inline with a field-level message
// (booking.errInvalidPhone) instead of the old opaque generic error.
await page.fill('input[name="phone"]', "0 12-345-67890");
await page.click('button[type="submit"]');
await page.waitForSelector("text=เบอร์โทรไม่ถูกต้อง", { timeout: 15000 });
console.log("QUOTE: invalid phone shows field-level error ✓");

await page.fill('input[name="phone"]', quotePhone);
await page.selectOption('select[name="province"]', "สมุทรปราการ");
await page.selectOption('select[name="buildingType"]', "OTHER");
await page.fill('input[name="buildingTypeOtherText"]', "โกดังเก็บของ");
await page.fill('textarea[name="notes"]', "ทดสอบหมายเหตุจากฟอร์มสาธารณะ");
await page.fill('input[name="referrerName"]', "คุณทดสอบ ผู้แนะนำ");
await page.selectOption('select[name="avgMonthlyBillBucket"]', "7500"); // 5,000-10,000 bucket
await page.check('input[name="interestedSystems"][value="ON_GRID"]');
await page.check('input[name="interestedSystems"][value="HYBRID"]');
await page.click('button[type="submit"]');
await page.waitForSelector("text=ส่งข้อมูลสำเร็จ", { timeout: 15000 });
console.log("QUOTE: success screen shown ✓");

const quoteLead = await prisma.lead.findFirst({
  where: { phone: quotePhone },
  orderBy: { createdAt: "desc" },
});
console.log(
  `QUOTE: province saved ✓ ${quoteLead?.province === "สมุทรปราการ" ? "" : "✗ FAIL"}`.trim()
);
console.log(
  `QUOTE: buildingType=OTHER + buildingTypeOtherText saved ${
    quoteLead?.buildingType === "OTHER" && quoteLead.buildingTypeOtherText === "โกดังเก็บของ"
      ? "✓"
      : "✗ FAIL"
  }`
);
console.log(
  `QUOTE: customerMessage saved ${
    quoteLead?.customerMessage === "ทดสอบหมายเหตุจากฟอร์มสาธารณะ" ? "✓" : "✗ FAIL"
  }`
);
console.log(
  `QUOTE: avgMonthlyBill bucket value saved ${quoteLead?.avgMonthlyBill === 7500 ? "✓" : "✗ FAIL"}`
);
console.log(
  `QUOTE: referrerName saved ${
    quoteLead?.referrerName === "คุณทดสอบ ผู้แนะนำ" ? "✓" : "✗ FAIL"
  }`
);
const interestedSystems = Array.isArray(quoteLead?.interestedSystems)
  ? (quoteLead!.interestedSystems as string[])
  : null;
console.log(
  `QUOTE: interestedSystems saved as ["ON_GRID","HYBRID"] ${
    interestedSystems &&
    interestedSystems.length === 2 &&
    interestedSystems.includes("ON_GRID") &&
    interestedSystems.includes("HYBRID")
      ? "✓"
      : "✗ FAIL"
  }`
);

// --- Route A2: link context (#18 chunk 2 + chunk 5) — a booking link with
// ?package= and an off-bucket ?bill= should reach the server-validated slug
// column and the "OTHER" bill fallback, without the user touching either
// field. ---
const linkPhone = "0865551234";
const existingPackage = await prisma.package.findFirst({
  where: { isPublished: true },
  select: { slug: true },
});
if (!existingPackage) {
  throw new Error("no published Package in DB — seed data required for this check");
}
await page.goto(
  `http://localhost:3000/th/booking?tab=quote&package=${existingPackage.slug}&bill=4200`
);
await page.fill('input[name="name"]', "ทดสอบ ลิงก์แพ็กเกจ");
await page.fill('input[name="phone"]', linkPhone);
await page.selectOption('select[name="province"]', "เชียงใหม่");
await page.selectOption('select[name="buildingType"]', "RESIDENTIAL");
console.log(
  `LINK: bill=4200 (off-bucket) auto-selects OTHER and prefills the number ${
    (await page.inputValue('input[name="avgMonthlyBill"]')) === "4200" ? "✓" : "✗ FAIL"
  }`
);
await page.click('button[type="submit"]');
await page.waitForSelector("text=ส่งข้อมูลสำเร็จ", { timeout: 15000 });
const linkLead = await prisma.lead.findFirst({
  where: { phone: linkPhone },
  orderBy: { createdAt: "desc" },
});
console.log(
  `LINK: interestedPackageSlug + off-bucket avgMonthlyBill saved ${
    linkLead?.interestedPackageSlug === existingPackage.slug && linkLead?.avgMonthlyBill === 4200
      ? "✓"
      : "✗ FAIL"
  }`
);

// --- Route B: survey with slip upload ---
// 1x1 red pixel PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);
const dir = mkdtempSync(path.join(tmpdir(), "slip-"));
const slipPath = path.join(dir, "slip.png");
writeFileSync(slipPath, png);

// Spread across a wide window (2-301 days out, deterministic-but-varying per
// run — same convention as the unique-suffix idempotency trick used in
// e2e-admin-crud.mts) so repeated runs don't all pile onto the same
// preferredDate and eventually collide with BookingCapacitySetting.
const daysOut = 2 + (Date.now() % 300);
const surveyDate = new Date(Date.now() + daysOut * 86400000)
  .toISOString()
  .split("T")[0];
const surveyPhone = "0898765432";
await page.goto("http://localhost:3000/th/booking?tab=survey");
await page.fill('input[name="name"]', "ทดสอบ นัดสำรวจ");
await page.fill('input[name="phone"]', surveyPhone);
await page.selectOption('select[name="province"]', "กรุงเทพมหานคร");
await page.selectOption('select[name="buildingType"]', "COMMERCIAL");
await page.fill('textarea[name="notes"]', "หมายเหตุนัดสำรวจทดสอบ");
await page.fill('input[name="referrerName"]', "คุณทดสอบ ผู้แนะนำ 2");
await page.fill('textarea[name="address"]', "123/45 หมู่บ้านทดสอบ ถนนสุขุมวิท แขวงบางนา");
await page.fill('input[name="preferredDate"]', surveyDate);
await page.selectOption('select[name="timeSlot"]', "MORNING");
// #18 chunk 5 (gap G4): avgMonthlyBill/interestedSystems moved from
// quoteSchema up to baseLeadSchema, so the survey tab now captures them too.
await page.selectOption('select[name="avgMonthlyBillBucket"]', "3500"); // 2,000-5,000 bucket
await page.check('input[name="interestedSystems"][value="OFF_GRID"]');
await page.setInputFiles('input[type="file"]', slipPath);
await page.click('button[type="submit"]');
await page.waitForSelector("text=ส่งการนัดเรียบร้อยแล้ว", { timeout: 15000 });
console.log("SURVEY: success screen shown ✓");

const surveyLead = await prisma.lead.findFirst({
  where: { phone: surveyPhone },
  orderBy: { createdAt: "desc" },
});
console.log(
  `SURVEY: province + customerMessage saved ${
    surveyLead?.province === "กรุงเทพมหานคร" &&
    surveyLead.customerMessage === "หมายเหตุนัดสำรวจทดสอบ"
      ? "✓"
      : "✗ FAIL"
  }`
);
const surveyInterestedSystems = Array.isArray(surveyLead?.interestedSystems)
  ? (surveyLead!.interestedSystems as string[])
  : null;
console.log(
  `SURVEY: avgMonthlyBill + interestedSystems now captured too (gap G4) ${
    surveyLead?.avgMonthlyBill === 3500 &&
    surveyInterestedSystems?.length === 1 &&
    surveyInterestedSystems.includes("OFF_GRID")
      ? "✓"
      : "✗ FAIL"
  }`
);
console.log(
  `SURVEY: referrerName saved ${
    surveyLead?.referrerName === "คุณทดสอบ ผู้แนะนำ 2" ? "✓" : "✗ FAIL"
  }`
);

await browser.close();
await prisma.$disconnect();
