import { prisma } from "@/lib/db";
import type { AuditAction } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

type AuditableRow = { id: string };

/**
 * Single choke point for admin mutations: runs the mutation, then records
 * an audit row with full before/after snapshots. The audit-log UI computes
 * field diffs from the two snapshots.
 */
export async function withAudit<T extends AuditableRow | null>(opts: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  /** Existing row snapshot — pass for UPDATE and DELETE. */
  before?: AuditableRow | null;
  run: () => Promise<T>;
}): Promise<T> {
  const result = await opts.run();

  const entityId = result?.id ?? opts.before?.id;
  if (!entityId) {
    throw new Error("withAudit: could not determine entityId");
  }

  await prisma.auditLog.create({
    data: {
      actorId: opts.actorId,
      action: opts.action,
      entityType: opts.entityType,
      entityId,
      before: (opts.before ?? undefined) as Prisma.InputJsonValue | undefined,
      after: (result ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });

  return result;
}
