import { canExportReports, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReportsClient } from "./reports-client";

// Reports (dashboard breakdown) are open to ADMIN, FINANCE, and the three
// new roles per the permission matrix; export (xlsx, full PII) is further
// restricted to everyone except EXECUTIVE — mirrors the role gate already
// enforced in /api/admin/reports/*.
export default async function ReportsPage() {
  const session = await requireRole("ADMIN", "FINANCE", "MARKETING", "EDITOR", "EXECUTIVE");

  const [channels, executives, salesUsers] = await Promise.all([
    prisma.promoChannel.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameTh: true },
    }),
    prisma.channelExecutive.findMany({
      orderBy: { refCode: "asc" },
      select: { id: true, name: true },
    }),
    prisma.adminUser.findMany({
      where: { role: "SALES", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <ReportsClient
      channels={channels}
      executives={executives}
      salesUsers={salesUsers}
      canExport={canExportReports(session.user.role)}
    />
  );
}
