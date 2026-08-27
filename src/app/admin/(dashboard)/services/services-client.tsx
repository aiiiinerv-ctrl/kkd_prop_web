"use client";

import { createService, deleteService, updateService } from "@/actions/services";
import { BilingualTabs, CrudPage } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableHead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ServiceRow = {
  id: string;
  kind: "SYSTEM" | "MAINTENANCE";
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  featuresTh: string[];
  featuresEn: string[];
  imageKey: string | null;
  sortOrder: number;
  isPublished: boolean;
};

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export function ServicesClient({
  services,
  canPublish,
  canDelete,
  embedded = false,
}: {
  services: ServiceRow[];
  canPublish: boolean;
  canDelete: boolean;
  /** When true, nest under Pages Content tab (no duplicate page chrome title). */
  embedded?: boolean;
}) {
  return (
    <CrudPage
      title={embedded ? "รายการบริการ (Content Items)" : "บริการ"}
      addLabel="เพิ่มบริการ"
      dialogTitle={(editing) => (editing ? "แก้ไขบริการ" : "เพิ่มบริการใหม่")}
      rows={services}
      onCreate={createService}
      onUpdate={updateService}
      onDelete={deleteService}
      canDelete={canDelete}
      deleteTitle={(s) => `ลบบริการ "${s.titleTh}"?`}
      deleteDescription="การลบจะถูกบันทึกในประวัติการแก้ไข และหน้าเว็บจะไม่แสดงบริการนี้อีก"
      headers={
        <>
          <TableHead>ชื่อบริการ (TH)</TableHead>
          <TableHead>ประเภท</TableHead>
          <TableHead>ลำดับ</TableHead>
          <TableHead>สถานะ</TableHead>
        </>
      }
      columns={(s) => (
        <>
          <TableCell className="font-medium">{s.titleTh}</TableCell>
          <TableCell>{s.kind === "SYSTEM" ? "ระบบติดตั้ง" : "บำรุงรักษา"}</TableCell>
          <TableCell>{s.sortOrder}</TableCell>
          <TableCell>
            <Badge variant={s.isPublished ? "secondary" : "destructive"}>
              {s.isPublished ? "เผยแพร่" : "ซ่อน"}
            </Badge>
          </TableCell>
        </>
      )}
      form={(editing) => (
        <>
          <div className="space-y-1.5">
            <Label>ประเภทบริการ</Label>
            <select name="kind" defaultValue={editing?.kind ?? "SYSTEM"} className={inputCls}>
              <option value="SYSTEM">ระบบติดตั้ง (On-Grid/Hybrid/Off-Grid)</option>
              <option value="MAINTENANCE">บำรุงรักษา (ล้างแผง/ตรวจเช็ค)</option>
            </select>
          </div>

          <BilingualTabs
            th={
              <>
                <div className="space-y-1.5">
                  <Label>ชื่อบริการ (TH)</Label>
                  <Input name="titleTh" required defaultValue={editing?.titleTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>รายละเอียด (TH)</Label>
                  <Textarea
                    name="descriptionTh"
                    rows={3}
                    required
                    defaultValue={editing?.descriptionTh}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>จุดเด่น (TH) — บรรทัดละ 1 ข้อ</Label>
                  <Textarea
                    name="featuresTh"
                    rows={4}
                    defaultValue={editing?.featuresTh.join("\n")}
                  />
                </div>
              </>
            }
            en={
              <>
                <div className="space-y-1.5">
                  <Label>Title (EN)</Label>
                  <Input name="titleEn" required defaultValue={editing?.titleEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description (EN)</Label>
                  <Textarea
                    name="descriptionEn"
                    rows={3}
                    required
                    defaultValue={editing?.descriptionEn}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Features (EN) — one per line</Label>
                  <Textarea
                    name="featuresEn"
                    rows={4}
                    defaultValue={editing?.featuresEn.join("\n")}
                  />
                </div>
              </>
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ลำดับการแสดง</Label>
              <Input name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} />
            </div>
            <div className="space-y-1.5">
              <Label>รูปภาพ (ไม่บังคับ)</Label>
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className={inputCls}
              />
            </div>
          </div>

          {canPublish ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={editing?.isPublished ?? true}
              />
              เผยแพร่บนหน้าเว็บ
            </label>
          ) : (
            <p className="text-xs text-muted-foreground">
              ต้องให้ ADMIN/การตลาด เผยแพร่ให้
            </p>
          )}
        </>
      )}
    />
  );
}
