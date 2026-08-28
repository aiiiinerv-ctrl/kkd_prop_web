"use client";

import {
  createTestimonial,
  deleteTestimonial,
  updateTestimonial,
} from "@/actions/testimonials";
import { BilingualTabs, CrudPage } from "@/components/admin/crud-page";
import { PageBannerPanel, type PageBannerAdminData } from "@/components/admin/page-banner-panel";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableHead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type TestimonialRow = {
  id: string;
  customerName: string;
  quoteTh: string;
  quoteEn: string;
  role: string | null;
  province: string | null;
  photoKey: string | null;
  projectId: string | null;
  projectTitleTh: string | null;
  sortOrder: number;
  isPublished: boolean;
};

type ProjectOption = { id: string; titleTh: string };

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export function TestimonialsClient({
  testimonials,
  projects,
  canPublish,
  canDelete,
  bannerData,
}: {
  testimonials: TestimonialRow[];
  projects: ProjectOption[];
  canPublish: boolean;
  canDelete: boolean;
  bannerData: PageBannerAdminData;
}) {
  return (
    <div className="max-w-3xl space-y-6">
      <PageBannerPanel key={`testimonials-${bannerData.version}`} pageSlug="testimonials" data={bannerData} />
      <CrudPage
      title="รีวิวลูกค้า"
      addLabel="เพิ่มรีวิว"
      dialogTitle={(editing) => (editing ? "แก้ไขรีวิว" : "เพิ่มรีวิวใหม่")}
      rows={testimonials}
      onCreate={createTestimonial}
      onUpdate={updateTestimonial}
      onDelete={deleteTestimonial}
      canDelete={canDelete}
      deleteTitle={(t) => `ลบรีวิวของ "${t.customerName}"?`}
      deleteDescription="รูปภาพที่แนบจะถูกลบด้วย และการลบจะถูกบันทึกในประวัติการแก้ไข"
      headers={
        <>
          <TableHead>รูป</TableHead>
          <TableHead>ชื่อลูกค้า</TableHead>
          <TableHead>จังหวัด</TableHead>
          <TableHead>ผลงานที่เชื่อมโยง</TableHead>
          <TableHead>ลำดับ</TableHead>
          <TableHead>สถานะ</TableHead>
        </>
      }
      columns={(t) => (
        <>
          <TableCell>
            {t.photoKey && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/files/${t.photoKey}`}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            )}
          </TableCell>
          <TableCell className="font-medium">{t.customerName}</TableCell>
          <TableCell>{t.province}</TableCell>
          <TableCell>{t.projectTitleTh || "-"}</TableCell>
          <TableCell>{t.sortOrder}</TableCell>
          <TableCell>
            <Badge variant={t.isPublished ? "secondary" : "destructive"}>
              {t.isPublished ? "เผยแพร่" : "ซ่อน"}
            </Badge>
          </TableCell>
        </>
      )}
      form={(editing) => (
        <>
          <div className="space-y-1.5">
            <Label>ชื่อลูกค้า</Label>
            <Input name="customerName" required defaultValue={editing?.customerName} />
          </div>

          <BilingualTabs
            th={
              <div className="space-y-1.5">
                <Label>คำรีวิว (TH)</Label>
                <Textarea name="quoteTh" rows={3} required defaultValue={editing?.quoteTh} />
              </div>
            }
            en={
              <div className="space-y-1.5">
                <Label>Quote (EN)</Label>
                <Textarea name="quoteEn" rows={3} required defaultValue={editing?.quoteEn} />
              </div>
            }
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>ตำแหน่ง/อาชีพ (ถ้ามี)</Label>
              <Input name="role" defaultValue={editing?.role ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>จังหวัด (ถ้ามี)</Label>
              <Input name="province" defaultValue={editing?.province ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>ผลงานที่เชื่อมโยง (ถ้ามี)</Label>
              <select
                name="projectId"
                defaultValue={editing?.projectId ?? ""}
                className={inputCls}
              >
                <option value="">— ไม่เชื่อมโยง —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titleTh}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>ลำดับการแสดง</Label>
              <Input name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>รูปลูกค้า{editing ? " (เว้นว่างถ้าไม่เปลี่ยน)" : ""}</Label>
              <input
                name="photo"
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
                defaultChecked={editing?.isPublished ?? false}
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
    </div>
  );
}
