import { NextResponse, type NextRequest } from "next/server";
import { sanitizeKey, storage } from "@/lib/storage";

// Private files (payment slips) require an admin session, further scoped by
// role. The auth check is wired in via a dynamic import so this route works
// before Phase 5 lands; until then private files are always denied.
async function isAuthorizedForPrivate(key: string): Promise<boolean> {
  try {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    const session = await auth();
    if (!session?.user) return false;

    const role = session.user.role;
    // ADMIN has full access; FINANCE gets read-only access to payment
    // records per spec (no restriction on which slip they can view).
    if (role === "ADMIN" || role === "FINANCE") return true;

    // CHANNEL_EXECUTIVE never sees customer/payment data — aggregate
    // counts and status only.
    if (role === "CHANNEL_EXECUTIVE") return false;

    // SALES can only view slips for bookings assigned to them.
    if (role === "SALES") {
      const booking = await prisma.surveyBooking.findFirst({
        where: { paymentSlipKey: key },
        select: { assignedSalesId: true },
      });
      return Boolean(booking && booking.assignedSalesId === session.user.id);
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key: segments } = await params;
  const key = sanitizeKey(segments.join("/"));
  if (!key || !(key.startsWith("public/") || key.startsWith("private/"))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const isPrivate = key.startsWith("private/");
  if (isPrivate && !(await isAuthorizedForPrivate(key))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const file = await storage.get(key);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": isPrivate
        ? "no-store"
        : "public, max-age=31536000, immutable",
    },
  });
}
