import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
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

// --- Sprint 6 Task 9: admin visibility of public-submitted fields
// (buildingTypeOtherText, interestedSystems) — check against the QUOTE lead
// created by e2e-booking.mts, which is the only lead with buildingType
// OTHER + interestedSystems set.
const quoteLeadForDisplay = await prisma.lead.findFirst({
  where: { phone: "0812345678" },
  orderBy: { createdAt: "desc" },
});
if (quoteLeadForDisplay) {
  await page.goto(`http://localhost:3000/admin/leads/${quoteLeadForDisplay.id}`);
  await page.waitForSelector("text=ขอใบเสนอราคา", { timeout: 10000 });
  const bodyText = (await page.textContent("body")) ?? "";
  console.log(
    `LEAD DETAIL: buildingTypeOtherText shown for OTHER building type ${
      bodyText.includes("โกดังเก็บของ") ? "✓" : "✗ FAIL"
    }`
  );
  console.log(
    `LEAD DETAIL: interestedSystems shown as badges ${
      bodyText.includes("On-Grid") || bodyText.includes("ออนกริด") ? "✓" : "✗ FAIL"
    }`
  );
  console.log(
    `LEAD DETAIL: public-submitted notes pre-filled in notes box ${
      bodyText.includes("ทดสอบหมายเหตุจากฟอร์มสาธารณะ") ? "✓" : "✗ FAIL"
    }`
  );
} else {
  console.log("LEAD DETAIL: Sprint 6 field checks ✗ FAIL (quote lead not found — run e2e-booking.mts first)");
}

