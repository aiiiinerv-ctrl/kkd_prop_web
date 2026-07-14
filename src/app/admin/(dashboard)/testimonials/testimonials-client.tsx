"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createTestimonial,
  deleteTestimonial,
  updateTestimonial,
} from "@/actions/testimonials";
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

type TestimonialRow = {
  id: string;
  customerName: string;
  quoteTh: string;
  quoteEn: string;
  role: string;
  province: string;
  photoKey: string | null;
  projectId: string;
  projectTitleTh: string;
  sortOrder: number;
  isPublished: boolean;
};

type ProjectOption = {
  id: string;
  titleTh: string;
};

const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";

export function TestimonialsClient({
  testimonials,
  projects,
}: {
  testimonials: TestimonialRow[];
  projects: ProjectOption[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TestimonialRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateTestimonial(editing.id, formData)
        : await createTestimonial(formData);
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
      const result = await deleteTestimonial(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">รีวิวลูกค้า</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> เพิ่มรีวิว
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รูป</TableHead>
              <TableHead>ชื่อลูกค้า</TableHead>
              <TableHead>จังหวัด</TableHead>
              <TableHead>ผลงานที่เชื่อมโยง</TableHead>
              <TableHead>ลำดับ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {testimonials.map((t) => (
              <TableRow key={t.id}>
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
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="p-2"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(t);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger
                      render={
                        <Button variant="ghost" className="p-2" aria-label="ลบ">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      }
                    />
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          ลบรีวิวของ &quot;{t.customerName}&quot;?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          รูปภาพที่แนบจะถูกลบด้วย และการลบจะถูกบันทึกในประวัติการแก้ไข
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(t.id)}
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
            <DialogTitle>{editing ? "แก้ไขรีวิว" : "เพิ่มรีวิวใหม่"}</DialogTitle>
          </DialogHeader>
          <form action={onSubmit} className="space-y-4" noValidate key={editing?.id ?? "new"}>
            <div className="space-y-1.5">
              <Label>ชื่อลูกค้า</Label>
              <Input name="customerName" required defaultValue={editing?.customerName} />
            </div>

            <Tabs defaultValue="th">
              <TabsList className="w-full">
                <TabsTrigger value="th" className="flex-1">
                  ภาษาไทย
                </TabsTrigger>
                <TabsTrigger value="en" className="flex-1">
                  English
                </TabsTrigger>
              </TabsList>
              <TabsContent value="th" className="space-y-4 pt-3" keepMounted>
                <div className="space-y-1.5">
                  <Label>คำรีวิว (TH)</Label>
                  <Textarea
                    name="quoteTh"
                    rows={3}
                    required
                    defaultValue={editing?.quoteTh}
                  />
                </div>
              </TabsContent>
              <TabsContent value="en" className="space-y-4 pt-3" keepMounted>
                <div className="space-y-1.5">
                  <Label>Quote (EN)</Label>
                  <Textarea
                    name="quoteEn"
                    rows={3}
                    required
                    defaultValue={editing?.quoteEn}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ตำแหน่ง/อาชีพ (ถ้ามี)</Label>
                <Input name="role" defaultValue={editing?.role} />
              </div>
              <div className="space-y-1.5">
                <Label>จังหวัด (ถ้ามี)</Label>
                <Input name="province" defaultValue={editing?.province} />
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
                <Input
                  name="sortOrder"
                  type="number"
                  min={0}
                  defaultValue={editing?.sortOrder ?? 0}
                />
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

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isPublished"
                defaultChecked={editing?.isPublished ?? false}
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
