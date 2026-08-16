"use client";

import { createPackage, deletePackage, updatePackage } from "@/actions/packages";
import { BilingualTabs, CrudPage } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableHead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type PackageRow = {
  id: string;
  nameTh: string;
  nameEn: string;
  sizeKw: number;
  priceThb: number;
  isPopular: boolean;
  suitableTh: string;
  suitableEn: string;
  featuresTh: string[];
  featuresEn: string[];
  sortOrder: number;
  isPublished: boolean;
};

export function PackagesClient({
  packages,
  canPublish,
  canDelete,
}: {
  packages: PackageRow[];
  canPublish: boolean;
  canDelete: boolean;
}) {
  return (
    <CrudPage
      title="แพ็กเกจ"
      addLabel="เพิ่มแพ็กเกจ"
      dialogTitle={(editing) => (editing ? "แก้ไขแพ็กเกจ" : "เพิ่มแพ็กเกจใหม่")}
      rows={packages}
      onCreate={createPackage}
      onUpdate={updatePackage}
      onDelete={deletePackage}
      canDelete={canDelete}
      deleteTitle={(p) => `ลบแพ็กเกจ "${p.nameTh}"?`}
      deleteDescription="การลบจะถูกบันทึกในประวัติการแก้ไข"
      headers={
        <>
          <TableHead>ชื่อ (TH)</TableHead>
          <TableHead>ขนาด</TableHead>
          <TableHead>ราคา</TableHead>
          <TableHead>ยอดนิยม</TableHead>
          <TableHead>สถานะ</TableHead>
        </>
      }
      columns={(p) => (
        <>
          <TableCell className="font-medium">{p.nameTh}</TableCell>
          <TableCell>{p.sizeKw}KW</TableCell>
          <TableCell>฿{p.priceThb.toLocaleString()}</TableCell>
          <TableCell>{p.isPopular ? "⭐" : "-"}</TableCell>
          <TableCell>
            <Badge variant={p.isPublished ? "secondary" : "destructive"}>
              {p.isPublished ? "เผยแพร่" : "ซ่อน"}
            </Badge>
          </TableCell>
        </>
      )}
      form={(editing) => (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ขนาดระบบ (KW)</Label>
              <Input
                name="sizeKw"
                type="number"
                step="0.1"
                min={0.1}
                required
                defaultValue={editing?.sizeKw}
              />
            </div>
            <div className="space-y-1.5">
              <Label>ราคา (บาท)</Label>
              <Input
                name="priceThb"
                type="number"
                min={0}
                required
                defaultValue={editing?.priceThb}
              />
            </div>
          </div>

          <BilingualTabs
            th={
              <>
                <div className="space-y-1.5">
                  <Label>ชื่อแพ็กเกจ (TH)</Label>
                  <Input name="nameTh" required defaultValue={editing?.nameTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>เหมาะกับใคร (TH)</Label>
                  <Input name="suitableTh" required defaultValue={editing?.suitableTh} />
                </div>
                <div className="space-y-1.5">
                  <Label>รายละเอียด (TH) — บรรทัดละ 1 ข้อ</Label>
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
                  <Label>Name (EN)</Label>
                  <Input name="nameEn" required defaultValue={editing?.nameEn} />
                </div>
                <div className="space-y-1.5">
                  <Label>Suitable for (EN)</Label>
                  <Input name="suitableEn" required defaultValue={editing?.suitableEn} />
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPopular"
                defaultChecked={editing?.isPopular ?? false}
              />
              แพ็กเกจยอดนิยม
            </label>
            {canPublish && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked={editing?.isPublished ?? true}
                />
                เผยแพร่บนหน้าเว็บ
              </label>
            )}
          </div>

          {!canPublish && (
            <p className="text-xs text-muted-foreground">
              ต้องให้ ADMIN/การตลาด เผยแพร่ให้
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            ตารางผลิตไฟตามฤดูจะคำนวณอัตโนมัติจากขนาดระบบ (KW)
          </p>
        </>
      )}
    />
  );
}
