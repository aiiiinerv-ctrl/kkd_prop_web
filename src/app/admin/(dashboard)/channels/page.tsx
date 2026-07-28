import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { ChannelsClient } from "./channels-client";

export default async function AdminChannelsPage() {
  await requireAdmin();

  const channels = await prisma.promoChannel.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { leads: true, autoLeads: true } },
      executives: { orderBy: { refCode: "asc" } },
    },
  });

  return (
    <ChannelsClient
      siteUrl={SITE_URL}
      channels={channels.map((c) => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        refCode: c.refCode,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        leadCount: c._count.leads + c._count.autoLeads,
        executives: c.executives.map((e) => ({
          id: e.id,
          name: e.name,
          phone: e.phone,
          refCode: e.refCode,
        })),
      }))}
    />
  );
}
