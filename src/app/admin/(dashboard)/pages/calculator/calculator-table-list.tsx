"use client";

// Lists of the On-grid and Hybrid working copies (R1-S5 read-only list, R1-S6
// row states, R2-S6 Hybrid list — design-162 §4). One row per size; values are never edited here, "แก้ไข"
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
import { validateHybridTable } from "@/lib/calculator-import/validate-hybrid";
import {
  hybridSizeStatus,
  resolveHybridSize,
  summarizeHybridRows,
  type DraftHybridSize,
  type HybridIssue,
  type HybridSizeSummary,
  dedupeHybridIssues,
} from "@/hooks/admin/hybrid-draft";
import type { HybridRow } from "@/lib/calculator-hybrid";
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

const WARN_BADGE_CLASS = "border-amber-300 bg-amber-50 text-amber-800";

const fmtYears = (n: number) => n.toFixed(1);

/** The displayed text of each Hybrid list cell, so "changed" highlighting only
 * marks cells whose shown value really differs from the saved one (m4). */
function hybridCellText(
  values: { billMin: number | null; billMax: number | null; panels: number | null },
  summary: HybridSizeSummary | null
) {
  const payback = !summary
    ? "—"
    : summary.paybackMin === null
      ? "ไม่แสดง (ไม่มีราคา)"
      : summary.paybackMin === summary.paybackMax
        ? fmtYears(summary.paybackMin)
        : `${fmtYears(summary.paybackMin)}–${fmtYears(summary.paybackMax!)}`;
  return {
    phases: summary ? summary.phases.join(", ") || "—" : "—",
    batteries: summary ? summary.batteries.map((b) => th(b)).join(" · ") : "—",
    bill: `${show(values.billMin, th)}–${show(values.billMax, th)}`,
    panels: show(values.panels, String),
    brands: summary ? `${summary.brandsWithPrice}/${summary.brandCount}` : "—",
    payback: payback + (summary && summary.rowsWithoutPrice > 0 ? "\u0000แบต: ไม่มีราคา" : ""),
  };
}

