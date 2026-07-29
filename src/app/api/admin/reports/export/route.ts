import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { auth, getLeadScopeFilter } from "@/lib/auth";
import { EXPORT_COLUMNS, getExportRows } from "@/lib/reports/export-rows";
import { parseReportFilters } from "@/lib/reports/aggregate";

// exceljs must only ever be imported here (a server-only route handler) —
// never from a client component or a module that a client component
// imports — to keep it out of the browser bundle entirely.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!["ADMIN", "FINANCE"].includes(session.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const filters = parseReportFilters(req.nextUrl.searchParams);
  const rows = await getExportRows(filters, { lead: getLeadScopeFilter(session) });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("รายงาน");
  sheet.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `kkd-report-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Blob([buffer]), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
