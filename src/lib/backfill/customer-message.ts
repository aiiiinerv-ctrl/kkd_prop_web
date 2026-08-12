import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Recovers `Lead.customerMessage` for leads created before the
 * customerMessage/internalNotes split.
 *
 * Before the split, `Lead.notes` (now `internalNotes`, still mapped to the
 * `notes` DB column) double-booked two meanings: the customer's free-text
 * message from the public form, and whatever an admin later typed into
 * "บันทึกภายใน". `updateLeadNotes()` overwrote it in place, so for any lead an
 * admin has edited, the current value is the admin's text — but the
 * customer's original is still recoverable from AuditLog, because
 * `auditedEntity({ snapshot: "full" })` stores a full before/after snapshot
 * on every Lead mutation.
 *
 * Lives here rather than in the script that first used it because production
 * cannot run scripts at all: `tsx` is a devDependency the deploy artifact
 * never contains, so the only way to run this against production is from
 * inside the app. Both callers share this one implementation.
 */

export type BackfillReport = {
  committed: boolean;
  candidates: number;
  fromNoAudit: number;
  fromOldestAudit: number;
  unrecoverable: number;
  written: number;
  skippedEmpty: number;
};

type Recovery =
  | { source: "no_audit" | "oldest_audit"; value: string | null }
  | { source: "unrecoverable" };

// The snapshot key changed with the split: rows audited before the rename hold
// the customer's text under `notes`, rows audited after it under
// `internalNotes` (the Prisma field was renamed, the DB column was not). A lead
// created before the split whose first admin edit lands after deploy produces
// the second shape — checking only `notes` would write it off as unrecoverable
// while its text is sitting right there.
const SNAPSHOT_KEYS = ["notes", "internalNotes"] as const;

async function recover(
  prisma: PrismaClient,
  leadId: string,
  currentNotes: string | null
): Promise<Recovery> {
  const oldestAudit = await prisma.auditLog.findFirst({
    where: { entityType: "Lead", entityId: leadId },
    orderBy: { createdAt: "asc" },
  });

  // Never edited by an admin — the current value is still the customer's
  // original text (possibly null, if they left the field blank).
  if (!oldestAudit) return { source: "no_audit", value: currentNotes };

  const before = oldestAudit.before as Record<string, unknown> | null;
  for (const key of SNAPSHOT_KEYS) {
    if (before && Object.prototype.hasOwnProperty.call(before, key)) {
      const value = before[key];
      return { source: "oldest_audit", value: typeof value === "string" ? value : null };
    }
  }

  return { source: "unrecoverable" };
}

/**
 * Fills `customerMessage` only where it is currently NULL, so it is safe to
 * re-run. Never reads or writes `internalNotes` for any purpose other than
 * recovering the value to copy across.
 *
 * Pass `commit: false` (the default) to report what would happen without
 * writing anything.
 */
export async function backfillCustomerMessage(
  prisma: PrismaClient,
  { commit = false }: { commit?: boolean } = {}
): Promise<BackfillReport> {
  const leads = await prisma.lead.findMany({
    where: { customerMessage: null },
    select: { id: true, internalNotes: true },
  });

  const report: BackfillReport = {
    committed: commit,
    candidates: leads.length,
    fromNoAudit: 0,
    fromOldestAudit: 0,
    unrecoverable: 0,
    written: 0,
    skippedEmpty: 0,
  };

  for (const lead of leads) {
    const recovery = await recover(prisma, lead.id, lead.internalNotes);

    if (recovery.source === "unrecoverable") {
      report.unrecoverable += 1;
      continue;
    }
    if (recovery.source === "no_audit") report.fromNoAudit += 1;
    else report.fromOldestAudit += 1;

    // Nothing to recover — the customer left the message blank. Skip rather
    // than writing null over null: Lead.updatedAt is @updatedAt, so a no-op
    // write would still bump it and destroy the "last touched" signal the
    // leads UI shows, in exchange for nothing.
    if (recovery.value == null || recovery.value === "") {
      report.skippedEmpty += 1;
      continue;
    }
    report.written += 1;

    if (commit) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { customerMessage: recovery.value },
      });
    }
  }

  return report;
}
