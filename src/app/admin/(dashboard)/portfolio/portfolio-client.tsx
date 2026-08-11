"use client";

import { createProject, deleteProject, updateProject } from "@/actions/portfolio";
import { BilingualTabs, CrudPage } from "@/components/admin/crud-page";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableHead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type ProjectRow = {
  id: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  // "OTHER" is part of the shared BuildingType enum (added in Sprint 6 for
  // Lead.buildingType) but is never selectable in this form's <select> below
  // — PortfolioProject.category has no "other" concept.
  category: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL" | "OTHER";
  province: string;
  systemSizeKw: number;
  imageKeys: string[];
  completedAt: string;
  sortOrder: number;
  isPublished: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  RESIDENTIAL: "บ้านพักอาศัย",
  COMMERCIAL: "เชิงพาณิชย์",
  INDUSTRIAL: "อุตสาหกรรม",
};

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export function PortfolioClient({ projects }: { projects: ProjectRow[] }) {
  return (
    <CrudPage
      title="ผลงานติดตั้ง"
      addLabel="เพิ่มผลงาน"
      dialogTitle={(editing) => (editing ? "แก้ไขผลงาน" : "เพิ่มผลงานใหม่")}
      rows={projects}
      onCreate={createProject}
      onUpdate={updateProject}
      onDelete={deleteProject}
      deleteTitle={(p) => `ลบผลงาน "${p.titleTh}"?`}
      deleteDescription="รูปภาพที่แนบจะถูกลบด้วย และการลบจะถูกบันทึกในประวัติการแก้ไข"
      headers={
        <>
          <TableHead>รูป</TableHead>
          <TableHead>ชื่อผลงาน (TH)</TableHead>
          <TableHead>หมวด</TableHead>
          <TableHead>จังหวัด</TableHead>
          <TableHead>ขนาด</TableHead>
          <TableHead>สถานะ</TableHead>
        </>
      }
      columns={(p) => (
        <>
          <TableCell>
            {p.imageKeys[0] && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/files/${p.imageKeys[0]}`}
                  alt=""
                  className="h-10 w-14 rounded object-cover"
                />
                {p.imageKeys.length > 1 && (
                  <span className="absolute -top-1.5 -right-1.5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                    +{p.imageKeys.length - 1}
                  </span>
                )}
              </div>
            )}
          </TableCell>
          <TableCell className="font-medium">{p.titleTh}</TableCell>
          <TableCell>{CATEGORY_LABELS[p.category]}</TableCell>
          <TableCell>{p.province}</TableCell>
          <TableCell>{p.systemSizeKw}KW</TableCell>
          <TableCell>
            <Badge variant={p.isPublished ? "secondary" : "destructive"}>
              {p.isPublished ? "เผยแพร่" : "ซ่อน"}
            </Badge>
          </TableCell>
        </>
      )}
      form={(editing) => (
        <>
          <BilingualTabs
            th={
              <>
                <div className="space-y-1.5">
                  <Label>ชื่อผลงาน (TH)</Label>
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
              </>
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>หมวดหมู่</Label>
              <select
                name="category"
                defaultValue={editing?.category ?? "RESIDENTIAL"}
                className={inputCls}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>จังหวัด</Label>
              <Input name="province" required defaultValue={editing?.province} />
            </div>
            <div className="space-y-1.5">
              <Label>ขนาดระบบ (KW)</Label>
              <Input
                name="systemSizeKw"
                type="number"
                step="0.1"
                min={0.1}
                required
                defaultValue={editing?.systemSizeKw}
              />
            </div>
            <div className="space-y-1.5">
              <Label>วันที่ติดตั้งเสร็จ</Label>
              <Input name="completedAt" type="date" defaultValue={editing?.completedAt} />
            </div>
            <div className="space-y-1.5">
              <Label>ลำดับการแสดง</Label>
              <Input name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} />
            </div>
            <div className="space-y-1.5">
              <Label>
                รูปผลงาน (เลือกได้หลายรูป)
                {editing ? " — เว้นว่างถ้าไม่เปลี่ยน, เลือกใหม่จะแทนที่ทั้งหมด" : ""}
              </Label>
              <input
                name="images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className={inputCls}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={editing?.isPublished ?? true}
            />
            เผยแพร่บนหน้าเว็บ
          </label>
        </>
      )}
    />
  );
}
