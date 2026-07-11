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
  role: "ADMIN" | "EDITOR";
  isActive: boolean;
  createdAt: string;
};

export function UsersClient({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
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
              <Button>
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
                <Label htmlFor="u-role">บทบาท</Label>
                <select
                  id="u-role"
                  name="role"
                  defaultValue={editing?.role ?? "EDITOR"}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="EDITOR">EDITOR — จัดการเนื้อหาและ lead</option>
                  <option value="ADMIN">ADMIN — ทุกสิทธิ์รวมถึงจัดการผู้ใช้</option>
                </select>
              </div>
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
                    size="icon-sm"
                    aria-label="แก้ไข"
                    onClick={() => {
                      setEditing(user);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  {user.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
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
