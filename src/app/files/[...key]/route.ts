import { NextResponse, type NextRequest } from "next/server";
import { sanitizeKey, storage } from "@/lib/storage";

// Private files (payment slips) require an admin session, further scoped by
// role. The auth check is wired in via a dynamic import so this route works
// before Phase 5 lands; until then private files are always denied.
const CALCULATOR_IMPORT_PREFIX = "private/calculator-imports/";

/** Case-insensitive: on a case-insensitive filesystem (macOS dev) a key like
 * "private/Calculator-Imports/…" opens the same file, so an exact-case check
 * would let it fall through to the FINANCE shortcut below. */
function isCalculatorImportKey(key: string): boolean {
  return key.toLowerCase().startsWith(CALCULATOR_IMPORT_PREFIX);
}

async function isAuthorizedForPrivate(key: string): Promise<boolean> {
  try {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    const session = await auth();
    if (!session?.user) return false;

    const role = session.user.role;

    // Calculator import originals are ADMIN-only — checked before the
    // ADMIN/FINANCE shortcut below so FINANCE never gets a free pass on
    // this prefix the way it does for payment slips.
    if (isCalculatorImportKey(key)) {
      return role === "ADMIN";
    }

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

    // MARKETING, EDITOR, and EXECUTIVE (added 2026-08-16) fall through to
    // here — none of the 3 new roles get financial/slip data (permission
    // matrix: no role beyond ADMIN/FINANCE/own-SALES-booking ever does).
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

  if (isCalculatorImportKey(key)) {
    // Never trust the original filename in the key for a header value —
    // derive an ASCII-only name from the id segment, falling back to a
    // fixed name if it contains anything outside [A-Za-z0-9_-].
    const idSegment = key.slice(CALCULATOR_IMPORT_PREFIX.length).replace(/\.[^./]+$/, "");
    const safeId = /^[A-Za-z0-9_-]+$/.test(idSegment) ? idSegment : "file";
    return new NextResponse(new Uint8Array(file.data), {
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="calculator-import-${safeId}.xlsx"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
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
