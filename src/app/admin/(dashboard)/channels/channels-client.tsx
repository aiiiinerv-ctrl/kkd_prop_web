"use client";

import { Check, Copy, Pencil, Plus, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { CHANNEL_TYPE_LABELS } from "@/lib/enum-labels";
import { toast } from "sonner";
import {
  createChannel,
  createChannelExecutive,
  deleteChannel,
  deleteChannelExecutive,
  updateChannel,
  updateChannelExecutive,
} from "@/actions/channels";
import { DeleteConfirm } from "@/components/admin/crud-page";
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

type ChannelType = "INDIVIDUAL" | "COMPANY" | "PLATFORM";

type ExecutiveRow = {
  id: string;
  name: string;
  phone: string;
  refCode: string;
  createdAt: string;
};

type ChannelRow = {
  id: string;
  nameTh: string;
  nameEn: string;
  type: ChannelType;
  refCode: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  leadCount: number;
  executives: ExecutiveRow[];
};

function promoLink(siteUrl: string, refCode: string) {
  return `${siteUrl}/?ref=${refCode}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      className="p-2"
      aria-label="คัดลอกลิงก์โปรโมท"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success("คัดลอกลิงก์แล้ว");
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("คัดลอกไม่สำเร็จ");
        }
      }}
    >
      {copied ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <Copy className="size-4" />
      )}
    </Button>
  );
}

export function ChannelsClient({
  channels,
  siteUrl,
  readOnly = false,
}: {
  channels: ChannelRow[];
  siteUrl: string;
  /** CHANNEL_EXECUTIVE sessions get a read-only view of their own channel — no create/edit/delete. */
  readOnly?: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChannelRow | null>(null);
  const [execDialogChannel, setExecDialogChannel] = useState<ChannelRow | null>(
    null
  );
  const [editingExec, setEditingExec] = useState<ExecutiveRow | null>(null);
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

  const onExecSubmit = (channelId: string, formData: FormData) => {
    startTransition(async () => {
      const result = editingExec
        ? await updateChannelExecutive(editingExec.id, formData)
        : await createChannelExecutive(channelId, formData);
      if (result.ok) {
        toast.success("บันทึกเรียบร้อย");
        setEditingExec(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const onExecDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteChannelExecutive(id);
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
            และลิงก์โปรโมทด้านล่างจะบันทึกที่มาของลูกค้าอัตโนมัติเมื่อคลิกเข้ามา
          </p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> เพิ่มช่องทาง
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ (TH)</TableHead>
              <TableHead>ชื่อ (EN)</TableHead>
              <TableHead>ประเภท</TableHead>
              <TableHead>รหัส / ลิงก์โปรโมท</TableHead>
              <TableHead>จำนวน Lead</TableHead>
              <TableHead>ลำดับ</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>วันที่สร้าง</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nameTh}</TableCell>
                <TableCell>{c.nameEn}</TableCell>
                <TableCell>{CHANNEL_TYPE_LABELS[c.type]}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline">{c.refCode}</Badge>
                    <span className="max-w-40 truncate text-xs text-muted-foreground">
                      {promoLink(siteUrl, c.refCode)}
                    </span>
                    <CopyButton value={promoLink(siteUrl, c.refCode)} />
                  </div>
                </TableCell>
                <TableCell>{c.leadCount}</TableCell>
                <TableCell>{c.sortOrder}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "secondary" : "destructive"}>
                    {c.isActive ? "เปิดใช้งาน" : "ปิด"}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(c.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="p-2"
                    aria-label="ผู้ดำเนินการ"
                    onClick={() => {
                      setExecDialogChannel(c);
                      setEditingExec(null);
                    }}
                  >
                    <Users className="size-4" />
                  </Button>
                  {!readOnly && (
                    <>
                      <Button
                        variant="ghost"
                        className="p-2"
                        aria-label="แก้ไข"
                        onClick={() => {
                          setEditing(c);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <DeleteConfirm
                        title={`ลบช่องทาง "${c.nameTh}"?`}
                        description={
                          c.leadCount > 0
                            ? `มี lead อ้างอิงช่องทางนี้ ${c.leadCount} รายการ — ระบบจะไม่อนุญาตให้ลบ แนะนำให้ปิดการใช้งานแทน`
                            : "การลบจะถูกบันทึกในประวัติการแก้ไข"
                        }
                        disabled={isPending}
                        onConfirm={() => onDelete(c.id)}
                      />
                    </>
                  )}
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
              <Label>ประเภทช่องทาง</Label>
              <select
                name="type"
                required
                defaultValue={editing?.type ?? "INDIVIDUAL"}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
              >
                {(Object.keys(CHANNEL_TYPE_LABELS) as ChannelType[]).map((type) => (
                  <option key={type} value={type}>
                    {CHANNEL_TYPE_LABELS[type]}
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

      <Dialog
        open={!!execDialogChannel}
        onOpenChange={(open) => {
          if (!open) {
            setExecDialogChannel(null);
            setEditingExec(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              ผู้ดำเนินการช่องทาง &quot;{execDialogChannel?.nameTh}&quot;
            </DialogTitle>
          </DialogHeader>
          {execDialogChannel && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ชื่อ</TableHead>
                      <TableHead>เบอร์โทร</TableHead>
                      <TableHead>รหัส / ลิงก์โปรโมท</TableHead>
                      <TableHead>วันที่สร้าง</TableHead>
                      {!readOnly && <TableHead className="text-right">จัดการ</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {execDialogChannel.executives.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={readOnly ? 4 : 5}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          ยังไม่มีผู้ดำเนินการ
                        </TableCell>
                      </TableRow>
                    )}
                    {execDialogChannel.executives.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.name}</TableCell>
                        <TableCell>{e.phone}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline">{e.refCode}</Badge>
                            <CopyButton value={promoLink(siteUrl, e.refCode)} />
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(e.createdAt)}
                        </TableCell>
                        {!readOnly && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              className="p-2"
                              aria-label="แก้ไข"
                              onClick={() => setEditingExec(e)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <DeleteConfirm
                              title={`ลบผู้ดำเนินการ "${e.name}"?`}
                              description="ลิงก์แนะนำของผู้ดำเนินการรายนี้จะใช้ไม่ได้อีก และการลบจะถูกบันทึกในประวัติการแก้ไข"
                              disabled={isPending}
                              onConfirm={() => onExecDelete(e.id)}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {!readOnly && (
                <form
                  action={(fd) => onExecSubmit(execDialogChannel.id, fd)}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-dashed border-border p-4 sm:grid-cols-3"
                  key={editingExec?.id ?? "new-exec"}
                >
                  <div className="space-y-1.5">
                    <Label>ชื่อผู้ดำเนินการ</Label>
                    <Input name="name" required defaultValue={editingExec?.name} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>เบอร์โทร</Label>
                    <Input name="phone" required defaultValue={editingExec?.phone} />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={isPending} className="flex-1">
                      {editingExec ? "บันทึก" : "เพิ่ม"}
                    </Button>
                    {editingExec && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setEditingExec(null)}
                      >
                        ยกเลิก
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
