/**
 * backfill-customer-message.mts — recovers Lead.customerMessage for leads
 * created before the customerMessage/internalNotes split (Sprint 0, #17).
 *
 * The recovery logic lives in src/lib/backfill/customer-message.ts, shared
 * with the temporary admin route that runs the same thing against
 * production (which cannot run this script at all — `tsx` is a devDependency
 * the deploy artifact never contains).
 *
 * Default mode is report-only. Pass --commit to actually write.
 *
 *   npx tsx scripts/backfill-customer-message.mts            # dry run
 *   npx tsx scripts/backfill-customer-message.mts --commit   # writes
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { backfillCustomerMessage } from "../src/lib/backfill/customer-message.js";

const COMMIT = process.argv.includes("--commit");

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

async function main() {
  const r = await backfillCustomerMessage(prisma, { commit: COMMIT });

  console.log(`Mode: ${COMMIT ? "COMMIT (writing)" : "REPORT ONLY (dry run)"}`);
  console.log(`Leads with customerMessage IS NULL (candidates): ${r.candidates}`);
  console.log(`  Recovered from source 1 (no AuditLog row):        ${r.fromNoAudit}`);
  console.log(`  Recovered from source 2 (oldest AuditLog.before): ${r.fromOldestAudit}`);
  console.log(`  Unrecoverable (no notes key in before snapshot):  ${r.unrecoverable}`);
  console.log(`  Of recovered: ${COMMIT ? "written" : "would write"}: ${r.written}`);
  console.log(`  Of recovered: skipped (customer left it blank): ${r.skippedEmpty}`);
  if (!COMMIT) {
    console.log("\nDry run only — no rows written. Re-run with --commit to write.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
