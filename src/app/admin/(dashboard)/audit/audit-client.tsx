"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AuditRow = {
  id: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  entityType: string;
  entityId: string;
  actorName: string;
  actorEmail: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
};

const ACTION_STYLE: Record<
  AuditRow["action"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  CREATE: { label: "สร้าง", variant: "default" },
  UPDATE: { label: "แก้ไข", variant: "secondary" },
  DELETE: { label: "ลบ", variant: "destructive" },
  LOGIN: { label: "เข้าสู่ระบบ", variant: "secondary" },
};

const ENTITY_LABELS: Record<string, string> = {
  Lead: "Lead",
  SurveyBooking: "การนัดสำรวจ",
  Service: "บริการ",
  Package: "แพ็กเกจ",
  PortfolioProject: "ผลงาน",
  PromoChannel: "ช่องทางโปรโมท",
  AdminUser: "ผู้ใช้ระบบ",
};

/** Field-level diff computed from the two stored snapshots. */
function diffFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): { field: string; from: string; to: string }[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  keys.delete("updatedAt");
  keys.delete("createdAt");

  const rows: { field: string; from: string; to: string }[] = [];
  for (const key of keys) {
    const fromVal = before?.[key];
    const toVal = after?.[key];
    const from = JSON.stringify(fromVal) ?? "-";
    const to = JSON.stringify(toVal) ?? "-";
    if (from !== to) {
      rows.push({ field: key, from, to });
    }
  }
  return rows;
}

export function AuditClient({
  logs,
  page,
  pageCount,
  total,
}: {
  logs: AuditRow[];
  page: number;
  pageCount: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">ประวัติการแก้ไข (Audit Log)</h1>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>เวลา</TableHead>
              <TableHead>ผู้ทำรายการ</TableHead>
              <TableHead>การกระทำ</TableHead>
              <TableHead>รายการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-10 text-center text-muted-foreground"
                >
                  ยังไม่มีประวัติ
                </TableCell>
              </TableRow>
            )}
            {logs.map((log) => {
              const style = ACTION_STYLE[log.action];
              const isOpen = expanded === log.id;
              const changes =
                log.action === "LOGIN" ? [] : diffFields(log.before, log.after);
              return (
                <Fragment key={log.id}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => setExpanded(isOpen ? null : log.id)}
                  >
                    <TableCell>
                      {log.action !== "LOGIN" &&
                        (isOpen ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        ))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("th-TH")}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{log.actorName}</span>{" "}
                      <span className="text-xs text-muted-foreground">
                        {log.actorEmail}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={style.variant}>{style.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {ENTITY_LABELS[log.entityType] ?? log.entityType}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    </TableCell>
                  </TableRow>
                  {isOpen && log.action !== "LOGIN" && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/40">
                        {changes.length === 0 ? (
                          <p className="py-2 text-sm text-muted-foreground">
                            ไม่มีข้อมูลเปลี่ยนแปลง
                          </p>
                        ) : (
                          <div className="overflow-x-auto py-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-1 pr-4 font-medium">ฟิลด์</th>
                                  <th className="py-1 pr-4 font-medium">ก่อน</th>
                                  <th className="py-1 font-medium">หลัง</th>
                                </tr>
                              </thead>
                              <tbody>
                                {changes.map((c) => (
                                  <tr key={c.field} className="border-t border-border/60">
                                    <td className="py-1.5 pr-4 font-mono font-medium">
                                      {c.field}
                                    </td>
                                    <td className="max-w-xs py-1.5 pr-4 break-all text-destructive">
                                      {c.from ?? "-"}
                                    </td>
                                    <td className="max-w-xs py-1.5 break-all text-green-700">
                                      {c.to ?? "-"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>

        {pageCount > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <span className="text-sm text-muted-foreground">
              ทั้งหมด {total} รายการ · หน้า {page}/{pageCount}
            </span>
            <div className="flex gap-2">
              <Link href={`/admin/audit?page=${page - 1}`} aria-disabled={page <= 1}>
                <Button variant="outline" size="sm" disabled={page <= 1}>
                  ก่อนหน้า
                </Button>
              </Link>
              <Link
                href={`/admin/audit?page=${page + 1}`}
                aria-disabled={page >= pageCount}
              >
                <Button variant="outline" size="sm" disabled={page >= pageCount}>
                  ถัดไป
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
