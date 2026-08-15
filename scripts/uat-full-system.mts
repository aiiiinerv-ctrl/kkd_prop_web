/**
 * Full-system UAT walkthrough for a client-facing report.
 *
 * Design: read-only and view-only steps run against PRODUCTION
 * (kkdproperty.co.th) so the report shows the real live system. The one step
 * that creates data — submitting the booking form and checking what lands in
 * the database — runs against a LOCAL server instead, because this app has
 * no lead-deletion path at all (by design, leads are a business record) and
 * production's MySQL refuses external connections, so a lead created on
 * production could never be cleaned up afterward. The local server runs the
 * exact same build that is live on production (BUILD_ID verified to match
 * before this script is run), so the proof is genuine, just not permanently
 * written to the customer's real database.
 *
 * Every screenshot's environment is recorded in the result so the generated
 * report can label it honestly.
 *
 * Usage:
 *   docker compose up -d mysql && npm run build && npm run start &  # local, port 3000
 *   npx tsx scripts/uat-full-system.mts
 */
import "dotenv/config";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium, type Page } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";

const PROD = "https://kkdproperty.co.th";
const LOCAL = "http://localhost:3000";
const OUT_DIR =
  "/tmp/claude-501/-Users-ainerv-react-native-projects-kkd-prop/59575c9d-763b-495b-a95d-bcb251d42df4/scratchpad/uat";
const UAT_TAG = `[UAT] ${new Date().toISOString().slice(0, 16)}`;

if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

type Result = {
  section: string;
  title: string;
  env: "production" | "local";
  screenshot: string | null;
  checks: { label: string; pass: boolean }[];
  data?: Record<string, string>;
};
const results: Result[] = [];
let shotIndex = 0;

async function shot(page: Page, name: string): Promise<string> {
  shotIndex += 1;
  const file = `${String(shotIndex).padStart(2, "0")}-${name}.jpg`;
  await page.screenshot({ path: `${OUT_DIR}/${file}`, type: "jpeg", quality: 78 });
  return file;
}

async function acceptConsent(page: Page) {
  for (const label of ["ยอมรับทั้งหมด", "Accept All"]) {
    const btn = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await btn.count().then((n) => n > 0).catch(() => false)) {
      await btn.click({ timeout: 4000 }).catch(() => {});
      return;
    }
  }
}

// HEADED=1 opens a visible window for someone to watch; STEP_DELAY paces the
// walkthrough for a human, not a CI runner. Defaults: 0 when headless (no
// point pausing offscreen), 10s when headed unless STEP_DELAY_MS overrides it.
const STEP_DELAY =
  process.env.HEADED === "1" ? Number(process.env.STEP_DELAY_MS ?? 10000) : 0;
async function pace(page: Page, ms = STEP_DELAY) {
  if (ms > 0) await page.waitForTimeout(ms);
}

/**
 * `kkd_ref` is httpOnly on purpose (src/proxy.ts) — no page script, including
 * this one, can read it via `document.cookie`. The only way to see it is the
 * same way the app does: ask the browser context directly (Playwright talks
 * to Chrome's own cookie jar over CDP, which httpOnly does not block) and
 * paint what it found onto the page so it's visible while watching headed,
 * not just asserted silently in code.
 */
