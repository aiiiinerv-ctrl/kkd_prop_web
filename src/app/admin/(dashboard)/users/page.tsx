import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const session = await requireRole("ADMIN");

  const [users, channelExecutives] = await Promise.all([
    prisma.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        linkedChannelExecutiveId: true,
      },
    }),
    prisma.channelExecutive.findMany({
      orderBy: { refCode: "asc" },
      select: { id: true, name: true, refCode: true, channel: { select: { nameTh: true } } },
    }),
  ]);

  return (
    <UsersClient
      users={users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      }))}
      currentUserId={session.user.id}
      channelExecutives={channelExecutives.map((e) => ({
        id: e.id,
        label: `${e.channel.nameTh} · ${e.name} (${e.refCode})`,
      }))}
    />
  );
}
