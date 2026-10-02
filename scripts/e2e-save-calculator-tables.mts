// E2E for the `saveCalculatorTables` server action (R1-S4,
// docs/plans/calculator-hybrid-toggle-sprints.md). Covers: save OK (MANUAL
// history row + public page + 2 audit rows with no rows blob + "use this set"
// rollback), validator Reject (rowIndex/field), version conflict, non-ADMIN.
//
// The action is invoked as a raw Next server-action POST with a real session
// cookie (same technique as e2e-calculator-config.mts' role check) because no
// UI calls it until R1-S6. Next only registers an action in
// server-reference-manifest.json when a client module references it, so until
// R1-S6 lands this script SKIPs (exit 0, says so) when the id is missing.
//
// Server must be running (`npm run start`). State is restored at the end.
import "dotenv/config";
import fs from "node:fs";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { chromium, type Page } from "playwright";
import { PrismaClient } from "../src/generated/prisma/client.js";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin1234";

const pass = (m: string) => console.log(`${m} ✓`);
const fail = (m: string): never => {
  throw new Error(`${m} ✗ FAIL`);
};

const manifest = JSON.parse(fs.readFileSync(".next/server/server-reference-manifest.json", "utf8"));
const idOf = (name: string): string | undefined =>
  Object.entries<{ exportedName: string }>(manifest.node).find(([, v]) => v.exportedName === name)?.[0];
const SAVE_ID = idOf("saveCalculatorTables");
const APPLY_ID = idOf("applyCalculatorImport");
if (!SAVE_ID || !APPLY_ID) {
  console.log("SKIP: saveCalculatorTables is not referenced by any client module yet (lands with R1-S6) — nothing to call");
  process.exit(0);
}

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/admin/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin", { timeout: 15000 });
}

