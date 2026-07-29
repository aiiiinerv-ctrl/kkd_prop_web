import { notFound, redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LeadDetailClient } from "./lead-detail-client";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;

  // CHANNEL_EXECUTIVE only ever gets aggregate counts/status (see the leads
  // list) — the detail view below renders name/phone/LINE ID/address/payment
  // slip, so that role never gets a detail page at all.
  if (session.user.role === "CHANNEL_EXECUTIVE") {
    redirect("/admin/leads");
  }

  const [lead, channels, salesUsers] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        booking: true,
        sourceChannel: true,
        autoSourceChannel: true,
        autoSourceExecutive: true,
        assignedSales: { select: { id: true, name: true } },
      },
    }),
    prisma.promoChannel.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameTh: true },
    }),
    prisma.adminUser.findMany({
      where: { role: "SALES", isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!lead) notFound();

  // SALES may only view leads assigned to them — a crafted URL to another
  // salesperson's lead must not leak data, so this is enforced server-side,
  // not just hidden from the list.
  if (session.user.role === "SALES" && lead.assignedSalesId !== session.user.id) {
    notFound();
  }

  // FINANCE is fully read-only across leads/bookings; ADMIN and (their own)
  // SALES leads can edit status/notes/payment.
  const canEdit = session.user.role !== "FINANCE";
  const canEditChannel = session.user.role === "ADMIN";
  // Sales assignment sets ownership/attribution (see getLeadScopeFilter()),
  // not day-to-day follow-up — kept ADMIN-only, same as canEditChannel.
  const canAssignSales = session.user.role === "ADMIN";

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
        buildingTypeOtherText: lead.buildingTypeOtherText,
        avgMonthlyBill: lead.avgMonthlyBill,
        interestedSystems: Array.isArray(lead.interestedSystems)
          ? (lead.interestedSystems as string[])
          : null,
        locale: lead.locale,
        notes: lead.notes,
        sourceChannelId: lead.sourceChannelId,
        autoSourceChannelName: lead.autoSourceChannel?.nameTh ?? null,
        autoSourceExecutiveName: lead.autoSourceExecutive?.name ?? null,
        assignedSalesId: lead.assignedSalesId,
        assignedSalesName: lead.assignedSales?.name ?? null,
        lastFollowUpAt: lead.lastFollowUpAt ? lead.lastFollowUpAt.toISOString() : null,
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
      salesUsers={salesUsers}
      canEdit={canEdit}
      canEditChannel={canEditChannel}
      canAssignSales={canAssignSales}
    />
  );
}
