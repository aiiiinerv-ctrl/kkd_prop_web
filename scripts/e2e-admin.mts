import "dotenv/config";
import { chromium } from "playwright";
import { storage } from "../src/lib/storage/index.js";

function assertCheck(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(`${label} failed`);
  console.log(`${label} ✓`);
}

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

// Calculator import originals (S4 hardening): ADMIN-only, attachment +
// nosniff headers, FINANCE gets no free pass unlike payment slips.
const calcImportKey = "private/calculator-imports/e2e-test.xlsx";
await storage.put(
  calcImportKey,
  Buffer.from("PK\x03\x04 fake xlsx contents for e2e"),
  {
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }
);

try {
  // Anonymous — no session cookie at all.
  const anonContext = await browser.newContext();
  const anonRes = await anonContext.request.get(
    `http://localhost:3000/files/${calcImportKey}`,
    { failOnStatusCode: false }
  );
  assertCheck(anonRes.status() === 401, "CALC IMPORT: anonymous access 401");
  await anonContext.close();

  // ADMIN — already authenticated on `page`.
  const adminRes = await page.request.get(
    `http://localhost:3000/files/${calcImportKey}`,
    { failOnStatusCode: false }
  );
  const adminHeaders = adminRes.headers();
  assertCheck(adminRes.status() === 200, "CALC IMPORT: ADMIN access 200");
  assertCheck(
    adminHeaders["content-disposition"]?.startsWith("attachment;") ?? false,
    "CALC IMPORT: Content-Disposition attachment"
  );
  assertCheck(
    adminHeaders["x-content-type-options"] === "nosniff",
    "CALC IMPORT: X-Content-Type-Options nosniff"
  );

  // FINANCE — 401 (no exception for this prefix, unlike slips).
  const financeContext = await browser.newContext();
  const financePage = await financeContext.newPage();
  await financePage.goto("http://localhost:3000/admin/login");
  await financePage.fill(
    'input[name="email"]',
    "finance.test@kkdproperty.local"
  );
  await financePage.fill('input[name="password"]', "Test1234!");
  await financePage.click('button[type="submit"]');
  await financePage.waitForURL("**/admin", { timeout: 15000 });
  const financeRes = await financePage.request.get(
    `http://localhost:3000/files/${calcImportKey}`,
    { failOnStatusCode: false }
  );
  assertCheck(financeRes.status() === 401, "CALC IMPORT: FINANCE access 401");
  // Case variant: on a case-insensitive filesystem this opens the same file,
  // so it must not slip past the prefix rule into the FINANCE shortcut.
  const financeCaseRes = await financePage.request.get(
    `http://localhost:3000/files/${calcImportKey.replace("calculator-imports", "Calculator-Imports")}`,
    { failOnStatusCode: false }
  );
  assertCheck(financeCaseRes.status() === 401, "CALC IMPORT: FINANCE case-variant key 401");
  await financeContext.close();
} finally {
  await storage.delete(calcImportKey);
}

// Logout works
await page.goto("http://localhost:3000/admin");
await page.click("text=ออกจากระบบ");
await page.waitForURL("**/admin/login", { timeout: 10000 });
console.log("LOGOUT: back to login ✓");

await browser.close();
