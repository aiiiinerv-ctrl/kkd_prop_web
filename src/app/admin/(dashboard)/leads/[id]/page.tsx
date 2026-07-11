import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LeadDetailClient } from "./lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [lead, channels] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: { booking: true, sourceChannel: true },
    }),
    prisma.promoChannel.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameTh: true },
    }),
  ]);
  if (!lead) notFound();

  return (
    <LeadDetailClient
      lead={{
        id: lead.id,
        type: lead.type,
        status: lead.status,
        name: lead.name,
        phone: lead.phone,
        lineId: lead.lineId,
        province: lead.province,
        buildingType: lead.buildingType,
        avgMonthlyBill: lead.avgMonthlyBill,
        locale: lead.locale,
        notes: lead.notes,
        sourceChannelId: lead.sourceChannelId,
        createdAt: lead.createdAt.toISOString(),
        booking: lead.booking
          ? {
              id: lead.booking.id,
              address: lead.booking.address,
              preferredDate: lead.booking.preferredDate.toISOString(),
              timeSlot: lead.booking.timeSlot,
              amountThb: lead.booking.amountThb,
              paymentSlipKey: lead.booking.paymentSlipKey,
              paymentStatus: lead.booking.paymentStatus,
            }
          : null,
      }}
      channels={channels}
    />
  );
}