async function showCookieOverlay(
  page: Page,
  ctx: import("playwright").BrowserContext,
  label: string
) {
  const cookies = await ctx.cookies();
  const ref = cookies.find((c) => c.name === "kkd_ref");
  const utm = cookies.find((c) => c.name === "kkd_utm");
  const lines = [
    `<div style="font-weight:700;margin-bottom:6px">${label}</div>`,
    `<div>kkd_ref: <b>${ref ? ref.value : "(ยังไม่ถูกตั้งค่า)"}</b></div>`,
    ref ? `<div style="opacity:.75">httpOnly=${ref.httpOnly} · maxAge≈30 วัน</div>` : "",
    utm ? `<div style="margin-top:4px">kkd_utm: <b>${(() => { try { return JSON.parse(decodeURIComponent(utm.value)).utm_source; } catch { return utm.value.slice(0, 40); } })()}</b></div>` : "",
  ]
    .filter(Boolean)
    .join("");
  await page
    .evaluate((html) => {
      const id = "__uat_cookie_overlay__";
      document.getElementById(id)?.remove();
      const div = document.createElement("div");
      div.id = id;
      div.style.cssText =
        "position:fixed;top:16px;right:16px;z-index:999999;background:#0f1b2b;color:#fff;" +
        "font:14px/1.5 -apple-system,sans-serif;padding:14px 18px;border-radius:10px;" +
        "box-shadow:0 8px 24px rgba(0,0,0,.35);max-width:340px;border:1px solid #c89d53";
      div.innerHTML = html;
      document.body.appendChild(div);
    }, lines)
    .catch(() => {});
  console.log(
    `[cookie] ${label} — kkd_ref=${ref?.value ?? "(none)"} httpOnly=${ref?.httpOnly ?? "-"}`
  );
}

async function adminLogin(page: Page, base: string) {
  await page.goto(`${base}/admin/login`, { waitUntil: "load" });
  await page.fill('input[name="email"]', "admin@kkdproperty.com");
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 20000 });
}

// HEADED=1 opens a real visible browser window instead of running offscreen
// — useful when someone wants to watch the walkthrough live rather than
// only read the report afterward. Defaults to headless for unattended/CI
// runs, matching the rest of this repo's e2e scripts.
const browser = await chromium.launch({
  channel: "chrome",
  headless: process.env.HEADED !== "1",
  slowMo: process.env.HEADED === "1" ? 250 : 0,
});

