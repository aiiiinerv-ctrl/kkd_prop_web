import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();

// Wrong password rejected
await page.goto("http://localhost:3000/admin/login");
await page.fill('input[name="email"]', "admin@kkdproperty.com");
await page.fill('input[name="password"]', "wrong-password");
await page.click('button[type="submit"]');
await page.waitForSelector("text=อีเมลหรือรหัสผ่านไม่ถูกต้อง", { timeout: 10000 });
console.log("LOGIN: wrong password rejected ✓");

// Correct login reaches dashboard (form resets after failed action, refill both)
await page.fill('input[name="email"]', "admin@kkdproperty.com");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
await page.click('button[type="submit"]');
await page.waitForURL("**/admin", { timeout: 15000 });
await page.waitForSelector("text=แดชบอร์ด", { timeout: 10000 });
console.log("LOGIN: dashboard reached ✓");

// Test leads from Phase 4 appear
const leadVisible = await page
  .waitForSelector("text=ทดสอบ นัดสำรวจ", { timeout: 5000 })
  .then(() => true)
  .catch(() => false);
console.log(`DASHBOARD: recent lead visible ${leadVisible ? "✓" : "✗"}`);

// Users page reachable as ADMIN
await page.goto("http://localhost:3000/admin/users");
await page.waitForSelector("text=ผู้ใช้ระบบ", { timeout: 10000 });
console.log("USERS: page reachable as ADMIN ✓");

// Private slip now viewable when authenticated
const slipRes = await page.request.get(
  "http://localhost:3000/api/admin-slip-check",
  { failOnStatusCode: false }
);
void slipRes;
const filesRes = await page.request.get(
  "http://localhost:3000/files/" + (process.env.SLIP_KEY ?? "private/slips/none.png"),
  { failOnStatusCode: false }
);
console.log(
  `SLIP: authenticated access status ${filesRes.status()} ${
    filesRes.status() === 200 ? "✓" : "(expected 200 if SLIP_KEY set)"
  }`
);

// Logout works
await page.goto("http://localhost:3000/admin");
await page.click("text=ออกจากระบบ");
await page.waitForURL("**/admin/login", { timeout: 10000 });
console.log("LOGOUT: back to login ✓");

await browser.close();
