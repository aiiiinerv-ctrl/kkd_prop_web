import { NextResponse, type NextRequest } from "next/server";
import { auth, canViewReports, getBookingScopeFilter, getLeadScopeFilter } from "@/lib/auth";
import { getReportAggregate, parseReportFilters } from "@/lib/reports/aggregate";

// Reports are open to ADMIN/FINANCE/MARKETING/EDITOR/EXECUTIVE (unlike
// requireRole() used on the page component, API routes reject with JSON
// rather than redirect() — same pattern as /api/admin/leads and
// /api/admin/bookings).
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!canViewReports(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const filters = parseReportFilters(req.nextUrl.searchParams);

  // Both scope filters return {} for every role that can reach this route
  // (see getLeadScopeFilter/getBookingScopeFilter) — called for consistency
  // with the rest of the codebase's scoping pattern rather than because they
  // narrow anything here.
  const aggregate = await getReportAggregate(filters, {
    lead: getLeadScopeFilter(session),
    booking: getBookingScopeFilter(session),
  });

  return NextResponse.json(aggregate);
}
