"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createProject, deleteProject, updateProject } from "@/actions/portfolio";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ProjectRow = {
  id: string;
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  category: "RESIDENTIAL" | "COMMERCIAL" | "INDUSTRIAL";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateProject(editing.id, formData)
        : await createProject(formData);
      if (result.ok) {
        toast.success("บันทึกเรียบร้อย");
        setDialogOpen(false);
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const onDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteProject(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ผลงานติดตั้ง</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> เพิ่มผลงาน
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รูป</TableHead>
              <TableHead>ชื่อผลงาน (TH)</TableHead>
              <TableHead>หมวด</TableHead>
              <TableHead>จังหวัด</TableHead>
              <TableHead>ขนาด</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  {p.imageKeys[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/files/${p.imageKeys[0]}`}
                      alt=""
                      className="h-10 w-14 rounded object-cover"
                    />
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(p);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" aria-label="ลบ">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>ลบผลงาน &quot;{p.titleTh}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          รูปภาพที่แนบจะถูกลบด้วย และการลบจะถูกบันทึกในประวัติการแก้ไข
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(p.id)}
                          disabled={isPending}
                        >
                          ลบ
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขผลงาน" : "เพิ่มผลงานใหม่"}</DialogTitle>
          </DialogHeader>
          <form action={onSubmit} className="space-y-4" noValidate key={editing?.id ?? "new"}>
            <Tabs defaultValue="th">
              <TabsList className="w-full">
                <TabsTrigger value="th" className="flex-1">
                  ภาษาไทย
                </TabsTrigger>
                <TabsTrigger value="en" className="flex-1">
                  English
                </TabsTrigger>
              </TabsList>
              <TabsContent value="th" className="space-y-4 pt-3">
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
              </TabsContent>
              <TabsContent value="en" className="space-y-4 pt-3">
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
              </TabsContent>
            </Tabs>

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
                <Input
                  name="completedAt"
                  type="date"
                  defaultValue={editing?.completedAt}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ลำดับการแสดง</Label>
                <Input
                  name="sortOrder"
                  type="number"
                  min={0}
                  defaultValue={editing?.sortOrder ?? 0}
                />
              </div>
              <div className="space-y-1.5">
                <Label>รูปผลงาน{editing ? " (เว้นว่างถ้าไม่เปลี่ยน)" : ""}</Label>
                <input
                  name="image"
                  type="file"
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

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
