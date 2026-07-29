import { NextResponse, type NextRequest } from "next/server";
import { auth, getBookingScopeFilter, getLeadScopeFilter } from "@/lib/auth";
import { getReportAggregate, parseReportFilters } from "@/lib/reports/aggregate";

// Reports are ADMIN+FINANCE only (unlike requireRole() used on the page
// component, API routes reject with JSON rather than redirect() — same
// pattern as /api/admin/leads and /api/admin/bookings).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const filters = parseReportFilters(req.nextUrl.searchParams);

  // Both scope filters return {} for ADMIN/FINANCE (the only roles that can
  // reach this route) — called for consistency with the rest of the
  // codebase's scoping pattern rather than because they narrow anything here.
  const aggregate = await getReportAggregate(filters, {
    lead: getLeadScopeFilter(session),
    booking: getBookingScopeFilter(session),
  });

  return NextResponse.json(aggregate);
}
