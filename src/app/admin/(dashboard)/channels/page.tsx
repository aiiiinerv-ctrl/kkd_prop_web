import { canManageChannelExecutives, canManageChannels, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITE_URL } from "@/lib/seo";
import { ChannelsClient } from "./channels-client";

// Channel *management* (create/edit channels + promote links) is ADMIN and
// MARKETING. Channel *executive* management is also open to EDITOR (they
// can add/edit executives but not touch the channel itself). CHANNEL_EXECUTIVE
// gets a read-only view scoped to their own linked channel. SALES/FINANCE/
// EXECUTIVE have no access to this page at all.
export default async function AdminChannelsPage() {
  const session = await requireRole("ADMIN", "CHANNEL_EXECUTIVE", "MARKETING", "EDITOR");
  // MARKETING/EDITOR see every channel (not scoped to a linked one) — only
  // CHANNEL_EXECUTIVE gets the narrowed, self-only query.
  const isChannelExecutive = session.user.role === "CHANNEL_EXECUTIVE";

  const [channels, adminUsers] = await Promise.all([
    prisma.promoChannel.findMany({
      where: isChannelExecutive
        ? { id: session.user.linkedChannelId ?? "__no_channel_link__" }
        : undefined,
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { leads: true, autoLeads: true } },
        executives: { orderBy: { refCode: "asc" } },
      },
    }),
    // Only roles that can manage executives ever see the create form
    // (gated by canManageExecutives below), but fetching unconditionally
    // keeps this a plain parallel load. Deliberately NOT widened to include
    // MARKETING/EDITOR/EXECUTIVE — this list is "who can be picked as a
    // channel executive" (people whose sales get measured), not "who can
    // administer channels", so it stays SALES/CHANNEL_EXECUTIVE only.
    prisma.adminUser.findMany({
      where: { role: { in: ["SALES", "CHANNEL_EXECUTIVE"] }, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, phone: true },
    }),
  ]);

  return (
    <ChannelsClient
      siteUrl={SITE_URL}
      canManageChannels={canManageChannels(session.user.role)}
      canManageExecutives={canManageChannelExecutives(session.user.role)}
      adminUsers={adminUsers}
      channels={channels.map((c) => ({
        id: c.id,
        nameTh: c.nameTh,
        nameEn: c.nameEn,
        type: c.type,
        subType: c.subType,
        landingPath: c.landingPath,
        utmCampaign: c.utmCampaign,
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
