import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { chromium } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./prisma/dev.db" }),
});

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

// Grab the lead id from the URL so we can assert DB-level field behavior
// (lastFollowUpAt narrowing, assignedSalesId) directly rather than via
// fragile UI text formatting.
const leadDetailUrl = page.url();
const leadId = leadDetailUrl.split("/").pop()!;

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

// lastFollowUpAt narrowing (Sprint 4 Task 4): status changes must NOT touch
// it, only updateLeadNotes() should.
const leadBeforeStatus = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
const followUpBeforeStatus = leadBeforeStatus.lastFollowUpAt?.getTime() ?? null;

// Status pipeline NEW -> CONTACTED
await page.selectOption("select >> nth=0", "CONTACTED");
await page.waitForSelector("text=อัปเดตสถานะแล้ว", { timeout: 10000 });
console.log("LEAD DETAIL: status updated ✓");

const leadAfterStatus = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
const followUpAfterStatus = leadAfterStatus.lastFollowUpAt?.getTime() ?? null;
console.log(
  `LEAD DETAIL: lastFollowUpAt untouched by updateLeadStatus ${
    followUpAfterStatus === followUpBeforeStatus ? "✓" : "✗ FAIL"
  }`
);

// Notes
await page.fill("textarea", `โทรแล้ว ลูกค้าสะดวกช่วงบ่าย (${Date.now().toString(36)})`);
await page.click("text=บันทึก >> nth=-1");
await page.waitForSelector("text=บันทึกแล้ว", { timeout: 10000 });
console.log("LEAD DETAIL: notes saved ✓");

const leadAfterNotes = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
const followUpAfterNotes = leadAfterNotes.lastFollowUpAt?.getTime() ?? null;
console.log(
  `LEAD DETAIL: lastFollowUpAt set by updateLeadNotes ${
    followUpAfterNotes !== null && followUpAfterNotes !== followUpAfterStatus ? "✓" : "✗ FAIL"
  }`
);

// Sales assignment (ADMIN-only) — pick the first real SALES option (index 0
// is "ไม่ระบุ") and confirm the FK persists.
await page.locator("#lead-sales").selectOption({ index: 1 });
await page.waitForSelector("text=มอบหมายเซลส์แล้ว", { timeout: 10000 });
const leadAfterAssign = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
const assignedUser = leadAfterAssign.assignedSalesId
  ? await prisma.adminUser.findUnique({ where: { id: leadAfterAssign.assignedSalesId } })
  : null;
console.log(
  `LEAD DETAIL: sales assigned, FK resolves to an active SALES user ${
    assignedUser?.role === "SALES" && assignedUser.isActive ? "✓" : "✗ FAIL"
  }`
);

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

// --- closedAt narrowing (Sprint 5b Task 4): set only on first entry into
// SIGNED, untouched on further transitions to INSTALLING/COMPLETED. This
// permanently drives status forward to COMPLETED (closedAt is sticky by
// design — see docs/plans/sprint-5b-reports-gap-tasks.md), so unlike the
// CONTACTED toggle above, reusing the shared seed lead here would make the
// "closedAt is null before SIGNED" assertion fail on every re-run after the
// first. Create a disposable QUOTE lead instead, mirroring the CHANNELS
// "create fresh with unique data" idempotency pattern above.
const closedAtLead = await prisma.lead.create({
  data: {
    type: "QUOTE",
    status: "CONTACTED",
    name: `ทดสอบ closedAt ${Date.now().toString(36)}`,
    phone: "0800000000",
    province: "กรุงเทพมหานคร",
    buildingType: "RESIDENTIAL",
  },
});
const closedAtLeadId = closedAtLead.id;

await page.goto(`http://localhost:3000/admin/leads/${closedAtLeadId}`);
await page.waitForSelector("text=ขอใบเสนอราคา", { timeout: 10000 });

const leadBeforeSigned = await prisma.lead.findUniqueOrThrow({ where: { id: closedAtLeadId } });
console.log(
  `LEAD DETAIL: closedAt is null before entering SIGNED ${
    leadBeforeSigned.closedAt === null ? "✓" : "✗ FAIL"
  }`
);

await page.selectOption("select >> nth=0", "SIGNED");
await page.waitForSelector("text=อัปเดตสถานะแล้ว", { timeout: 10000 });
const leadAfterSigned = await prisma.lead.findUniqueOrThrow({ where: { id: closedAtLeadId } });
console.log(
  `LEAD DETAIL: closedAt set on first transition to SIGNED ${
    leadAfterSigned.closedAt !== null ? "✓" : "✗ FAIL"
  }`
);
const closedAtAfterSigned = leadAfterSigned.closedAt?.getTime() ?? null;