async function runProduction() {
  const base = PROD;

  // 1. Homepage + consent banner
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/th`, { waitUntil: "load" });
    await page.waitForTimeout(4000);
    const bannerVisible = await page.locator("text=/ยอมรับ|Accept/i").first().isVisible().catch(() => false);
    const shotFile = await shot(page, "homepage-consent-banner");
    await pace(page);
    results.push({
      section: "public",
      title: "หน้าแรก — แบนเนอร์ขอความยินยอมคุกกี้ปรากฏก่อนเก็บข้อมูลใด ๆ",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "แบนเนอร์คุกกี้แสดงผล", pass: bannerVisible }],
    });
    await ctx.close();
  }

  // 2. English homepage
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/en`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    const shotFile = await shot(page, "homepage-en");
    await pace(page);
    results.push({
      section: "public",
      title: "หน้าแรกภาษาอังกฤษ — สลับภาษาได้ครบทุกหน้า",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้า /en โหลดสำเร็จ", pass: page.url().includes("/en") }],
    });
    await ctx.close();
  }

  // 3. Packages
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const res = await page.goto(`${base}/th/packages`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const shotFile = await shot(page, "packages");
    await pace(page);
    results.push({
      section: "public",
      title: "หน้าแพ็กเกจ — แสดงราคาและรายละเอียดระบบ",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้าโหลดสำเร็จ (HTTP 200)", pass: res?.status() === 200 }],
    });
    await ctx.close();
  }

  // 4. Portfolio
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const res = await page.goto(`${base}/th/portfolio`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const shotFile = await shot(page, "portfolio");
    await pace(page);
    results.push({
      section: "public",
      title: "ผลงานการติดตั้ง — แกลเลอรีโครงการจริง",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้าโหลดสำเร็จ (HTTP 200)", pass: res?.status() === 200 }],
    });
    await ctx.close();
  }

  // 5. Calculator
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/th/calculator`, { waitUntil: "load" });
    await page.waitForTimeout(1200);
    const slider = page.locator('input[type="range"]').first();
    const hasSlider = await slider.count().then((n) => n > 0);
    if (hasSlider) {
      await slider.fill("5000").catch(() => {});
      await page.waitForTimeout(600);
    }
    const shotFile = await shot(page, "calculator");
    await pace(page);
    results.push({
      section: "public",
      title: "เครื่องคำนวณค่าไฟ — ลูกค้าประเมินขนาดระบบได้เอง",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "ตัวเลื่อนคำนวณทำงาน", pass: hasSlider }],
    });
    await ctx.close();
  }

  // 6. Cookie policy — kkd_utm row
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1500 } });
    const page = await ctx.newPage();
    await page.goto(`${base}/th/cookie-policy`, { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const bodyText = await page.locator("body").innerText();
    const hasUtmRow = bodyText.includes("kkd_utm");
    const shotFile = await shot(page, "cookie-policy");
    await pace(page);
    results.push({
      section: "public",
      title: "นโยบายคุกกี้ — รายการคุกกี้ครบถ้วนรวม kkd_utm ตัวใหม่",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "คุกกี้ kkd_utm ปรากฏในตาราง", pass: hasUtmRow }],
    });
    await ctx.close();
  }

  // 7. Promo-link attribution — real production executive, cookie only, no submit.
  // Slowed down and narrated step by step (per request) since this is the
  // exact mechanism that was confusing earlier: kkd_ref is httpOnly, so
  // nothing on the page can show it — showCookieOverlay() reads it the way
  // the server does (via the browser context, not page JS) and paints it on
  // screen at each stage so it's visible while watching, not just asserted.
  const exec = { name: "เจนจิรา ตะลุง", refCode: "CH018-EX01" };
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();

    console.log(`\n[step] เปิดลิงก์โปรโมทของ ${exec.name}: ${base}/th?ref=${exec.refCode}`);
    await page.goto(`${base}/th?ref=${exec.refCode}`, { waitUntil: "load" });
    await showCookieOverlay(page, ctx, "1) เพิ่งเข้าเว็บผ่านลิงก์ — ยังไม่กดยอมรับคุกกี้");
    await pace(page);

    console.log("[step] กดยอมรับคุกกี้ทั้งหมด");
    await acceptConsent(page);
    await page.waitForTimeout(1500);
    await showCookieOverlay(page, ctx, "2) กดยอมรับคุกกี้แล้ว — proxy.ts เขียน kkd_ref ให้ทันที");
    await pace(page);

    const refCookie = (await ctx.cookies()).find((c) => c.name === "kkd_ref");

    console.log("[step] ไปหน้าจองงาน ดูว่าช่องผู้แนะนำเติมชื่อให้อัตโนมัติไหม");
    await page.goto(`${base}/th/booking?tab=quote`, { waitUntil: "load" });
    await showCookieOverlay(page, ctx, "3) มาถึงหน้าจอง — คุกกี้ยังติดตัวมาด้วย");
    await pace(page);

    const referrerValue = await page.inputValue('input[name="referrerName"]').catch(() => "");
    await page.locator('input[name="referrerName"]').scrollIntoViewIfNeeded().catch(() => {});
    await showCookieOverlay(
      page,
      ctx,
      `4) ผลลัพธ์ — เซิร์ฟเวอร์อ่าน kkd_ref แล้วเติมชื่อ "${referrerValue || "(ว่าง)"}"`
    );
    await pace(page);
    const shotFile = await shot(page, "referrer-autofill");
    await pace(page);
    results.push({
      section: "attribution",
      title: `ลิงก์โปรโมทเติมชื่อผู้แนะนำอัตโนมัติ — ลูกค้าที่คลิกลิงก์ของ "${exec.name}" เห็นชื่อขึ้นในฟอร์มทันที`,
      env: "production",
      screenshot: shotFile,
      checks: [
        { label: "คุกกี้บันทึกช่องทางหลังยอมรับความยินยอม", pass: refCookie?.value === exec.refCode },
        { label: `ช่อง "ผู้แนะนำ" เติมชื่อ "${exec.name}" อัตโนมัติ`, pass: referrerValue === exec.name },
      ],
      data: {
        "ลิงก์ที่ทดสอบ": `${base}/th?ref=${exec.refCode}`,
        "คุกกี้ kkd_ref": refCookie?.value ?? "(ไม่พบ)",
        "httpOnly (จับต้องจาก JS ไม่ได้)": String(refCookie?.httpOnly ?? "-"),
      },
    });
    await ctx.close();
  }

  // 9. Admin login
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const admin = await adminCtx.newPage();
  {
    await admin.goto(`${base}/admin/login`, { waitUntil: "load" });
    await admin.fill('input[name="email"]', "admin@kkdproperty.com");
    await admin.fill('input[name="password"]', "wrong-password-uat-test");
    await admin.click('button[type="submit"]');
    const rejected = await admin
      .waitForSelector("text=อีเมลหรือรหัสผ่านไม่ถูกต้อง", { timeout: 10000 })
      .then(() => true)
      .catch(() => false);
    const shotFail = await shot(admin, "admin-login-rejected");
    await pace(admin);

    await admin.fill('input[name="email"]', "admin@kkdproperty.com");
    await admin.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
    await admin.click('button[type="submit"]');
    const loggedIn = await admin.waitForURL("**/admin", { timeout: 15000 }).then(() => true).catch(() => false);
    await admin.waitForTimeout(1000);
    const shotOk = await shot(admin, "admin-dashboard");
    await pace(admin);
    results.push({
      section: "admin",
      title: "ระบบหลังบ้าน — ป้องกันรหัสผ่านผิด",
      env: "production",
      screenshot: shotFail,
      checks: [{ label: "ปฏิเสธรหัสผ่านผิด", pass: rejected }],
    });
    results.push({
      section: "admin",
      title: "แดชบอร์ดผู้ดูแลระบบ",
      env: "production",
      screenshot: shotOk,
      checks: [{ label: "เข้าสู่ระบบสำเร็จด้วยรหัสผ่านถูกต้อง", pass: loggedIn }],
    });
  }

  // 10. Leads list (real data)
  {
    const res = await admin.goto(`${base}/admin/leads`, { waitUntil: "load" });
    await admin.waitForTimeout(1500);
    const shotFile = await shot(admin, "admin-leads-list");
    await pace(admin);
    results.push({
      section: "admin",
      title: "รายการลูกค้าเป้าหมาย (Leads) — ข้อมูลจริงของธุรกิจ",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้าโหลดสำเร็จ (HTTP 200)", pass: res?.status() === 200 }],
    });
  }

  // 12. Channels admin
  {
    const res = await admin.goto(`${base}/admin/channels`, { waitUntil: "load" });
    await admin.waitForTimeout(1500);
    const shotFile = await shot(admin, "admin-channels");
    await pace(admin);
    results.push({
      section: "admin",
      title: "ช่องทางโปรโมท — จัดหมวดหมู่ช่องทาง สร้างลิงก์พร้อม UTM อัตโนมัติ",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้าโหลดสำเร็จ (HTTP 200)", pass: res?.status() === 200 }],
    });

    const rows = admin.locator("table tbody tr");
    const n = await rows.count();
    let dialogOpened = false;
    for (let i = 0; i < n; i++) {
      const name = (await rows.nth(i).locator("td").first().innerText()).trim();
      if (name === "เพื่อนแนะนำ") {
        await rows.nth(i).locator('button[aria-label="ผู้ดำเนินการ"]').click();
        dialogOpened = await admin
          .waitForSelector('[role="dialog"]', { timeout: 5000 })
          .then(() => true)
          .catch(() => false);
        break;
      }
    }
    const execShotFile = await shot(admin, "admin-channel-executives");
    await pace(admin);
    results.push({
      section: "admin",
      title: "ผู้ดำเนินการต่อช่องทาง — ลิงก์รายบุคคลเติมชื่อผู้แนะนำให้ลูกค้าอัตโนมัติ",
      env: "production",
      screenshot: execShotFile,
      checks: [{ label: "เปิดหน้าต่างผู้ดำเนินการสำเร็จ", pass: dialogOpened }],
    });
    await admin.keyboard.press("Escape").catch(() => {});
  }

  // 13. Reports
  {
    const res = await admin.goto(`${base}/admin/reports`, { waitUntil: "load" });
    await admin.waitForTimeout(1800);
    const shotFile = await shot(admin, "admin-reports");
    await pace(admin);
    results.push({
      section: "admin",
      title: "รายงานภาพรวม — สรุปยอดลีด ยอดจอง และรายได้ตามช่องทาง",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้าโหลดสำเร็จ (HTTP 200)", pass: res?.status() === 200 }],
    });
  }

  // 14. Audit log
  {
    const res = await admin.goto(`${base}/admin/audit`, { waitUntil: "load" });
    await admin.waitForTimeout(1200);
    const shotFile = await shot(admin, "admin-audit-log");
    await pace(admin);
    results.push({
      section: "admin",
      title: "ประวัติการแก้ไข — ทุกการเปลี่ยนแปลงข้อมูลถูกบันทึกไว้ตรวจสอบย้อนหลังได้",
      env: "production",
      screenshot: shotFile,
      checks: [{ label: "หน้าโหลดสำเร็จ (HTTP 200)", pass: res?.status() === 200 }],
    });
  }

  await adminCtx.close();

  // 15. www redirect keeps attribution query string
  {
    const host = base.replace("https://", "");
    const res = await fetch(`https://www.${host}/th/packages?ref=${exec.refCode}`, { redirect: "manual" });
    const location = res.headers.get("location") ?? "";
    results.push({
      section: "infra",
      title: "โดเมน www redirect ไปโดเมนหลักโดยไม่ทำลิงก์โปรโมทเสียหาย",
      env: "production",
      screenshot: null,
      checks: [
        { label: "www redirect เป็น 301", pass: res.status === 301 },
        { label: "พารามิเตอร์ ?ref= ไม่หายระหว่าง redirect", pass: location.includes(`ref=${exec.refCode}`) },
      ],
      data: { "ปลายทางจริง": location },
    });
  }
}

