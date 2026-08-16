import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { AuditAction } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Every entity an audit row can point at. Listing them here (rather than
 * passing free strings per call) keeps the set greppable, lets the audit UI
 * and the verify script agree with the actions, and stops a mutation on one
 * model from being filed under another.
 */
export type AuditEntityType =
  | "AboutContent"
  | "AdminUser"
  | "BookingCapacitySetting"
  | "ChannelExecutive"
  | "Lead"
  | "Package"
  | "PageSeo"
  | "PaymentSettings"
  | "PortfolioProject"
  | "PromoChannel"
  | "PromoLandingPath"
  | "Service"
  | "SiteSettings"
  | "SurveyBooking"
  | "Testimonial";

type AuditableRow = { id: string };

/** A path to refresh, optionally with next's page/layout type. */
type RevalidateTarget = string | readonly [string, "page" | "layout"];

/**
 * What gets stored in the before/after snapshots. Declaring this is mandatory:
 * `"full"` records the whole row, a projection records only what it returns.
 * There is deliberately no default — adding an entity forces one decision
 * about whether any of its columns must never reach an audit snapshot.
 */
type Snapshot<Row extends AuditableRow> =
  | "full"
  | ((row: Row) => Record<string, unknown>);

type EntityDelegate<Row, CreateData, UpdateData> = {
  findUnique(args: { where: { id: string } }): Promise<Row | null>;
  create(args: { data: CreateData }): Promise<Row>;
  update(args: { where: { id: string }; data: UpdateData }): Promise<Row>;
  delete(args: { where: { id: string } }): Promise<Row>;
};

type AuditClient = {
  auditLog: {
    create(args: { data: Prisma.AuditLogUncheckedCreateInput }): Promise<unknown>;
  };
};

async function resolveActorId(): Promise<string> {
  const session = await auth();
  const actorId = session?.user?.id;
  if (!actorId) {
    // Actions call requireAdmin()/requireRole() before mutating, so this only
    // fires if a mutation is reached without any session at all.
    throw new Error("audited mutation attempted without an authenticated actor");
  }
  return actorId;
}

function project<Row extends AuditableRow>(
  snapshot: Snapshot<Row>,
  row: Row
): Prisma.InputJsonValue {
  return (
    snapshot === "full" ? row : snapshot(row)
  ) as unknown as Prisma.InputJsonValue;
}

function refresh(targets: readonly RevalidateTarget[]) {
  for (const target of targets) {
    if (typeof target === "string") revalidatePath(target);
    else revalidatePath(target[0], target[1]);
  }
}

async function writeAuditRow(
  client: AuditClient,
  data: Prisma.AuditLogUncheckedCreateInput
) {
  await client.auditLog.create({ data });
}

/**
 * The only place in the app that writes an AuditLog row for something that
 * isn't an entity mutation — currently just LOGIN, recorded from
 * `authorize()`, which has no session yet and so passes its actor explicitly.
 */
export async function recordAuditEvent(event: {
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
}): Promise<void> {
  await writeAuditRow(prisma, event);
}

/**
 * Declares an entity's audited mutations. The returned create/update/remove
 * each run their mutation and its audit row inside one transaction, so a
 * mutation can never be committed without its audit trail, then refresh the
 * pages that entity feeds.
 *
 * What stays with the caller on purpose: authorization (`requireAdmin()`,
 * `requireRole()`, `canMutate*()` — the rules differ per action and hiding
 * them would make them unreviewable), and user-facing copy for a missing row
 * (update/remove return null rather than inventing a message).
 */
export function auditedEntity<
  Row extends AuditableRow,
  CreateData,
  UpdateData,
>(config: {
  entityType: AuditEntityType;
  /** Resolved against the transaction client, so every write joins the tx. */
  model: (client: Prisma.TransactionClient) => EntityDelegate<Row, CreateData, UpdateData>;
  snapshot: Snapshot<Row>;
  revalidate: (row: Row) => readonly RevalidateTarget[];
}) {
  const snap = (row: Row) => project(config.snapshot, row);

  return {
    async create(data: CreateData): Promise<Row> {
      const actorId = await resolveActorId();
      const created = await prisma.$transaction(async (tx) => {
        const row = await config.model(tx).create({ data });
        await writeAuditRow(tx, {
          actorId,
          action: "CREATE",
          entityType: config.entityType,
          entityId: row.id,
          after: snap(row),
        });
        return row;
      });
      refresh(config.revalidate(created));
      return created;
    },

    /**
     * Returns null when no row has that id — the caller owns the message.
     * `data` may be a function of the existing row (e.g. toggling a flag),
     * which is why the load happens inside the transaction.
     */
    async update(
      id: string,
      data: UpdateData | ((before: Row) => UpdateData)
    ): Promise<{ before: Row; after: Row } | null> {
      const actorId = await resolveActorId();
      const result = await prisma.$transaction(async (tx) => {
        const delegate = config.model(tx);
        const before = await delegate.findUnique({ where: { id } });
        if (!before) return null;

        const after = await delegate.update({
          where: { id },
          data: typeof data === "function"
            ? (data as (row: Row) => UpdateData)(before)
            : data,
        });
        await writeAuditRow(tx, {
          actorId,
          action: "UPDATE",
          entityType: config.entityType,
          entityId: after.id,
          before: snap(before),
          after: snap(after),
        });
        return { before, after };
      });

      if (!result) return null;
      refresh(config.revalidate(result.after));
      return result;
    },

    /** Returns the deleted row, or null when no row has that id. */
    async remove(id: string): Promise<Row | null> {
      const actorId = await resolveActorId();
      const before = await prisma.$transaction(async (tx) => {
        const delegate = config.model(tx);
        const existing = await delegate.findUnique({ where: { id } });
        if (!existing) return null;

        await delegate.delete({ where: { id } });
        await writeAuditRow(tx, {
          actorId,
          action: "DELETE",
          entityType: config.entityType,
          entityId: existing.id,
          before: snap(existing),
        });
        return existing;
      });

      if (!before) return null;
      refresh(config.revalidate(before));
      return before;
    },
  };
}