type Res = { status: number; redirect?: string; result?: any };
async function callAction(page: Page, id: string, arg: unknown): Promise<Res> {
  const r = await page.request.post(`${BASE}/admin/pages/calculator`, {
    headers: { "next-action": id, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component", origin: BASE },
    data: JSON.stringify([arg]),
    maxRedirects: 0,
  });
  const redirect = r.headers()["x-action-redirect"];
  const text = await r.text();
  const m = text.match(/^\d+:(\{"ok":.*\})$/m);
  return { status: r.status(), redirect, result: m ? JSON.parse(m[1]) : undefined };
}

const row = (kw: number, over: Record<string, unknown> = {}) => ({
  kw, phases: [1, 3], sunHours: 4.5, days: 30, pricePerKwh: 4.2, panels: Math.ceil((kw * 1.2) / 0.63),
  roofM2: Math.ceil(kw * 6), billMin: 0, billMax: 6000, ...over,
});

async function publicText(page: Page, locale: "th" | "en", bill: number) {
  await page.goto(`${BASE}/${locale}/calculator`);
  await page.waitForSelector("#monthly-bill", { timeout: 15000 });
  await page.fill("#monthly-bill", String(bill));
  await page.locator("#monthly-bill").blur();
  await page.waitForTimeout(200);
  return page.locator("body").innerText();
}

const original = await prisma.calculatorConfig.findFirstOrThrow();
const startedAt = new Date();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const admin = await browser.newPage();
  await login(admin, "admin@kkdproperty.com", ADMIN_PASSWORD);
  const importCount = () => prisma.calculatorImport.count();

  // --- Reject: validator issues carry rowIndex/field, nothing persisted ---
  const cfg0 = await prisma.calculatorConfig.findFirstOrThrow();
  const n0 = await importCount();
  const bad = await callAction(admin, SAVE_ID!, {
    onGrid: [row(5), row(7, { sunHours: 99, billMin: 9000, billMax: 8000 })],
    version: cfg0.version,
  });
  const issues = bad.result?.issues as { rowIndex: number; field?: string; message: string }[] | undefined;
  if (bad.result?.ok !== false || !issues?.length) fail(`REJECT: expected issues, got ${JSON.stringify(bad)}`);
  if (!issues!.every((i) => i.rowIndex === 1) || !issues!.some((i) => i.field === "sunHours") || !issues!.some((i) => i.field === "billMin"))
    fail(`REJECT: issues should point at row 1 sunHours + billMin: ${JSON.stringify(issues)}`);
  if (!issues![0].message.startsWith("On-grid 7 kW:")) fail("REJECT: message should name the row by kW");
  if ((await importCount()) !== n0 || (await prisma.calculatorConfig.findFirstOrThrow()).version !== cfg0.version)
    fail("REJECT: nothing may be persisted");
  const caps = await callAction(admin, SAVE_ID!, { onGrid: Array.from({ length: 201 }, (_, i) => row(i + 1, { billMax: 1000 + i })), version: cfg0.version });
  if (caps.result?.ok !== false || caps.result?.issues) fail("REJECT: >200 rows must fail the shape cap");
  pass(`REJECT: issues point at rowIndex 1 [${issues!.map((i) => i.field).join(",")}], >200 rows capped, nothing persisted`);

  // --- Save A, save B, public reflects B, apply A back ---
  const a = await callAction(admin, SAVE_ID!, { onGrid: [row(7)], version: cfg0.version });
  if (!a.result?.ok) fail(`SAVE A: ${JSON.stringify(a)}`);
  const b = await callAction(admin, SAVE_ID!, { onGrid: [row(8)], version: a.result.version });
  if (!b.result?.ok || b.result.version !== cfg0.version + 2) fail(`SAVE B: ${JSON.stringify(b)}`);
  const impB = await prisma.calculatorImport.findUniqueOrThrow({ where: { id: b.result.importId } });
  if (impB.source !== "MANUAL" || impB.fileName || impB.fileKey || impB.sha256 || impB.sizeBytes !== null) fail("SAVE: MANUAL row must have null file fields");
  const cfg2 = await prisma.calculatorConfig.findFirstOrThrow();
  if (cfg2.sizeTableImportId !== impB.id || cfg2.version !== cfg0.version + 2) fail("SAVE: config not pointing at new import / version not bumped");
  pass(`SAVE: MANUAL history rows created, config v${cfg0.version} -> v${cfg2.version} points at new set`);

  const pub = await browser.newPage();
  for (const locale of ["th", "en"] as const) {
    const t = await publicText(pub, locale, 2500);
    if (!/(?<![\d.])8\s*kW/.test(t)) fail(`PUBLIC ${locale}: bill 2500 should recommend 8 kW after save`);
  }
  pass("PUBLIC /th + /en: new table recommends 8 kW");

  const audits = await prisma.auditLog.findMany({
    where: { createdAt: { gte: startedAt }, entityId: { in: [impB.id, cfg2.id] } },
    orderBy: { createdAt: "asc" },
  });
  const impAudit = audits.filter((x) => x.entityType === "CalculatorImport" && x.entityId === impB.id);
  const cfgAudit = audits.filter((x) => x.entityType === "CalculatorConfig" && x.after && (x.after as any).sizeTableImportId === impB.id);
  if (impAudit.length !== 1 || impAudit[0].action !== "CREATE" || cfgAudit.length !== 1 || cfgAudit[0].action !== "UPDATE")
    fail(`AUDIT: expected 1 import CREATE + 1 config UPDATE for the save (got ${impAudit.length}/${cfgAudit.length})`);
  const snap = JSON.stringify(impAudit[0].after);
  if (!snap.includes('"source":"MANUAL"') || /"rows"|fileKey|"phases"/.test(snap)) fail(`AUDIT: import snapshot must have source and no rows/fileKey: ${snap}`);
  pass("AUDIT: 2 rows (import CREATE w/ source MANUAL and no rows blob, config UPDATE)");

  const back = await callAction(admin, APPLY_ID!, { importId: a.result.importId, version: cfg2.version });
  if (!back.result?.ok) fail(`ROLLBACK: ${JSON.stringify(back)}`);
  for (const locale of ["th", "en"] as const) {
    const t = await publicText(pub, locale, 2500);
    if (!/(?<![\d.])7\s*kW/.test(t)) fail(`ROLLBACK ${locale}: bill 2500 should be back to 7 kW`);
  }
  pass("ROLLBACK: applying the earlier MANUAL set restores 7 kW on /th + /en");
  await pub.close();

  // --- Conflict: stale version ---
  const nC = await importCount();
  const stale = await callAction(admin, SAVE_ID!, { onGrid: [row(9)], version: cfg0.version });
  if (stale.result?.conflict !== true) fail(`CONFLICT: expected conflict, got ${JSON.stringify(stale)}`);
  if ((await importCount()) !== nC) fail("CONFLICT: no import row may be created");
  pass("CONFLICT: stale version -> { conflict: true }, nothing persisted");

  // --- Concurrency: same version sent twice at once -> exactly one wins ---
  const cv = (await prisma.calculatorConfig.findFirstOrThrow()).version;
  const [r1, r2] = await Promise.all([
    callAction(admin, SAVE_ID!, { onGrid: [row(12)], version: cv }),
    callAction(admin, SAVE_ID!, { onGrid: [row(13)], version: cv }),
  ]);
  const oks = [r1, r2].filter((r) => r.result?.ok === true);
  const conflicts = [r1, r2].filter((r) => r.result?.conflict === true);
  if (oks.length !== 1 || conflicts.length !== 1) fail(`CONCURRENT SAVE: expected 1 ok + 1 conflict, got ${JSON.stringify([r1.result, r2.result])}`);
  const afterRace = await prisma.calculatorConfig.findFirstOrThrow();
  if (afterRace.version !== cv + 1 || afterRace.sizeTableImportId !== oks[0].result.importId)
    fail(`CONCURRENT SAVE: version must be v${cv + 1} pointing at the winner (got v${afterRace.version})`);
  pass("CONCURRENT SAVE: 2 requests with the same version -> 1 ok + 1 conflict, version bumped once");

  const [p1, p2] = await Promise.all([
    callAction(admin, APPLY_ID!, { importId: a.result.importId, version: cv + 1 }),
    callAction(admin, APPLY_ID!, { importId: b.result.importId, version: cv + 1 }),
  ]);
  const aOk = [p1, p2].filter((r) => r.result?.ok === true);
  const aConflict = [p1, p2].filter((r) => r.result?.conflict === true);
  if (aOk.length !== 1 || aConflict.length !== 1) fail(`CONCURRENT APPLY: expected 1 ok + 1 conflict, got ${JSON.stringify([p1.result, p2.result])}`);
  if ((await prisma.calculatorConfig.findFirstOrThrow()).version !== cv + 2) fail("CONCURRENT APPLY: version must be bumped exactly once");
  pass("CONCURRENT APPLY: 2 requests with the same version -> 1 ok + 1 conflict, version bumped once");

  // --- Non-ADMIN ---
  const mk = await browser.newPage();
  await login(mk, "marketing.test@kkdproperty.local", "Test1234!");
  const before = await prisma.calculatorConfig.findFirstOrThrow();
  const nR = await importCount();
  const denied = await callAction(mk, SAVE_ID!, { onGrid: [row(11)], version: before.version });
  if (!denied.redirect?.startsWith("/admin;")) fail(`ROLE: MARKETING must be redirected to /admin, got ${JSON.stringify(denied)}`);
  if ((await importCount()) !== nR || (await prisma.calculatorConfig.findFirstOrThrow()).version !== before.version) fail("ROLE: denied save must not mutate");
  pass("ROLE: MARKETING save -> redirect /admin, nothing persisted");
  console.log("SAVE CALCULATOR TABLES: all checks passed");
} finally {
  // Restore config and drop this run's MANUAL rows.
  await prisma.calculatorConfig.update({
    where: { id: original.id },
    data: {
      sizeTable: original.sizeTable ?? (await import("../src/generated/prisma/client.js")).Prisma.JsonNull,
      sizeTableImportId: original.sizeTableImportId,
      version: original.version,
    },
  });
  await prisma.calculatorImport.deleteMany({ where: { source: "MANUAL", createdAt: { gte: startedAt } } });
  await browser.close();
  await prisma.$disconnect();
}
