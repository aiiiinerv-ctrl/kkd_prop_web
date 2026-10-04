import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveSizeTable } from "@/lib/calculator-size-table";
import { hybridTableSchema } from "@/lib/calculator-hybrid";
import { buildCalculatorWorkbook } from "@/lib/calculator-import/export";

// Read-only download of the active calculator size table as an Excel file
// (R1-S3). /api is outside the proxy matcher, so the session + role are
// checked here, before any DB read. ADMIN only. Not audited (read-only).
// exceljs stays server-side via this route handler.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const config = await prisma.calculatorConfig.findFirst();
    const { table } = resolveSizeTable(config?.sizeTable ?? null);
    // Unreadable/absent Hybrid -> no Hybrid sheet (Default #8). Brand prices go
    // into the file, which is why this route stays ADMIN-only.
    const storedHybrid = hybridTableSchema.safeParse(config?.hybridSizeTable);
    if (!storedHybrid.success && config?.hybridSizeTable != null) {
      console.error("calculator export: stored hybridSizeTable is unreadable — exporting without the Hybrid sheet");
    }
    const buffer = await buildCalculatorWorkbook({
      onGrid: table,
      hybrid: storedHybrid.success ? storedHybrid.data : null,
    });
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");

    return new NextResponse(new Blob([new Uint8Array(buffer)]), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="kkd-calculator-tables-${date}.xlsx"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("calculator export failed", err);
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
