import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ChannelsClient } from "./channels-client";

export default async function AdminChannelsPage() {
  await requireAdmin();

  const channels = await prisma.promoChannel.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { leads: true } } },
  });

  return (
    <ChannelsClient
      channels={channels.map((c) => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        leadCount: c._count.leads,
      }))}
    />
  );
}
