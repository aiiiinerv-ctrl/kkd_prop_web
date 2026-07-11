import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LeadsClient } from "./leads-client";

export default async function LeadsPage() {
  await requireAdmin();

  const channels = await prisma.promoChannel.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, nameTh: true },
  });

  return <LeadsClient channels={channels} />;
}