/** Non-blocking warnings (E3/E4/E5) of one Hybrid size, judged on its own rows. */
function sizeWarningCount(rows: HybridRow[] | null): number {
  if (!rows) return 0;
  return validateHybridTable(rows).warnings.length;
}

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
              const strike = deleted && "line-through";
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
                  className={cn(deleted && "text-muted-foreground")}
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
                      <span className={cn("min-w-12", deleted && "line-through")}>{mark("kw", kwLabel)}</span>
                      {deleted ? (
                        <Button
                          type="button"
                          id={`calc-restore-on-grid-${isNum(c.kw) ? kwId(c.kw) : row.key}`}
                          variant="ghost"
                          size="sm"
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
                      <div className="mt-1 flex flex-wrap gap-1">
                        {status === "changed" && <Badge variant="outline">แก้แล้ว</Badge>}
                        {status === "new" && <Badge variant="secondary">ใหม่</Badge>}
                        {deleted && <Badge variant="secondary">จะลบ</Badge>}
                        {rowIssues.length > 0 && !deleted && (
                          <Badge variant="destructive">ผิด {rowIssues.length}</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={cn("whitespace-nowrap", strike)}>
                    {mark("phases", [...c.phases].sort().join(", ") || "—")}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums whitespace-nowrap", strike)}>
                    {mark("billMin", show(c.billMin, th))}–{mark("billMax", show(c.billMax, th))}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>{mark("sunHours", show(c.sunHours, String))}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>{mark("days", show(c.days, String))}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>
                    {mark("pricePerKwh", show(c.pricePerKwh, (n) => n.toFixed(2)))}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>{mark("panels", show(c.panels, String))}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>
                    {(() => {
                      const shown = resolved ? resolved.roofM2.toFixed(1) : show(c.roofM2, (n) => n.toFixed(1));
                      const was = row.original ? row.original.roofM2.toFixed(1) : null;
                      // Only mark when the displayed value really changed (auto roof = panels x 2.7).
                      return was !== null && was === shown ? shown : mark("roofM2", shown);
                    })()}
                  </TableCell>
                  <TableCell className={cn("bg-muted/40 text-right tabular-nums text-muted-foreground", strike)}>
                    {resolved ? th(Math.round(sizeRowKwhPerMonth(resolved))) : "—"}
                  </TableCell>
                  <TableCell className={cn("bg-muted/40 text-right tabular-nums text-muted-foreground", strike)}>
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

/** Hybrid list: one row per kW (all phases / batteries of the size). The edit
 * button and badges sit in the sticky size cell, like the On-grid list. */
export function HybridList({
  sizes,
  brands,
  multiplier,
  issues,
  editLocked,
  lockReason,
  onAdd,
  onEdit,
  onRestore,
}: {
  /** null = no Hybrid table in the live config (nothing to edit). */
  sizes: DraftHybridSize[] | null;
  brands: string[];
  multiplier: number;
  issues: HybridIssue[];
  editLocked: boolean;
  lockReason: string | null;
  onAdd: () => void;
  onEdit: (key: string) => void;
  onRestore: (key: string) => void;
}) {
  if (sizes === null) {
    return (
      <div
        id="calc-hybrid-empty"
        className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground"
      >
        ยังไม่มีตาราง Hybrid — หน้าเครื่องคำนวณจึงไม่แสดงตัวเลือก Hybrid นำเข้าไฟล์ Excel
        ที่มีชีต Hybrid เพื่อเริ่มใช้
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 text-sm text-muted-foreground">
          ตารางแนะนำขนาดระบบแบบ Hybrid (แบตเตอรี่) — 1 แถวต่อขนาด รวมทุกเฟสและทุกขนาดแบต
        </p>
        <Button
          type="button"
          id="calc-add-hybrid"
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
        <p id="calc-edit-lock-hint-hybrid" className="text-xs text-muted-foreground">
          {lockReason}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        {/* Fixed layout with percentage widths: all columns fit the ~540px content width at a
            820px viewport (240px sidebar) and the extra width at 1280px is spread, not pooled. */}
        <Table className="table-fixed text-xs lg:text-sm [&_td]:whitespace-normal [&_th]:whitespace-normal [&_td]:px-1.5 [&_th]:px-1.5 lg:[&_td]:px-2 lg:[&_th]:px-2">
          <colgroup>
            <col style={{ width: "21%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-[1] bg-card">ขนาด / สถานะ</TableHead>
              <TableHead>เฟส</TableHead>
              <TableHead>แบต (kWh)</TableHead>
              <TableHead className="text-right">ช่วงค่าไฟ (฿)</TableHead>
              <TableHead className="text-right">แผง</TableHead>
              <TableHead className="text-right whitespace-normal">ยี่ห้อที่มีราคา*</TableHead>
              <TableHead className="text-right whitespace-normal">คืนทุน (ปี)*</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sizes.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                  ไม่มีขนาดในตาราง — กด &quot;เพิ่มขนาด&quot; หรือ &quot;คืนขนาดนี้&quot; ก่อนบันทึก
                </TableCell>
              </TableRow>
            )}
            {sizes.map((size) => {
              const status = hybridSizeStatus(size, brands);
              const deleted = status === "deleted";
              const strike = deleted && "line-through";
              const rowIssues = dedupeHybridIssues(issues.filter((i) => i.key === size.key));
              const c = size.current;
              const resolved = deleted ? size.original : resolveHybridSize(c, brands);
              const summary = resolved ? summarizeHybridRows(resolved, multiplier) : null;
              const warnCount = deleted ? 0 : sizeWarningCount(resolved);
              const now = hybridCellText(c, summary);
              const was =
                status === "changed" && size.original
                  ? hybridCellText(size.original[0], summarizeHybridRows(size.original, multiplier))
                  : null;
              const mark = (key: keyof typeof now, content: ReactNode) =>
                was && was[key] !== now[key] ? <mark className="rounded bg-amber-50 px-1">{content}</mark> : content;
              const kwLabel = isNum(c.kw) ? `${th(c.kw)} kW` : "ขนาดใหม่";
              const idKw = isNum(c.kw) ? kwId(c.kw) : size.key;
              return (
                <TableRow
                  key={size.key}
                  data-status={status}
                  className={cn(deleted && "text-muted-foreground")}
                >
                  <TableCell
                    className={cn(
                      "sticky left-0 z-[1] bg-card font-medium",
                      rowIssues.length > 0
                        ? "shadow-[inset_3px_0_0_var(--destructive)]"
                        : (status === "changed" || status === "new") && "shadow-[inset_3px_0_0_var(--primary)]"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className={cn("min-w-12", deleted && "line-through")}>{kwLabel}</span>
                      {deleted ? (
                        <Button
                          type="button"
                          id={`calc-restore-hybrid-${idKw}`}
                          variant="ghost"
                          size="sm"
                          disabled={editLocked}
                          onClick={() => onRestore(size.key)}
                        >
                          คืนขนาดนี้
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          id={`calc-edit-hybrid-${idKw}`}
                          variant="ghost"
                          size="sm"
                          disabled={editLocked}
                          aria-label={`แก้ไขขนาด ${isNum(c.kw) ? th(c.kw) : "ใหม่"} kW (Hybrid)`}
                          onClick={() => onEdit(size.key)}
                        >
                          แก้ไข
                        </Button>
                      )}
                    </div>
                    {(status !== "same" || rowIssues.length > 0 || warnCount > 0) && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {status === "changed" && <Badge variant="outline">แก้แล้ว</Badge>}
                        {status === "new" && <Badge variant="secondary">ใหม่</Badge>}
                        {deleted && <Badge variant="secondary">จะลบ</Badge>}
                        {rowIssues.length > 0 && !deleted && (
                          <Badge variant="destructive">ผิด {rowIssues.length}</Badge>
                        )}
                        {warnCount > 0 && rowIssues.length === 0 && (
                          <Badge variant="outline" className={WARN_BADGE_CLASS}>
                            เตือน {warnCount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className={cn(strike)}>{mark("phases", now.phases)}</TableCell>
                  <TableCell className={cn(strike)}>{mark("batteries", now.batteries)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums break-words", strike)}>
                    {mark("bill", now.bill.replace("–", "–\u200b"))}
                  </TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>{mark("panels", now.panels)}</TableCell>
                  <TableCell className={cn("text-right tabular-nums", strike)}>{mark("brands", now.brands)}</TableCell>
                  <TableCell className={cn("bg-muted/40 text-right tabular-nums text-muted-foreground", strike)}>
                    {mark(
                      "payback",
                      <>
                        {now.payback.split("\u0000")[0]}
                        {summary && summary.rowsWithoutPrice > 0 && (
                          <span className="block text-xs">แบต: ไม่มีราคา</span>
                        )}
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        * ราคาเป็นราคาต่อยี่ห้อจาก Excel ชื่อยี่ห้อแก้ได้ทาง Excel เท่านั้น คืนทุนคิดจากราคาต่ำสุดที่ใช้ได้
      </p>
    </div>
  );
}
