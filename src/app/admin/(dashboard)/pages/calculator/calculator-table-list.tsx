"use client";

// Read-only list of the active size table (R1-S5, design-162 §4). One row per
// size; the "edit" / "add" buttons render disabled until the editor lands in
// R1-S6. Production / saving columns use the same helpers as the public
// calculator (src/lib/calculator.ts) so the numbers can't drift.
import { Plus } from "lucide-react";
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
import type { SizeRow } from "@/lib/calculator-size-table";

const th = (n: number) => n.toLocaleString("th-TH");
const kwId = (kw: number) => String(kw).replace(".", "_");

export function OnGridList({ rows }: { rows: SizeRow[] }) {
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
          disabled
          title="การแก้ตารางในหน้านี้ยังไม่เปิดใช้งาน — ใช้นำเข้าไฟล์ Excel ไปก่อน"
        >
          <Plus className="size-4" />
          เพิ่มขนาด
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table className="text-xs sm:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 bg-card whitespace-nowrap">ขนาด</TableHead>
              <TableHead className="whitespace-nowrap">เฟส</TableHead>
              <TableHead className="whitespace-nowrap text-right">ช่วงค่าไฟ (฿)</TableHead>
              <TableHead className="whitespace-nowrap text-right">ชม.แดด</TableHead>
              <TableHead className="whitespace-nowrap text-right">วัน</TableHead>
              <TableHead className="whitespace-nowrap text-right">ค่าไฟ/หน่วย</TableHead>
              <TableHead className="whitespace-nowrap text-right">แผง</TableHead>
              <TableHead className="whitespace-nowrap text-right">หลังคา (ตร.ม.)</TableHead>
              <TableHead className="whitespace-nowrap text-right">ผลิต kWh/ด.*</TableHead>
              <TableHead className="whitespace-nowrap text-right">ประหยัด/ด.*</TableHead>
              <TableHead className="whitespace-nowrap">สถานะ</TableHead>
              <TableHead>
                <span className="sr-only">การทำงาน</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.kw}>
                <TableCell className="sticky left-0 bg-card font-medium whitespace-nowrap">
                  {th(row.kw)} kW
                </TableCell>
                <TableCell className="whitespace-nowrap">{[...row.phases].sort().join(", ")}</TableCell>
                <TableCell className="text-right tabular-nums whitespace-nowrap">
                  {th(row.billMin)}–{th(row.billMax)}
                </TableCell>
                <TableCell className="text-right tabular-nums">{row.sunHours}</TableCell>
                <TableCell className="text-right tabular-nums">{row.days}</TableCell>
                <TableCell className="text-right tabular-nums">{row.pricePerKwh.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{row.panels}</TableCell>
                <TableCell className="text-right tabular-nums">{row.roofM2.toFixed(1)}</TableCell>
                <TableCell className="bg-muted/40 text-right tabular-nums text-muted-foreground">
                  {th(Math.round(sizeRowKwhPerMonth(row)))}
                </TableCell>
                <TableCell className="bg-muted/40 text-right tabular-nums text-muted-foreground">
                  ฿{th(Math.round(sizeRowMonthlySavingThb(row)))}
                </TableCell>
                <TableCell />
                <TableCell>
                  <Button
                    type="button"
                    id={`calc-edit-on-grid-${kwId(row.kw)}`}
                    variant="ghost"
                    size="sm"
                    disabled
                    aria-label={`แก้ไขขนาด ${th(row.kw)} kW`}
                  >
                    แก้ไข
                  </Button>
                </TableCell>
              </TableRow>
            ))}
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
