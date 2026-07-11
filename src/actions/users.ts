"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const userSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(2).max(120),
  role: z.enum(["ADMIN", "EDITOR"]),
  password: z.string().min(8).max(200).optional().or(z.literal("")),
});

// Password hash must never appear in audit snapshots.
function auditView(user: {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = userSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { email, name, role, password } = parsed.data;
  if (!password) {
    return { ok: false, error: "กรุณาระบุรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" };
  }

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "อีเมลนี้มีผู้ใช้แล้ว" };

  const passwordHash = await bcrypt.hash(password, 12);
  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "AdminUser",
    run: async () =>
      auditView(
        await prisma.adminUser.create({ data: { email, name, role, passwordHash } })
      ),
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.adminUser.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบผู้ใช้" };

  const parsed = userSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { email, name, role, password } = parsed.data;

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "AdminUser",
    before: auditView(before),
    run: async () =>
      auditView(
        await prisma.adminUser.update({
          where: { id },
          data: {
            email,
            name,
            role,
            ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
          },
        })
      ),
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActive(id: string): Promise<ActionResult> {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    return { ok: false, error: "ไม่สามารถปิดการใช้งานบัญชีตัวเองได้" };
  }

  const before = await prisma.adminUser.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบผู้ใช้" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "AdminUser",
    before: auditView(before),
    run: async () =>
      auditView(
        await prisma.adminUser.update({
          where: { id },
          data: { isActive: !before.isActive },
        })
      ),
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
