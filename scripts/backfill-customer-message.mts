/**
 * backfill-customer-message.mts — recovers Lead.customerMessage for leads
 * created before the customerMessage/internalNotes split (Sprint 0, #17).
 *
 * Before the split, `Lead.notes` (now `internalNotes`, still mapped to the
 * `notes` DB column) double-booked two meanings: the customer's free-text
 * message from the public form, and whatever an admin later typed into
 * "บันทึกภายใน". `updateLeadNotes()` overwrote it in place, so for any lead
 * an admin has edited, the current `notes` value is the admin's text, not
 * the customer's — but the customer's original text is still recoverable
 * from AuditLog, because `auditedEntity({ snapshot: "full" })` stores a full
 * before/after JSON snapshot on every Lead mutation.
 *
 * Recovery sources, per lead:
 *   1. No AuditLog row at all for this lead (`entityType: "Lead"`,
 *      `entityId: lead.id`) → the lead was never edited by an admin, so its
 *      current `notes` value is still the customer's original text. Copied
 *      as-is.
 *   2. Has AuditLog row(s) → take `before.notes` from the oldest
 *      (`createdAt` ascending) AuditLog row for that lead — the snapshot of
 *      the row just before the *first* admin edit, i.e. still the
 *      customer's original text at that point.
 *   3. Unrecoverable — no AuditLog before-snapshot has a `notes` key at all
 *      (defensive; shouldn't happen given `snapshot: "full"`, but the field
 *      list on `Lead` could theoretically change again in the future).
 *
 * This script ONLY ever writes `customerMessage`, and only when it is
 * currently NULL (idempotent — safe to re-run). It never reads or writes
 * `notes`/`internalNotes` for any purpose other than recovering the value to
 * copy into customerMessage; it never touches internalNotes.
 *
 * Default mode is report-only. Pass --commit to actually write.
 *
 * Usage:
 *   npx tsx scripts/backfill-customer-message.mts            # dry run
 *   npx tsx scripts/backfill-customer-message.mts --commit    # writes
 *
 * Must be run on the host — production has no external MySQL access.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";

const COMMIT = process.argv.includes("--commit");

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

type Recovery =
  | { source: "no_audit"; value: string | null }
  | { source: "oldest_audit"; value: string | null }
  | { source: "unrecoverable" };

async function recoverCustomerMessage(leadId: string, currentNotes: string | null): Promise<Recovery> {
  const oldestAudit = await prisma.auditLog.findFirst({
    where: { entityType: "Lead", entityId: leadId },
    orderBy: { createdAt: "asc" },
  });

  if (!oldestAudit) {
    // Never edited by an admin — current notes value is still the
    // customer's original text (possibly null, if they left it blank).
    return { source: "no_audit", value: currentNotes };
  }

  // The snapshot key changed with the split: rows audited before the rename
  // hold the customer's text under `notes`, rows audited after it hold the
  // same text under `internalNotes` (the Prisma field was renamed, the DB
  // column was not). A lead created before the split whose first admin edit
  // lands after deploy produces the second shape — checking only `notes`
  // would write it off as unrecoverable while its text is sitting right there.
  const before = oldestAudit.before as Record<string, unknown> | null;
  for (const key of ["notes", "internalNotes"] as const) {
    if (before && Object.prototype.hasOwnProperty.call(before, key)) {
      const value = before[key];
      return {
        source: "oldest_audit",
        value: typeof value === "string" ? value : null,
      };
    }
  }

  return { source: "unrecoverable" };
}

async function main() {
  const leads = await prisma.lead.findMany({
    where: { customerMessage: null },
    select: { id: true, internalNotes: true },
  });

  let fromNoAudit = 0;
  let fromOldestAudit = 0;
  let unrecoverable = 0;
  let wouldWrite = 0;
  let skippedEmpty = 0;

  for (const lead of leads) {
    const recovery = await recoverCustomerMessage(lead.id, lead.internalNotes);

    if (recovery.source === "unrecoverable") {
      unrecoverable += 1;
      continue;
    }

    if (recovery.source === "no_audit") fromNoAudit += 1;
    else fromOldestAudit += 1;

    // Nothing to recover for this lead — the customer left the message blank.
    // Skip rather than writing null over null: Lead.updatedAt is @updatedAt, so
    // a no-op write would still bump it and destroy the "last touched" signal
    // the leads UI shows, in exchange for nothing.
    if (recovery.value == null || recovery.value === "") {
      skippedEmpty += 1;
      continue;
    }
    wouldWrite += 1;

    if (COMMIT) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { customerMessage: recovery.value },
      });
    }
  }

  console.log(`Mode: ${COMMIT ? "COMMIT (writing)" : "REPORT ONLY (dry run)"}`);
  console.log(`Leads with customerMessage IS NULL (candidates): ${leads.length}`);
  console.log(`  Recovered from source 1 (no AuditLog row):        ${fromNoAudit}`);
  console.log(`  Recovered from source 2 (oldest AuditLog.before): ${fromOldestAudit}`);
  console.log(`  Unrecoverable (no "notes" key in before snapshot): ${unrecoverable}`);
  console.log(`  Of recovered: ${COMMIT ? "written" : "would write"}: ${wouldWrite}`);
  console.log(`  Of recovered: skipped (customer left it blank): ${skippedEmpty}`);
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
