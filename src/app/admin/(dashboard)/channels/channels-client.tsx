"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createChannel, deleteChannel, updateChannel } from "@/actions/channels";
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

type ChannelRow = {
  id: string;
  nameTh: string;
  nameEn: string;
  isActive: boolean;
  sortOrder: number;
  leadCount: number;
};

export function ChannelsClient({ channels }: { channels: ChannelRow[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateChannel(editing.id, formData)
        : await createChannel(formData);
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
      const result = await deleteChannel(id);
      if (result.ok) toast.success("ลบเรียบร้อย");
      else toast.error(result.error);
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">ช่องทางโปรโมท</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ช่องทางที่เปิดใช้งานจะแสดงในแบบฟอร์ม &quot;รู้จักเราจากช่องทางไหน&quot; บนหน้าเว็บ
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" /> เพิ่มช่องทาง
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ (TH)</TableHead>
              <TableHead>ชื่อ (EN)</TableHead>
              <TableHead>จำนวน Lead</TableHead>
              <TableHead>ลำดับ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nameTh}</TableCell>
                <TableCell>{c.nameEn}</TableCell>
                <TableCell>{c.leadCount}</TableCell>
                <TableCell>{c.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "secondary" : "destructive"}>
                    {c.isActive ? "เปิดใช้งาน" : "ปิด"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(c);
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
                        <AlertDialogTitle>ลบช่องทาง &quot;{c.nameTh}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {c.leadCount > 0
                            ? `มี lead อ้างอิงช่องทางนี้ ${c.leadCount} รายการ — ระบบจะไม่อนุญาตให้ลบ แนะนำให้ปิดการใช้งานแทน`
                            : "การลบจะถูกบันทึกในประวัติการแก้ไข"}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(c.id)}
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขช่องทาง" : "เพิ่มช่องทางใหม่"}</DialogTitle>
          </DialogHeader>
          <form action={onSubmit} className="space-y-4" key={editing?.id ?? "new"}>
            <div className="space-y-1.5">
              <Label>ชื่อช่องทาง (TH)</Label>
              <Input name="nameTh" required defaultValue={editing?.nameTh} />
            </div>
            <div className="space-y-1.5">
              <Label>Channel name (EN)</Label>
              <Input name="nameEn" required defaultValue={editing?.nameEn} />
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
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={editing?.isActive ?? true}
              />
              เปิดใช้งาน (แสดงในแบบฟอร์มหน้าเว็บ)
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
