import { requireRole } from "@/lib/auth";
import { BookingsClient } from "./bookings-client";

export default async function BookingsPage() {
  // CHANNEL_EXECUTIVE never gets a bookings view (see /api/admin/bookings) —
  // bounced to /admin like any other unauthorized role via requireRole.
  await requireRole("ADMIN", "SALES", "FINANCE");

  return <BookingsClient />;
}
