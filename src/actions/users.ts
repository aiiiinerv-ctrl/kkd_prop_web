"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { ROLES, zodEnum } from "@/lib/enums";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const userSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  name: z.string().trim().min(2).max(120),
  role: zodEnum(ROLES),
  password: z.string().min(8).max(200).optional().or(z.literal("")),
  linkedChannelExecutiveId: z.string().trim().optional().or(z.literal("")),
});

const users = auditedEntity({
  entityType: "AdminUser",
  model: (client) => client.adminUser,
  // Projection, not "full": passwordHash must never reach an audit snapshot.
  snapshot: (user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    linkedChannelExecutiveId: user.linkedChannelExecutiveId ?? null,
  }),
  revalidate: () => ["/admin/users"],
});

/**
 * A CHANNEL_EXECUTIVE-role account must be linked to a real ChannelExecutive
 * row (that's what scopes its lead visibility) — any other role must not
 * carry a stale link. Returns an error string, or null if valid.
 */
async function resolveChannelExecutiveLink(
  role: string,
  linkedChannelExecutiveId: string | undefined
): Promise<{ error: string } | { value: string | null }> {
  if (role !== "CHANNEL_EXECUTIVE") {
    return { value: null };
  }
  if (!linkedChannelExecutiveId) {
    return { error: "กรุณาเลือกผู้ดำเนินการช่องทางที่ผูกกับผู้ใช้นี้" };
  }
  const exec = await prisma.channelExecutive.findUnique({
    where: { id: linkedChannelExecutiveId },
  });
  if (!exec) {
    return { error: "ไม่พบผู้ดำเนินการช่องทางที่เลือก" };
  }
  return { value: linkedChannelExecutiveId };
}

export async function createUser(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = userSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
    linkedChannelExecutiveId: formData.get("linkedChannelExecutiveId"),
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { email, name, role, password, linkedChannelExecutiveId } = parsed.data;
  if (!password) {
    return { ok: false, error: "กรุณาระบุรหัสผ่าน (อย่างน้อย 8 ตัวอักษร)" };
  }

  const link = await resolveChannelExecutiveLink(role, linkedChannelExecutiveId);
  if ("error" in link) return { ok: false, error: link.error };

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "อีเมลนี้มีผู้ใช้แล้ว" };

  const passwordHash = await bcrypt.hash(password, 12);
  await users.create({
    email,
    name,
    role,
    passwordHash,
    linkedChannelExecutiveId: link.value,
  });

  return { ok: true };
}

export async function updateUser(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = userSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    role: formData.get("role"),
    password: formData.get("password"),
    linkedChannelExecutiveId: formData.get("linkedChannelExecutiveId"),
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  const { email, name, role, password, linkedChannelExecutiveId } = parsed.data;

  const link = await resolveChannelExecutiveLink(role, linkedChannelExecutiveId);
  if ("error" in link) return { ok: false, error: link.error };

  const updated = await users.update(id, {
    email,
    name,
    role,
    linkedChannelExecutiveId: link.value,
    ...(password ? { passwordHash: await bcrypt.hash(password, 12) } : {}),
  });
  if (!updated) return { ok: false, error: "ไม่พบผู้ใช้" };

  return { ok: true };
}

export async function toggleUserActive(id: string): Promise<ActionResult> {
  const session = await requireRole("ADMIN");
  if (id === session.user.id) {
    return { ok: false, error: "ไม่สามารถปิดการใช้งานบัญชีตัวเองได้" };
  }

  const toggled = await users.update(id, (before) => ({
    isActive: !before.isActive,
  }));
  if (!toggled) return { ok: false, error: "ไม่พบผู้ใช้" };

  return { ok: true };
}
