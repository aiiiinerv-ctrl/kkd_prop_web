"use client";

// List of the On-grid working copy (R1-S5 read-only list, R1-S6 row states —
// design-162 §4). One row per size; values are never edited here, "แก้ไข"
// opens the size dialog. Production / saving columns use the same helpers as
// the public calculator (src/lib/calculator.ts) so the numbers can't drift.
//
// Layout decision (R1-S5 review, tablet 820px): the size cell is sticky-left
// and carries the edit button and the status badges, so the action is always
// visible next to the row's identity instead of sitting off-screen at the far
// end of a 11-column table (a sticky-right column would overlap the cells
// scrolling under it and still needs a second pinned column).
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
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
import { sizeRowKwhPerMonth, sizeRowMonthlySavingThb } from "@/lib/calculator";
import {
  changedFields,
  resolveRow,
  rowStatus,
  type DraftField,
  type DraftIssue,
  type DraftRow,
} from "@/hooks/admin/use-table-draft";
import { cn } from "@/lib/utils";

const th = (n: number) => n.toLocaleString("th-TH");
const kwId = (kw: number) => String(kw).replace(".", "_");
const isNum = (v: number | null): v is number => typeof v === "number" && Number.isFinite(v);
const show = (v: number | null, fmt: (n: number) => string) => (isNum(v) ? fmt(v) : "—");

export function OnGridList({
  rows,
  issues,
  editLocked,
  lockReason,
  onAdd,
  onEdit,
  onRestore,
}: {
  rows: DraftRow[];
  issues: DraftIssue[];
  /** Editing is blocked (import panel open / busy). */
  editLocked: boolean;
  /** Visible explanation for the disabled buttons (title is useless on a
   * disabled button — button.tsx sets pointer-events-none). */
  lockReason: string | null;
  onAdd: () => void;
  onEdit: (key: string) => void;
  onRestore: (key: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-muted-foreground">
          ตารางแนะนำขนาดระบบแบบ On-grid — 1 แถวต่อขนาด (ผลิต/ประหยัดเป็นค่าที่ระบบคำนวณ)
        </p>
        <Button
          type="button"
          id="calc-add-on-grid"
          variant="outline"
          size="sm"
          disabled={editLocked}
          onClick={onAdd}
        >
          <Plus className="size-4" />
          เพิ่มขนาด
        </Button>
      </div>
      {lockReason && (
        <p id="calc-edit-lock-hint" className="text-xs text-muted-foreground">
          {lockReason}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table className="text-xs sm:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-[1] bg-card whitespace-nowrap">ขนาด / สถานะ</TableHead>
              <TableHead className="whitespace-nowrap">เฟส</TableHead>
              <TableHead className="whitespace-nowrap text-right">ช่วงค่าไฟ (฿)</TableHead>
              <TableHead className="whitespace-nowrap text-right">ชม.แดด</TableHead>
              <TableHead className="whitespace-nowrap text-right">วัน</TableHead>
              <TableHead className="whitespace-nowrap text-right">ค่าไฟ/หน่วย</TableHead>
              <TableHead className="whitespace-nowrap text-right">แผง</TableHead>
              <TableHead className="whitespace-nowrap text-right">หลังคา (ตร.ม.)</TableHead>
              <TableHead className="whitespace-nowrap text-right">ผลิต kWh/ด.*</TableHead>
              <TableHead className="whitespace-nowrap text-right">ประหยัด/ด.*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                  ไม่มีขนาดในตาราง — กด &quot;เพิ่มขนาด&quot; หรือ &quot;คืนขนาดนี้&quot; ก่อนบันทึก
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => {
              const status = rowStatus(row);
              const deleted = status === "deleted";
              const rowIssues = issues.filter((i) => i.key === row.key);
              const diff = status === "changed" ? changedFields(row) : new Set<DraftField>();
              const resolved = resolveRow(row.current);
              const c = row.current;
              const mark = (field: DraftField, content: ReactNode) =>
                diff.has(field) ? <mark className="rounded bg-amber-50 px-1">{content}</mark> : content;
              const kwLabel = isNum(c.kw) ? `${th(c.kw)} kW` : "ขนาดใหม่";
              return (
                <TableRow
                  key={row.key}
                  data-status={status}
                  className={cn(deleted && "text-muted-foreground line-through")}
                >
                  <TableCell
                    className={cn(
                      "sticky left-0 z-[1] bg-card font-medium",
                      rowIssues.length > 0
                        ? "shadow-[inset_3px_0_0_var(--destructive)]"
                        : (status === "changed" || status === "new") && "shadow-[inset_3px_0_0_var(--primary)]"
                    )}
                  >
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="min-w-12">{mark("kw", kwLabel)}</span>
                      {deleted ? (
                        <Button
                          type="button"
                          id={`calc-restore-on-grid-${isNum(c.kw) ? kwId(c.kw) : row.key}`}
                          variant="ghost"
                          size="sm"
                          className="no-underline"
                          disabled={editLocked}
                          onClick={() => onRestore(row.key)}
                        >
                          คืนขนาดนี้
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          id={`calc-edit-on-grid-${isNum(c.kw) ? kwId(c.kw) : row.key}`}
                          variant="ghost"
                          size="sm"
                          disabled={editLocked}
                          aria-label={`แก้ไขขนาด ${isNum(c.kw) ? th(c.kw) : "ใหม่"} kW`}
                          onClick={() => onEdit(row.key)}
                        >
                          แก้ไข
                        </Button>
                      )}
                    </div>
                    {(status !== "same" || rowIssues.length > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1 no-underline">
                        {status === "changed" && <Badge variant="outline">แก้แล้ว</Badge>}
                        {status === "new" && <Badge variant="secondary">ใหม่</Badge>}
                        {deleted && <Badge variant="secondary">จะลบ</Badge>}
                        {rowIssues.length > 0 && !deleted && (
                          <Badge variant="destructive">ผิด {rowIssues.length}</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {mark("phases", [...c.phases].sort().join(", ") || "—")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">
                    {mark("billMin", show(c.billMin, th))}–{mark("billMax", show(c.billMax, th))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{mark("sunHours", show(c.sunHours, String))}</TableCell>
                  <TableCell className="text-right tabular-nums">{mark("days", show(c.days, String))}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {mark("pricePerKwh", show(c.pricePerKwh, (n) => n.toFixed(2)))}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{mark("panels", show(c.panels, String))}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {mark("roofM2", resolved ? resolved.roofM2.toFixed(1) : show(c.roofM2, (n) => n.toFixed(1)))}
                  </TableCell>
                  <TableCell className="bg-muted/40 text-right tabular-nums text-muted-foreground">
                    {resolved ? th(Math.round(sizeRowKwhPerMonth(resolved))) : "—"}
                  </TableCell>
                  <TableCell className="bg-muted/40 text-right tabular-nums text-muted-foreground">
                    {resolved ? `฿${th(Math.round(sizeRowMonthlySavingThb(resolved)))}` : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        * ระบบคำนวณ: ผลิต = ขนาด × ชม.แดด × วัน · ประหยัด = ผลิต × ค่าไฟ/หน่วย (ไม่จำกัดตามบิล
        ใช้ตรวจตัวเลขเท่านั้น)
      </p>
    </div>
  );
}