await page.selectOption("select >> nth=0", "INSTALLING");
await page.waitForSelector("text=อัปเดตสถานะแล้ว", { timeout: 10000 });
const leadAfterInstalling = await prisma.lead.findUniqueOrThrow({ where: { id: closedAtLeadId } });
console.log(
  `LEAD DETAIL: closedAt unchanged on transition to INSTALLING ${
    leadAfterInstalling.closedAt?.getTime() === closedAtAfterSigned ? "✓" : "✗ FAIL"
  }`
);

await page.selectOption("select >> nth=0", "COMPLETED");
await page.waitForSelector("text=อัปเดตสถานะแล้ว", { timeout: 10000 });
const leadAfterCompleted = await prisma.lead.findUniqueOrThrow({ where: { id: closedAtLeadId } });
console.log(
  `LEAD DETAIL: closedAt unchanged on transition to COMPLETED ${
    leadAfterCompleted.closedAt?.getTime() === closedAtAfterSigned ? "✓" : "✗ FAIL"
  }`
);

// --- Reports: dashboard breakdown + Excel export (Sprint 5, extended Sprint 5b) ---
await page.goto("http://localhost:3000/admin/reports");
await page.waitForSelector("text=รายงาน", { timeout: 10000 });
await page.waitForSelector("text=รายได้รวม (บาท)", { timeout: 10000 });
console.log("REPORTS: dashboard page loads ✓");

await page.waitForSelector("text=แยกตามช่องทาง", { timeout: 10000 });
console.log("REPORTS: breakdown cards render ✓");

// Month-preset buttons (Sprint 5b Task 9) — clicking "เดือนนี้" should
// populate both date inputs without erroring.
await page.click("text=เดือนนี้");
const rFromValue = await page.locator("#r-from").inputValue();
console.log(`REPORTS: month preset "เดือนนี้" fills from-date ${rFromValue ? "✓" : "✗ FAIL"}`);
await page.click("text=กำหนดเอง");
await page.fill("#r-from", "");
await page.fill("#r-to", "");
console.log("REPORTS: preset cleared back to custom range ✓");

// Revenue formula (Task 1 decision): SUM(amountThb) of bookings whose
// status is NOT IN (PENDING_CONFIRMATION, CANCELLED) — computed here
// directly against the DB, independent of aggregate.ts, as a ground truth
// to cross-check the dashboard total against.
const confirmedBookings = await prisma.surveyBooking.findMany({
  where: { status: { notIn: ["PENDING_CONFIRMATION", "CANCELLED"] } },
  select: { amountThb: true },
});
const expectedRevenue = confirmedBookings.reduce((sum, b) => sum + b.amountThb, 0);

const summaryRes = await page.request.get("http://localhost:3000/api/admin/reports/summary");
const summaryJson = await summaryRes.json();
console.log(
  `REPORTS: summary API status 200 ${summaryRes.status() === 200 ? "✓" : "✗ FAIL"}`
);
console.log(
  `REPORTS: totalRevenueThb matches SUM(amountThb) of non-pending/cancelled bookings (${summaryJson.totalRevenueThb} === ${expectedRevenue}) ${
    summaryJson.totalRevenueThb === expectedRevenue ? "✓" : "✗ FAIL"
  }`
);

// Dashboard-rendered total must match the same number (Task 5/6 risk: the
// two must never drift apart since they share the same revenue helper).
await page.waitForSelector(`text=฿${expectedRevenue.toLocaleString("th-TH")}`, {
  timeout: 10000,
});
console.log("REPORTS: dashboard-rendered total matches API total ✓");

// --- Sprint 5b: closedLeadCount/closeRatePercent per channel/executive/sales
// must match ground truth computed directly from the DB (same style as the
// revenue cross-check above). Close-rate is defined by CURRENT status in
// {SIGNED, INSTALLING, COMPLETED} (aggregate.ts CLOSED_LEAD_STATUSES).
const CLOSED_STATUSES = ["SIGNED", "INSTALLING", "COMPLETED"];
const allLeadsForClose = await prisma.lead.findMany({
  select: {
    status: true,
    sourceChannelId: true,
    autoSourceChannelId: true,
    autoSourceExecutiveId: true,
    assignedSalesId: true,
  },
});

function groundTruthCloseRate(matcher: (l: (typeof allLeadsForClose)[number]) => boolean) {
  const matched = allLeadsForClose.filter(matcher);
  const closed = matched.filter((l) => CLOSED_STATUSES.includes(l.status)).length;
  return { leadCount: matched.length, closedLeadCount: closed };
}