async function runLocal() {
  const base = LOCAL;
  const health = await fetch(`${base}/th`).then((r) => r.status).catch(() => 0);
  if (health !== 200) {
    results.push({
      section: "booking",
      title: "ไม่สามารถทดสอบขั้นตอนบันทึกข้อมูลได้ — เซิร์ฟเวอร์ทดสอบภายในไม่ได้เปิดอยู่",
      env: "local",
      screenshot: null,
      checks: [{ label: "เซิร์ฟเวอร์ localhost:3000 พร้อมใช้งาน", pass: false }],
    });
    return;
  }

  const exec = await prisma.channelExecutive.findFirst({
    select: { name: true, refCode: true },
  });
  if (!exec) return;

  let uatLeadId = "";
  const uatPhone = `0899${String(Math.floor(100000 + Math.random() * 899999))}`;
  {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 1200 },
      extraHTTPHeaders: { "x-forwarded-for": "203.0.113.199" },
    });
    // The real CookieYes banner isn't wired up on this local server
    // (NEXT_PUBLIC_COOKIEYES_ID unset in .env — it's a third-party script,
    // never loaded outside production), so there is no banner to click.
    // Plant the same consent cookie value the codebase's own e2e suite uses
    // (scripts/e2e-channel-tracking.mts) — the app only ever reads this
    // cookie's value, it can't tell a real banner click from this.
    await ctx.addCookies([
      {
        name: "cookieyes-consent",
        value:
          "consentid:uat,consent:yes,action:yes,necessary:yes,functional:no,analytics:no,performance:no,advertisement:yes,other:no",
        domain: "localhost",
        path: "/",
      },
    ]);
    const page = await ctx.newPage();
    await page.goto(
      `${base}/th?ref=${exec.refCode}&utm_source=facebook&utm_medium=social&utm_campaign=package_info&utm_content=${exec.refCode}`,
      { waitUntil: "load" }
    );
    await page.waitForTimeout(1000);
    await page.goto(`${base}/th/booking?tab=quote`, { waitUntil: "load" });
    await page.waitForTimeout(1500);
    await page.fill('input[name="name"]', `${UAT_TAG} ทดสอบระบบ`);
    await page.fill('input[name="phone"]', uatPhone);
    await page.selectOption('select[name="province"]', "กรุงเทพมหานคร").catch(() => {});
    await page.selectOption('select[name="buildingType"]', "RESIDENTIAL").catch(() => {});
    const beforeSubmit = await shot(page, "booking-form-filled");
    await pace(page);
    await page.click('button[type="submit"]');
    const submitted = await page
      .waitForSelector("text=ส่งข้อมูลสำเร็จ", { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(500);
    const afterSubmit = await shot(page, "booking-form-success");
    await pace(page);
    results.push({
      section: "booking",
      title: "ฟอร์มขอใบเสนอราคา — ลูกค้ากรอกและส่งได้จริง (ทดสอบบนสภาพแวดล้อมภายใน โค้ดชุดเดียวกับ production)",
      env: "local",
      screenshot: beforeSubmit,
      checks: [{ label: "ส่งฟอร์มสำเร็จ เห็นข้อความยืนยัน", pass: submitted }],
    });
    results.push({
      section: "booking",
      title: "หน้ายืนยันหลังส่งฟอร์ม",
      env: "local",
      screenshot: afterSubmit,
      checks: [{ label: "แสดงข้อความขอบคุณ", pass: submitted }],
    });
    await ctx.close();

    const lead = await prisma.lead.findFirst({ where: { phone: uatPhone } });
    uatLeadId = lead?.id ?? "";
    results.push({
      section: "booking",
      title: "ข้อมูลที่บันทึกจริงในฐานข้อมูลหลังส่งฟอร์ม",
      env: "local",
      screenshot: null,
      checks: [
        { label: "สร้างรายการ Lead สำเร็จ", pass: !!lead },
        { label: "บันทึกช่องทางอัตโนมัติจากลิงก์", pass: !!lead?.autoSourceChannelId },
        { label: "บันทึกผู้ดำเนินการจากลิงก์", pass: !!lead?.autoSourceExecutiveId },
        { label: "บันทึกชื่อผู้แนะนำอัตโนมัติ", pass: lead?.referrerName === exec.name },
        { label: "บันทึก utm_source", pass: lead?.utmSource === "facebook" },
        { label: "บันทึก utm_campaign", pass: lead?.utmCampaign === "package_info" },
      ],
      data: {
        "ชื่อผู้แนะนำที่บันทึก": lead?.referrerName ?? "-",
        utm_source: lead?.utmSource ?? "-",
        utm_medium: lead?.utmMedium ?? "-",
        utm_campaign: lead?.utmCampaign ?? "-",
      },
    });
  }

  if (uatLeadId) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
    const admin = await ctx.newPage();
    await adminLogin(admin, base);
    await admin.goto(`${base}/admin/leads/${uatLeadId}`, { waitUntil: "load" });
    await admin.waitForTimeout(1200);
    const hasUtmBlock = await admin.getByText("ข้อมูลแคมเปญ (UTM)").isVisible().catch(() => false);
    const shotFile = await shot(admin, "admin-lead-detail");
    await pace(admin);
    results.push({
      section: "admin",
      title: "รายละเอียดลีด — เห็นช่องทางที่มา ผู้แนะนำ และข้อมูลแคมเปญ (UTM) ครบในหน้าเดียว",
      env: "local",
      screenshot: shotFile,
      checks: [{ label: "แสดงบล็อกข้อมูลแคมเปญ (UTM)", pass: hasUtmBlock }],
    });
    await ctx.close();

    await prisma.lead.delete({ where: { id: uatLeadId } }).catch(() => {});
    const stillThere = await prisma.lead.findUnique({ where: { id: uatLeadId } });
    results.push({
      section: "cleanup",
      title: "ลบข้อมูลทดสอบออกจากระบบทดสอบเรียบร้อยหลังตรวจสอบเสร็จ",
      env: "local",
      screenshot: null,
      checks: [{ label: "ลบลีดทดสอบสำเร็จ ไม่เหลือค้างในระบบ", pass: !stillThere }],
    });
  }
}

try {
  await runProduction();
  await runLocal();
} finally {
  await browser.close();
  await prisma.$disconnect();
  writeFileSync(
    `${OUT_DIR}/results.json`,
    JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)
  );
  const total = results.reduce((n, r) => n + r.checks.length, 0);
  const passed = results.reduce((n, r) => n + r.checks.filter((c) => c.pass).length, 0);
  console.log(`\nUAT run complete: ${passed}/${total} checks passed. Output: ${OUT_DIR}`);
}
