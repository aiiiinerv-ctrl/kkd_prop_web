"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPackage, deletePackage, updatePackage } from "@/actions/packages";
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

export function PackagesClient({ packages }: { packages: PackageRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updatePackage(editing.id, formData)
        : await createPackage(formData);
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
      const result = await deletePackage(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">แพ็กเกจ</h1>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> เพิ่มแพ็กเกจ
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ (TH)</TableHead>
              <TableHead>ขนาด</TableHead>
              <TableHead>ราคา</TableHead>
              <TableHead>ยอดนิยม</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {packages.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.nameTh}</TableCell>
                <TableCell>{p.sizeKw}KW</TableCell>
                <TableCell>฿{p.priceThb.toLocaleString()}</TableCell>
                <TableCell>{p.isPopular ? "⭐" : "-"}</TableCell>
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
                        <AlertDialogTitle>ลบแพ็กเกจ &quot;{p.nameTh}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          การลบจะถูกบันทึกในประวัติการแก้ไข
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
            <DialogTitle>{editing ? "แก้ไขแพ็กเกจ" : "เพิ่มแพ็กเกจใหม่"}</DialogTitle>
          </DialogHeader>
          <form action={onSubmit} className="space-y-4" noValidate key={editing?.id ?? "new"}>
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
              </TabsContent>
              <TabsContent value="en" className="space-y-4 pt-3">
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isPublished"
                  defaultChecked={editing?.isPublished ?? true}
                />
                เผยแพร่บนหน้าเว็บ
              </label>
            </div>

            <p className="text-xs text-muted-foreground">
              ตารางผลิตไฟตามฤดูจะคำนวณอัตโนมัติจากขนาดระบบ (KW)
            </p>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