let closeRateMismatch = false;
for (const c of summaryJson.channelBreakdown as {
  channelId: string | null;
  leadCount: number;
  closedLeadCount: number;
  closeRatePercent: number;
}[]) {
  const expected = groundTruthCloseRate(
    (l) =>
      (c.channelId === null && !l.sourceChannelId && !l.autoSourceChannelId) ||
      l.autoSourceChannelId === c.channelId ||
      (!l.autoSourceChannelId && l.sourceChannelId === c.channelId)
  );
  if (
    expected.leadCount !== c.leadCount ||
    expected.closedLeadCount !== c.closedLeadCount
  ) {
    closeRateMismatch = true;
  }
}
for (const s of summaryJson.salesBreakdown as {
  salesId: string;
  leadCount: number;
  closedLeadCount: number;
}[]) {
  const expected = groundTruthCloseRate((l) => l.assignedSalesId === s.salesId);
  if (expected.leadCount !== s.leadCount || expected.closedLeadCount !== s.closedLeadCount) {
    closeRateMismatch = true;
  }
}
for (const e of summaryJson.executiveBreakdown as {
  executiveId: string;
  leadCount: number;
  closedLeadCount: number;
}[]) {
  const expected = groundTruthCloseRate((l) => l.autoSourceExecutiveId === e.executiveId);
  if (expected.leadCount !== e.leadCount || expected.closedLeadCount !== e.closedLeadCount) {
    closeRateMismatch = true;
  }
}
console.log(
  `REPORTS: closedLeadCount/closeRatePercent per channel/sales/executive matches DB ground truth ${
    closeRateMismatch ? "✗ FAIL" : "✓"
  }`
);

// Export .xlsx: parseable, header row matches EXPORT_COLUMNS, row count
// matches the same lead-scope query the export route uses (QUOTE+SURVEY,
// no date/channel/executive/sales filter applied here).
const exportRes = await page.request.get("http://localhost:3000/api/admin/reports/export");
console.log(`REPORTS: export API status 200 ${exportRes.status() === 200 ? "✓" : "✗ FAIL"}`);
const contentDisposition = exportRes.headers()["content-disposition"] ?? "";
console.log(
  `REPORTS: export has attachment Content-Disposition ${
    contentDisposition.includes("attachment") && contentDisposition.includes(".xlsx")
      ? "✓"
      : "✗ FAIL"
  }`
);

const exportBuffer = await exportRes.body();
const ExcelJS = await import("exceljs");
const workbook = new ExcelJS.default.Workbook();
await workbook.xlsx.load(exportBuffer as unknown as ArrayBuffer);
const sheet = workbook.getWorksheet("รายงาน");
const headerRow = sheet?.getRow(1).values as unknown[];
const headerCells = (headerRow ?? []).filter((v): v is string => typeof v === "string");
const expectedHeaders = [
  "ชื่อ",
  "เบอร์โทร",
  "ที่อยู่",
  "ประเภท Lead",
  "ช่องทาง",
  "ผู้ดำเนินการ",
  "เซลส์",
  "สถานะ",
  "วันที่",
  "วันที่ปิดการขาย",
  "เข้าสำรวจแล้วหรือไม่",
  "ส่งของขวัญแล้วหรือไม่",
];
const headersMatch = expectedHeaders.every((h) => headerCells.includes(h));
console.log(`REPORTS: export headers match field list ${headersMatch ? "✓" : "✗ FAIL"}`);
// "ระบบ" is intentionally deferred to Sprint 6 (no Lead field yet) — must
// NOT appear as an empty placeholder column.
console.log(
  `REPORTS: export has no "ระบบ" placeholder column ${!headerCells.includes("ระบบ") ? "✓" : "✗ FAIL"}`
);

// Sprint 5b Task 6: "วันที่ปิดการขาย" must sit between "วันที่" (createdAt)
// and "เข้าสำรวจแล้วหรือไม่" (surveyed), matching the PDF §4.5 field order.
const createdAtIdx = headerCells.indexOf("วันที่");
const closedAtIdx = headerCells.indexOf("วันที่ปิดการขาย");
const surveyedIdx = headerCells.indexOf("เข้าสำรวจแล้วหรือไม่");
console.log(
  `REPORTS: export "วันที่ปิดการขาย" column positioned between createdAt and surveyed ${
    createdAtIdx >= 0 && closedAtIdx === createdAtIdx + 1 && surveyedIdx === closedAtIdx + 1
      ? "✓"
      : "✗ FAIL"
  }`
);

const totalLeads = await prisma.lead.count();
const exportRowCount = (sheet?.rowCount ?? 1) - 1; // minus header row
console.log(
  `REPORTS: export row count matches Lead count (${exportRowCount} === ${totalLeads}) ${
    exportRowCount === totalLeads ? "✓" : "✗ FAIL"
  }`
);

await browser.close();
await prisma.$disconnect();
