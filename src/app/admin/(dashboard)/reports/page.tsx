import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ReportsClient } from "./reports-client";

// Reports (dashboard breakdown + Excel export) are ADMIN+FINANCE only —
// mirrors the role gate already enforced in /api/admin/reports/*.
export default async function ReportsPage() {
  await requireRole("ADMIN", "FINANCE");

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

  return <ReportsClient channels={channels} executives={executives} salesUsers={salesUsers} />;
}
