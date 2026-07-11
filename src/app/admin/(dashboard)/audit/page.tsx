import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuditClient } from "./audit-client";

const PAGE_SIZE = 30;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const [total, logs] = await Promise.all([
    prisma.auditLog.count(),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <AuditClient
      logs={logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        actorName: l.actor.name,
        actorEmail: l.actor.email,
        before: l.before as Record<string, unknown> | null,
        after: l.after as Record<string, unknown> | null,
        createdAt: l.createdAt.toISOString(),
      }))}
      page={page}
      pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
      total={total}
    />
  );
}
