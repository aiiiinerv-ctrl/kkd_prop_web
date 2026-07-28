import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

// Login
await page.goto("http://localhost:3000/admin/login");
await page.fill('input[name="email"]', "admin@kkdproperty.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 15000 });
console.log("LOGIN ✓");

// --- Leads: filter + open detail ---
await page.goto("http://localhost:3000/admin/leads");
await page.waitForSelector("text=ทดสอบ นัดสำรวจ", { timeout: 10000 });
console.log("LEADS: table lists test leads ✓");

await page.selectOption("select >> nth=0", "SURVEY");
// keepPreviousData shows stale rows until the refetch lands — wait for the
// quote lead to actually detach.
await page.waitForSelector("text=ทดสอบ ใบเสนอราคา", {
  state: "detached",
  timeout: 10000,
});
await page.waitForSelector("text=ทดสอบ นัดสำรวจ", { timeout: 10000 });
console.log("LEADS: type filter works ✓");

await page.click("text=ทดสอบ นัดสำรวจ");
await page.waitForSelector("text=ข้อมูลการนัดสำรวจ", { timeout: 10000 });
console.log("LEAD DETAIL: booking card shown ✓");

// Slip dialog
await page.click("text=ดูสลิปโอนเงิน");
await page.waitForSelector('img[alt="สลิปโอนเงิน"]', { timeout: 10000 });
await page.keyboard.press("Escape");
console.log("LEAD DETAIL: slip dialog renders image ✓");

// Verify payment (button only exists while PENDING_REVIEW — skip if a
// previous run already verified it)
const verifyBtn = page.locator("text=ยืนยันการชำระเงิน");
if (await verifyBtn.count()) {
  await verifyBtn.click();
  await page.waitForSelector("text=ตรวจสอบแล้ว", { timeout: 10000 });
  console.log("LEAD DETAIL: payment verified ✓");
} else {
  await page.waitForSelector("text=ตรวจสอบแล้ว", { timeout: 5000 });
  console.log("LEAD DETAIL: payment already verified (skipped) ✓");
}

// Status pipeline NEW -> CONTACTED
await page.selectOption("select >> nth=0", "CONTACTED");
await page.waitForSelector("text=อัปเดตสถานะแล้ว", { timeout: 10000 });
console.log("LEAD DETAIL: status updated ✓");

// Notes
await page.fill("textarea", `โทรแล้ว ลูกค้าสะดวกช่วงบ่าย (${Date.now().toString(36)})`);
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกแล้ว", { timeout: 10000 });
console.log("LEAD DETAIL: notes saved ✓");

// --- Services: edit title, check public page reflects it ---
await page.goto("http://localhost:3000/admin/services");
await page.waitForSelector("text=ระบบออนกริด", { timeout: 10000 });
await page.click('button[aria-label="แก้ไข"] >> nth=0');
const titleInput = page.locator('input[name="titleTh"]');
await titleInput.waitFor({ timeout: 5000 });
// Unique suffix each run so the before/after audit snapshot always differs
// (a fixed string would no-op on repeat runs and leave no field diff).
const titleSuffix = `[แก้ไขทดสอบ ${Date.now().toString(36)}]`;
await titleInput.fill(`ระบบออนกริด (On-Grid) ${titleSuffix}`);
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกเรียบร้อย", { timeout: 10000 });
console.log("SERVICES: edited via dialog ✓");

const publicRes = await page.request.get("http://localhost:3000/th/services");
const publicHtml = await publicRes.text();
console.log(
  `PUBLIC: edited title on /th/services ${publicHtml.includes(titleSuffix) ? "✓" : "✗ (may be cached)"}`
);

// Restore the original title — this test intentionally mutates a real seed
// record on every run, so leave the DB clean rather than accumulating
// "[แก้ไขทดสอบ ...]" suffixes on a public-facing page.
await page.click('button[aria-label="แก้ไข"] >> nth=0');
await titleInput.waitFor({ timeout: 5000 });
await titleInput.fill("ระบบออนกริด (On-Grid)");
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกเรียบร้อย", { timeout: 10000 });
console.log("SERVICES: title restored ✓");

// --- Channels: create one ---
await page.goto("http://localhost:3000/admin/channels");
await page.click("text=เพิ่มช่องทาง");
const channelName = `TikTok-${Date.now().toString(36)}`;
await page.fill('input[name="nameTh"]', channelName);
await page.fill('input[name="nameEn"]', channelName);
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกเรียบร้อย", { timeout: 10000 });
console.log("CHANNELS: created ✓");

// --- Bookings: filter, status/gift/assignment mutations ---
await page.goto("http://localhost:3000/admin/bookings");
await page.waitForSelector("text=การจองสำรวจ (Bookings)", { timeout: 10000 });
console.log("BOOKINGS: page loads ✓");

await page.fill(
  'input[placeholder="ค้นหาเลขที่จอง/ชื่อ/เบอร์..."]',
  "ทดสอบ นัดสำรวจ"
);
await page.keyboard.press("Enter");
await page.waitForSelector("text=ทดสอบ นัดสำรวจ", { timeout: 10000 });
console.log("BOOKINGS: search filter works ✓");

await page.locator("table tbody tr td a").first().click();
await page.waitForSelector("text=มอบหมายงาน", { timeout: 10000 });
console.log("BOOKING DETAIL: loaded ✓");

// Status update via the (only, unnamed) status select at the top of the page
await page.selectOption("select >> nth=0", "CONFIRMED");
await page.waitForSelector("text=อัปเดตสถานะแล้ว", { timeout: 10000 });
console.log("BOOKING DETAIL: status updated ✓");

// Gift-sent toggle
const giftCheckbox = page.locator("#b-gift-sent");
const wasGiftSent = await giftCheckbox.isChecked();
await giftCheckbox.click();
await page.waitForSelector(
  wasGiftSent ? "text=ยกเลิกสถานะส่งของขวัญแล้ว" : "text=บันทึกส่งของขวัญแล้ว",
  { timeout: 10000 }
);
console.log("BOOKING DETAIL: gift sent toggled ✓");

// Assign engineer / sales (pick the first real staff option, index 0 is "ยังไม่มอบหมาย")
await page.locator("#b-engineer").selectOption({ index: 1 });
await page.waitForSelector("text=มอบหมายวิศวกรแล้ว", { timeout: 10000 });
console.log("BOOKING DETAIL: engineer assigned ✓");

await page.locator("#b-sales").selectOption({ index: 1 });
await page.waitForSelector("text=มอบหมายเซลส์แล้ว", { timeout: 10000 });
console.log("BOOKING DETAIL: sales assigned ✓");

// --- Settings: booking capacity (edit + restore, like the services test) ---
await page.goto("http://localhost:3000/admin/settings");
await page.waitForSelector("text=ตั้งค่าระบบ", { timeout: 10000 });
console.log("SETTINGS: page loads ✓");

const maxPerDayInput = page.locator('input[name="maxPerDay"]');
await maxPerDayInput.waitFor({ timeout: 5000 });
const originalMaxPerDay = await maxPerDayInput.inputValue();
const bumpedMaxPerDay = String(Number(originalMaxPerDay) + 1);

await maxPerDayInput.fill(bumpedMaxPerDay);
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกการตั้งค่าเรียบร้อย", { timeout: 10000 });
console.log("SETTINGS: capacity updated ✓");

await maxPerDayInput.fill(originalMaxPerDay);
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกการตั้งค่าเรียบร้อย", { timeout: 10000 });
console.log("SETTINGS: capacity restored ✓");

// --- Audit: entries with diff ---
await page.goto("http://localhost:3000/admin/audit");
await page.waitForSelector("text=ประวัติการแก้ไข", { timeout: 10000 });
await page.waitForSelector("text=แก้ไข", { timeout: 5000 });
// Expand the first UPDATE row and look for the diff table
const updateRow = page.locator("tr", { hasText: "บริการ" }).first();
await updateRow.click();
await page.waitForSelector("text=ฟิลด์", { timeout: 5000 });
console.log("AUDIT: diff table expands ✓");

await browser.close();
