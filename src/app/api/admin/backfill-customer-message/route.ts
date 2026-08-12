import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { backfillCustomerMessage } from "@/lib/backfill/customer-message";
import { prisma } from "@/lib/db";

/**
 * TEMPORARY — delete this route once the production backfill has run.
 *
 * Production has no way to run `scripts/backfill-customer-message.mts`: no
 * SSH, no arbitrary-script execution in the panel, and `tsx` is a
 * devDependency the deploy artifact never contains. A gated route inside the
 * app is the only path that can run Prisma logic there — the same pattern
 * used for the MySQL cutover (see docs/plans/kkd-mysql-cutover.md).
 *
 * Gated on an ADMIN session rather than a new secret: the env-var UI on this
 * panel needs a real browser to drive, so adding one would be a whole
 * separate operation, and the work here is idempotent and only ever fills
 * NULLs. POST-only so it can't be triggered by a link or a prefetch.
 *
 * Dry run by default; pass `?commit=1` to write.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const commit = req.nextUrl.searchParams.get("commit") === "1";
  const report = await backfillCustomerMessage(prisma, { commit });

  return NextResponse.json(report);
}
