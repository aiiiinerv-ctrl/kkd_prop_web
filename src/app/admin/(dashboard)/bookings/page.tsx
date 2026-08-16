import { requireRole } from "@/lib/auth";
import { BookingsClient } from "./bookings-client";

export default async function BookingsPage() {
  // CHANNEL_EXECUTIVE/MARKETING/EXECUTIVE never get a bookings view (see
  // /api/admin/bookings) — bounced to /admin via requireRole. EDITOR gets
  // read-only access (see canMutateBooking in the detail page).
  await requireRole("ADMIN", "SALES", "FINANCE", "EDITOR");

  return <BookingsClient />;
}
