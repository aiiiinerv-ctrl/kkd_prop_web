"use client";

import { Pencil, Plus, UserX, UserCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createUser, toggleUserActive, updateUser } from "@/actions/users";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: "ADMIN" | "SALES" | "FINANCE" | "CHANNEL_EXECUTIVE";
  isActive: boolean;
  createdAt: string;
  linkedChannelExecutiveId: string | null;
};

type ChannelExecutiveOption = { id: string; label: string };

export function UsersClient({
  users,
  currentUserId,
  channelExecutives,
}: {
  users: UserRow[];
  currentUserId: string;
  channelExecutives: ChannelExecutiveOption[];
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [selectedRole, setSelectedRole] = useState(editing?.role ?? "SALES");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      const result = editing
        ? await updateUser(editing.id, formData)
        : await createUser(formData);
      if (result.ok) {
        toast.success(editing ? "แก้ไขผู้ใช้เรียบร้อย" : "เพิ่มผู้ใช้เรียบร้อย");
        setDialogOpen(false);
        setEditing(null);
      } else {
        toast.error(result.error);
      }
    });
  };

  const onToggle = (user: UserRow) => {
    startTransition(async () => {
      const result = await toggleUserActive(user.id);
      if (result.ok) {
        toast.success(user.isActive ? "ปิดการใช้งานแล้ว" : "เปิดการใช้งานแล้ว");
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ผู้ใช้ระบบ</h1>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) setEditing(null);
          }}
        >
          <DialogTrigger
            render={
              <Button
                onClick={() => {
                  setEditing(null);
                  setSelectedRole("SALES");
                }}
              >
                <Plus className="size-4" /> เพิ่มผู้ใช้
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "แก้ไขผู้ใช้" : "เพิ่มผู้ใช้ใหม่"}</DialogTitle>
            </DialogHeader>
            <form action={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="u-name">ชื่อ</Label>
                <Input
                  id="u-name"
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-email">อีเมล</Label>
                <Input
                  id="u-email"
                  name="email"
                  type="email"
                  required
                  defaultValue={editing?.email ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-phone">เบอร์โทร</Label>
                <Input
                  id="u-phone"
                  name="phone"
                  defaultValue={editing?.phone ?? ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="u-role">บทบาท</Label>
                <select
                  id="u-role"
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRow["role"])}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="SALES">SALES — จัดการ lead และนัดสำรวจที่รับผิดชอบ</option>
                  <option value="FINANCE">FINANCE — ตรวจสอบการเงินและออกรายงาน</option>
                  <option value="CHANNEL_EXECUTIVE">CHANNEL_EXECUTIVE — ดูข้อมูลช่องทางของตนเอง</option>
                  <option value="ADMIN">ADMIN — ทุกสิทธิ์รวมถึงจัดการผู้ใช้</option>
                </select>
              </div>
              {selectedRole === "CHANNEL_EXECUTIVE" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="u-linked-exec">ผู้ดำเนินการช่องทางที่ผูก</Label>
                  <select
                    id="u-linked-exec"
                    name="linkedChannelExecutiveId"
                    required
                    defaultValue={editing?.linkedChannelExecutiveId ?? ""}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">เลือกผู้ดำเนินการ...</option>
                    {channelExecutives.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.label}
                      </option>
                    ))}
                  </select>
                  {channelExecutives.length === 0 && (
                    <p className="text-xs text-destructive">
                      ยังไม่มีผู้ดำเนินการช่องทางในระบบ — เพิ่มที่หน้า &quot;ช่องทางโปรโมท&quot; ก่อน
                    </p>
                  )}
                </div>
              ) : (
                /* formData.get() returns null (not undefined) when a field is
                   absent entirely, which fails the optional-string zod schema —
                   so this stays present, just empty, for non-executive roles. */
                <input type="hidden" name="linkedChannelExecutiveId" value="" />
              )}
              <div className="space-y-1.5">
                <Label htmlFor="u-password">
                  รหัสผ่าน{editing ? " (เว้นว่างถ้าไม่เปลี่ยน)" : ""}
                </Label>
                <Input
                  id="u-password"
                  name="password"
                  type="password"
                  minLength={8}
                  required={!editing}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "กำลังบันทึก..." : "บันทึก"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ชื่อ</TableHead>
              <TableHead>อีเมล</TableHead>
              <TableHead>เบอร์โทร</TableHead>
              <TableHead>บทบาท</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">จัดการ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">
                  {user.name}
                  {user.id === currentUserId && (
                    <span className="ml-1.5 text-xs text-muted-foreground">(คุณ)</span>
                  )}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phone || "-"}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "secondary" : "destructive"}>
                    {user.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    className="p-2"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(user);
                      setSelectedRole(user.role);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {user.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      className="p-2"
                      aria-label={user.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                      disabled={isPending}
                      onClick={() => onToggle(user)}
                    >
                      {user.isActive ? (
                        <UserX className="size-4 text-destructive" />
                      ) : (
                        <UserCheck className="size-4 text-green-600" />
                      )}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
