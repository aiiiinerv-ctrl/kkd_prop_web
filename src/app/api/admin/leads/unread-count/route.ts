import { NextResponse } from "next/server";
import { auth, getLeadScopeFilter } from "@/lib/auth";
import { prisma } from "@/lib/db";

// Read-only count, not a mutation — no withAudit() needed, but still needs
// its own authorization guard (never trust the /admin/* proxy redirect
// alone). Same 401-JSON pattern as /api/admin/leads and
// /api/admin/reports/summary.
//
// "Unread" definition: the Lead schema has no read/opened tracking column,
// so this counts leads still in status NEW (an admin acting on a lead
// always moves it off NEW via updateLeadStatus() — see src/actions/leads.ts
// — so NEW is the closest available proxy for "nobody has looked at this
// yet"). CHANNEL_EXECUTIVE is excluded: that role never gets the leads
// dashboard/detail view (see admin-sidebar.tsx / dashboard page.tsx), only
// the aggregate leads list, so an "unread" badge has no meaningful home
// for it. MARKETING/EDITOR/EXECUTIVE are excluded for the same reason: they
// see leads read-only and can never act on a "NEW" one, so a nonzero count
// would just be a permanent, misleading nag (RBAC default #7).
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (
    session.user.role === "CHANNEL_EXECUTIVE" ||
    session.user.role === "MARKETING" ||
    session.user.role === "EDITOR" ||
    session.user.role === "EXECUTIVE"
  ) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.lead.count({
    where: { ...getLeadScopeFilter(session), status: "NEW" },
  });

  return NextResponse.json({ count });
}
