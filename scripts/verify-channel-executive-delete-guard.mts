import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("mysql://")) {
  throw new Error("DATABASE_URL must be a local mysql:// connection string");
}
const parsedDatabaseUrl = new URL(databaseUrl);
if (!["127.0.0.1", "localhost", "::1"].includes(parsedDatabaseUrl.hostname)) {
  throw new Error("refusing to run the destructive fixture against a non-loopback database");
}

const baseUrl = (process.env.TEST_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const stamp = `${Date.now().toString(36)}-${process.pid}`;
const channelId = `delete-guard-channel-${stamp}`;
const executiveId = `delete-guard-executive-${stamp}`;
const userId = `delete-guard-user-${stamp}`;
const channelName = `Delete Guard Channel ${stamp}`;
const executiveName = `Delete Guard Executive ${stamp}`;
const expectedError =
  "ลบไม่ได้ มีบัญชีผู้ใช้เชื่อมกับผู้ดำเนินการนี้ 1 บัญชี กรุณาเชื่อมบัญชีไปยังผู้ดำเนินการอื่นหรือเปลี่ยนบทบาทก่อน";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(databaseUrl) });
const browser = await chromium.launch({ channel: "chrome", headless: true });

function report(label: string, passed: boolean): void {
  console.log(`${label}=${passed ? "PASS" : "FAIL"}`);
}

try {
  await prisma.promoChannel.create({
    data: {
      id: channelId,
      slug: `delete-guard-${stamp}`,
      nameTh: channelName,
      nameEn: channelName,
      type: "INDIVIDUAL",
      landingPath: "/th/packages",
      refCode: `DG${stamp}`,
    },
  });
  await prisma.channelExecutive.create({
    data: {
      id: executiveId,
      channelId,
      name: executiveName,
      phone: "0800000000",
      refCode: `DG-EXEC-${stamp}`,
    },
  });
  await prisma.adminUser.create({
    data: {
      id: userId,
      email: `delete-guard-${stamp}@example.invalid`,
      passwordHash: "synthetic-unused-password-hash",
      name: `Delete Guard User ${stamp}`,
      role: "CHANNEL_EXECUTIVE",
      isActive: true,
      linkedChannelExecutiveId: executiveId,
    },
  });

  const page = await browser.newPage();
  await page.goto(`${baseUrl}/admin/login`);
  await page.fill('input[name="email"]', "admin@kkdproperty.com");
  await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "admin1234");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15_000 });

  await page.goto(`${baseUrl}/admin/channels`);
  const channelRow = page.locator("tr").filter({ hasText: channelName });
  await channelRow.getByRole("button", { name: "ผู้ดำเนินการ" }).click();
  const dialog = page.getByRole("dialog");
  const executiveRow = dialog.locator("tr").filter({ hasText: executiveName });
  await executiveRow.getByRole("button", { name: "ลบ" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "ลบ", exact: true }).click();
  await page.waitForTimeout(1_500);

  const errorVisible = (await page.getByText(expectedError, { exact: true }).count()) > 0;
  const storedExecutive = await prisma.channelExecutive.findUnique({ where: { id: executiveId } });
  const storedUser = await prisma.adminUser.findUnique({ where: { id: userId } });
  const deleteAuditCount = await prisma.auditLog.count({
    where: { entityType: "ChannelExecutive", entityId: executiveId, action: "DELETE" },
  });

  const checks = {
    FRIENDLY_ERROR_VISIBLE: errorVisible,
    EXECUTIVE_RETAINED: storedExecutive !== null,
    ADMIN_USER_LINK_RETAINED: storedUser?.linkedChannelExecutiveId === executiveId,
    DELETE_AUDIT_NOT_CREATED: deleteAuditCount === 0,
  };
  for (const [label, passed] of Object.entries(checks)) report(label, passed);
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error("linked Admin User did not block Channel Executive deletion");
  }
  console.log("CHANNEL_EXECUTIVE_DELETE_GUARD=PASS");
} finally {
  await browser.close();
  await prisma.auditLog.deleteMany({
    where: { entityType: "ChannelExecutive", entityId: executiveId },
  });
  await prisma.adminUser.deleteMany({ where: { id: userId } });
  await prisma.channelExecutive.deleteMany({ where: { id: executiveId } });
  await prisma.promoChannel.deleteMany({ where: { id: channelId } });
  await prisma.$disconnect();
}