// Navigate back to the SURVEY lead detail (the rest of this script's leads
// section operates on it) since the block above detoured to the quote lead.
await page.goto("http://localhost:3000/admin/leads");
await page.click("text=ทดสอบ นัดสำรวจ");
await page.waitForSelector("text=ข้อมูลการนัดสำรวจ", { timeout: 10000 });

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
  await page.waitForSelector("text=ตรวจสลิปแล้ว", { timeout: 10000 });
  console.log("LEAD DETAIL: payment verified ✓");
} else {
  await page.waitForSelector("text=ตรวจสลิปแล้ว", { timeout: 5000 });
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

// --- Services: create + delete round trip, asserting the audit rows the
// audited-mutation module writes for each. The edit test above only exercises
// UPDATE; without this, the CREATE and DELETE paths (and their snapshot
// shapes) are never run. Self-cleaning: the row it creates is the row it
// deletes. ---
const throwawayTitle = `บริการทดสอบ ${Date.now().toString(36)}`;
await page.click("text=เพิ่มบริการ");
await page.locator('input[name="titleTh"]').waitFor({ timeout: 5000 });
await page.fill('input[name="titleTh"]', throwawayTitle);
await page.fill('textarea[name="descriptionTh"]', "รายละเอียดทดสอบสำหรับสคริปต์ e2e");
// The EN fields live in the other tab panel — kept mounted so they submit with
// the form, but not visible until the tab is selected.
await page.click('button:text-is("English")');
await page.fill('input[name="titleEn"]', `E2E Throwaway Service ${Date.now().toString(36)}`);
await page.fill('textarea[name="descriptionEn"]', "Throwaway description for the e2e script");
await page.click("text=บันทึก >> nth=-1");
// Wait for the row itself, not the toast: the previous step's toast is still
// on screen and would match immediately, letting the DB read below race the
// server action.
await page.waitForSelector(`tr:has-text("${throwawayTitle}")`, { timeout: 10000 });

const created = await prisma.service.findFirst({
  where: { titleTh: throwawayTitle },
  orderBy: { createdAt: "desc" },
});
console.log(`SERVICES: created via dialog ${created ? "✓" : "✗ FAIL"}`);

const createLog = created
  ? await prisma.auditLog.findFirst({
      where: { entityType: "Service", entityId: created.id, action: "CREATE" },
    })
  : null;
console.log(
  `SERVICES: CREATE audit row written with an after snapshot and no before ${
    createLog && createLog.after != null && createLog.before == null ? "✓" : "✗ FAIL"
  }`
);

await page.click(`tr:has-text("${throwawayTitle}") button[aria-label="ลบ"]`);
await page.click('button:text-is("ลบ")');
await page.waitForSelector(`tr:has-text("${throwawayTitle}")`, {
  state: "detached",
  timeout: 10000,
});

const stillThere = created
  ? await prisma.service.findUnique({ where: { id: created.id } })
  : null;
console.log(`SERVICES: deleted via dialog ${stillThere === null ? "✓" : "✗ FAIL"}`);

const deleteLog = created
  ? await prisma.auditLog.findFirst({
      where: { entityType: "Service", entityId: created.id, action: "DELETE" },
    })
  : null;
console.log(
  `SERVICES: DELETE audit row written with a before snapshot and no after ${
    deleteLog && deleteLog.before != null && deleteLog.after == null ? "✓" : "✗ FAIL"
  }`
);

// --- Users: toggle a non-admin account off and back on, so the AdminUser
// projection snapshot (which must never carry passwordHash) is actually
// produced by a run rather than asserted vacuously. ---
const salesUser = await prisma.adminUser.findFirst({
  where: { role: "SALES", isActive: true },
});
if (!salesUser) {
  console.log("USERS: no active SALES user seeded — skipping toggle test ✗ FAIL");
} else {
  await page.goto("http://localhost:3000/admin/users");
  await page.waitForSelector(`text=${salesUser.email}`, { timeout: 10000 });
  const rowSel = `tr:has-text("${salesUser.email}")`;
  await page.click(`${rowSel} button[aria-label="ปิดใช้งาน"]`);
  await page.waitForSelector("text=ปิดการใช้งานแล้ว", { timeout: 10000 });
  const disabled = await prisma.adminUser.findUnique({ where: { id: salesUser.id } });
  console.log(`USERS: toggled inactive ${disabled?.isActive === false ? "✓" : "✗ FAIL"}`);

  await page.click(`${rowSel} button[aria-label="เปิดใช้งาน"]`);
  await page.waitForSelector("text=เปิดการใช้งานแล้ว", { timeout: 10000 });
  const restored = await prisma.adminUser.findUnique({ where: { id: salesUser.id } });
  console.log(`USERS: toggled back to active ${restored?.isActive === true ? "✓" : "✗ FAIL"}`);

  const userLog = await prisma.auditLog.findFirst({
    where: { entityType: "AdminUser", entityId: salesUser.id, action: "UPDATE" },
    orderBy: { createdAt: "desc" },
  });
  const snapshotKeys = userLog?.after ? Object.keys(userLog.after as object).sort() : [];
  console.log(
    `USERS: AdminUser snapshot is the declared projection, no passwordHash ${
      JSON.stringify(snapshotKeys) ===
      JSON.stringify(
        ["id", "email", "name", "role", "isActive", "linkedChannelExecutiveId"].sort()
      )
        ? "✓"
        : `✗ FAIL (${JSON.stringify(snapshotKeys)})`
    }`
  );
}

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

// Clear the search filter, then exercise the status filter dropdown
// separately (Sprint 9 gap: previously only the search filter was covered).
await page.fill('input[placeholder="ค้นหาเลขที่จอง/ชื่อ/เบอร์..."]', "");
await page.keyboard.press("Enter");
await page.waitForSelector("text=ทดสอบ ใบเสนอราคา", { timeout: 10000 }).catch(() => {});

const bookingsBeforeFilter = await prisma.surveyBooking.count({
  where: { status: "PENDING_CONFIRMATION" },
});
await page.selectOption("select >> nth=0", "PENDING_CONFIRMATION");
await page.waitForTimeout(500); // debounced query settle
const filteredRowCount = await page.locator("table tbody tr").count();
console.log(
  `BOOKINGS: status filter narrows results (${filteredRowCount} rows, ${bookingsBeforeFilter} PENDING_CONFIRMATION in DB) ${
    filteredRowCount <= bookingsBeforeFilter ? "✓" : "✗ FAIL"
  }`
);
// Reset the filter back to "ทุกสถานะ" for the rest of the script.
await page.selectOption("select >> nth=0", "");

await page.locator("table tbody tr td a").first().click();
await page.waitForSelector("text=มอบหมายงาน", { timeout: 10000 });
console.log("BOOKING DETAIL: loaded ✓");

// bookingNumber format (Sprint 3 spec: auto "KKD-YYYYMMDD-NNN")
const bookingIdFromUrl = page.url().split("/").pop()!;
const bookingRow = await prisma.surveyBooking.findUniqueOrThrow({
  where: { id: bookingIdFromUrl },
});
console.log(
  `BOOKING DETAIL: bookingNumber matches KKD-YYYYMMDD-NNN format ${
    /^KKD-\d{8}-\d{3}$/.test(bookingRow.bookingNumber) ? "✓" : "✗ FAIL"
  }`
);

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
await page.click("#s-capacity-submit");
await page.waitForSelector("text=บันทึกการตั้งค่าเรียบร้อย", { timeout: 10000 });
console.log("SETTINGS: capacity updated ✓");

await maxPerDayInput.fill(originalMaxPerDay);
await page.click("#s-capacity-submit");
await page.waitForSelector("text=บันทึกการตั้งค่าเรียบร้อย", { timeout: 10000 });
console.log("SETTINGS: capacity restored ✓");

// --- Payment settings (Sprint 6 Task 6): ADMIN edits via withAudit, saved
// value matches DB directly (edit + restore, like capacity above). ---
const promptpayIdInput = page.locator('input[name="promptpayId"]');
await promptpayIdInput.waitFor({ timeout: 5000 });
const originalPromptpayId = await promptpayIdInput.inputValue();
const bumpedPromptpayId = "0899999999";

await promptpayIdInput.fill(bumpedPromptpayId);
await page.click("#p-payment-submit");
await page.waitForSelector("text=บันทึกข้อมูลการชำระเงินเรียบร้อย", { timeout: 10000 });
const paymentSettingsAfterUpdate = await prisma.paymentSettings.findFirst();
console.log(
  `PAYMENT SETTINGS: ADMIN edit persists in DB ${
    paymentSettingsAfterUpdate?.promptpayId === bumpedPromptpayId ? "✓" : "✗ FAIL"
  }`
);

const paymentAuditRow = await prisma.auditLog.findFirst({
  where: { entityType: "PaymentSettings", action: "UPDATE" },
  orderBy: { createdAt: "desc" },
});
console.log(
  `PAYMENT SETTINGS: mutation recorded via withAudit ${paymentAuditRow ? "✓" : "✗ FAIL"}`
);

await promptpayIdInput.fill(originalPromptpayId);
await page.click("#p-payment-submit");
await page.waitForSelector("text=บันทึกข้อมูลการชำระเงินเรียบร้อย", { timeout: 10000 });
console.log("PAYMENT SETTINGS: restored ✓");

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
  "ประเภทระบบ",
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

// Sprint 6 Task 10: "ประเภทระบบ" (interestedSystems) sits directly after
// "ประเภท Lead", closing the gap Sprint 5 intentionally deferred.
const leadTypeIdx = headerCells.indexOf("ประเภท Lead");
const interestedSystemsIdx = headerCells.indexOf("ประเภทระบบ");
console.log(
  `REPORTS: export "ประเภทระบบ" column positioned right after "ประเภท Lead" ${
    leadTypeIdx >= 0 && interestedSystemsIdx === leadTypeIdx + 1 ? "✓" : "✗ FAIL"
  }`
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

// The quote lead created by e2e-booking.mts has interestedSystems =
// ["ON_GRID","HYBRID"] — verify the export row renders it as Thai labels,
// comma-joined, not the raw enum values.
const exportRows = (sheet?.getRows(2, (sheet.rowCount ?? 1) - 1) ?? []).map(
  (row) => row.values as unknown[]
);
const quoteLeadRow = exportRows.find((row) =>
  row.some((cell) => typeof cell === "string" && cell.includes("ทดสอบ ใบเสนอราคา"))
);
// row.values is a raw exceljs array where index 0 is always empty/unused —
// headerCells was built by filtering out that undefined, so its indices are
// shifted by -1 relative to raw row.values; +1 corrects for that.
const quoteLeadSystemsCell =
  quoteLeadRow && interestedSystemsIdx >= 0
    ? quoteLeadRow[interestedSystemsIdx + 1]
    : undefined;
console.log(
  `REPORTS: export "ประเภทระบบ" value for quote lead is "On-Grid, Hybrid" ${
    quoteLeadSystemsCell === "On-Grid, Hybrid" ? "✓" : `✗ FAIL (got ${quoteLeadSystemsCell})`
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
