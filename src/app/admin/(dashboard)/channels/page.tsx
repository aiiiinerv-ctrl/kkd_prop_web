import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { ChannelsClient } from "./channels-client";

// Channel *management* (create/edit channels + executives, promote links) is
// ADMIN-only. CHANNEL_EXECUTIVE gets a read-only view scoped to their own
// linked channel. SALES/FINANCE have no access to this page at all.
export default async function AdminChannelsPage() {
  const session = await requireRole("ADMIN", "CHANNEL_EXECUTIVE");
  const isAdmin = session.user.role === "ADMIN";

  const channels = await prisma.promoChannel.findMany({
    where: isAdmin
      ? undefined
      : { id: session.user.linkedChannelId ?? "__no_channel_link__" },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { leads: true, autoLeads: true } },
      executives: { orderBy: { refCode: "asc" } },
    },
  });

  return (
    <ChannelsClient
      siteUrl={SITE_URL}
      readOnly={!isAdmin}
      channels={channels.map((c) => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        type: c.type,
        refCode: c.refCode,
        isActive: c.isActive,
        sortOrder: c.sortOrder,
        createdAt: c.createdAt.toISOString(),
        leadCount: c._count.leads + c._count.autoLeads,
        executives: c.executives.map((e) => ({
          id: e.id,
          name: e.name,
          phone: e.phone,
          refCode: e.refCode,
          createdAt: e.createdAt.toISOString(),
        })),
      }))}
    />
  );
}
