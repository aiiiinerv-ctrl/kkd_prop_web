import { notFound } from "next/navigation";
import { canMutateBooking, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { BookingDetailClient } from "./booking-detail-client";

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Same role gate as the list — CHANNEL_EXECUTIVE/MARKETING/EXECUTIVE never
  // reach this page; EDITOR reaches it read-only.
  const session = await requireRole("ADMIN", "SALES", "FINANCE", "EDITOR");
  const { id } = await params;

  const [booking, staff] = await Promise.all([
    prisma.surveyBooking.findUnique({
      where: { id },
      include: { lead: true },
    }),
    // "Engineer" isn't its own Role in this system's RBAC — any active
    // AdminUser can be assigned as the surveying engineer, per confirmed
    // sprint 3 default. Same pool is reused for the sales assignment dropdown.
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);
  if (!booking) notFound();

  // SALES may only view bookings assigned to them — a crafted URL to another
  // salesperson's booking must not leak data, enforced server-side.
  if (session.user.role === "SALES" && booking.assignedSalesId !== session.user.id) {
    notFound();
  }

  // FINANCE and EDITOR are read-only across bookings (same as leads); ADMIN
  // and (their own) SALES bookings can be edited.
  const canMutate = canMutateBooking(session, booking);

  return (
    <BookingDetailClient
      booking={{
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        status: booking.status,
        giftSent: booking.giftSent,
        address: booking.address,
        preferredDate: booking.preferredDate.toISOString(),
        timeSlot: booking.timeSlot,
        amountThb: booking.amountThb,
        paymentSlipKey: booking.paymentSlipKey,
        paymentStatus: booking.paymentStatus,
        assignedEngineerId: booking.assignedEngineerId,
        assignedSalesId: booking.assignedSalesId,
        lead: {
          id: booking.lead.id,
          name: booking.lead.name,
          phone: booking.lead.phone,
          province: booking.lead.province,
          customerMessage: booking.lead.customerMessage,
        },
      }}
      staff={staff}
      canMutate={canMutate}
    />
  );
}
