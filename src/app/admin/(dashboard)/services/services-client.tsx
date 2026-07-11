"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createService, deleteService, updateService } from "@/actions/services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function ServicesClient({ services }: { services: ServiceRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateService(editing.id, formData)
        : await createService(formData);
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
      const result = await deleteService(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">บริการ</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> เพิ่มบริการ
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อบริการ (TH)</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>ลำดับ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.titleTh}</TableCell>
                <TableCell>
                  {s.kind === "SYSTEM" ? "ระบบติดตั้ง" : "บำรุงรักษา"}
                </TableCell>
                <TableCell>{s.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={s.isPublished ? "secondary" : "destructive"}>
                    {s.isPublished ? "เผยแพร่" : "ซ่อน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(s);
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
                        <AlertDialogTitle>ลบบริการ &quot;{s.titleTh}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          การลบจะถูกบันทึกในประวัติการแก้ไข และหน้าเว็บจะไม่แสดงบริการนี้อีก
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(s.id)}
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
            <DialogTitle>{editing ? "แก้ไขบริการ" : "เพิ่มบริการใหม่"}</DialogTitle>
          </DialogHeader>
          <form action={onSubmit} className="space-y-4" noValidate key={editing?.id ?? "new"}>
            <div className="space-y-1.5">
              <Label>ประเภทบริการ</Label>
              <select
                name="kind"
                defaultValue={editing?.kind ?? "SYSTEM"}
                className={inputCls}
              >
                <option value="SYSTEM">ระบบติดตั้ง (On-Grid/Hybrid/Off-Grid)</option>
                <option value="MAINTENANCE">บำรุงรักษา (ล้างแผง/ตรวจเช็ค)</option>
              </select>
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
              <TabsContent value="th" className="space-y-4 pt-3">
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
                <div className="space-y-1.5">
                  <Label>Features (EN) — one per line</Label>
                  <Textarea
                    name="featuresEn"
                    rows={4}
                    defaultValue={editing?.featuresEn.join("\n")}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>รูปภาพ (ไม่บังคับ)</Label>
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
