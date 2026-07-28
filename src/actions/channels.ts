"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { slugify } from "@/lib/admin-content";
import { withAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./users";

const channelSchema = z.object({
  nameTh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

function parseChannel(formData: FormData) {
  return channelSchema.safeParse({
    nameTh: formData.get("nameTh"),
    nameEn: formData.get("nameEn"),
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
}

// TODO(sprint 1): move to a dedicated refCode generator once channel type +
// executive CRUD UI lands; for now this just keeps `refCode` populated so the
// schema's required/unique constraint is satisfied.
async function nextChannelRefCode(): Promise<string> {
  const last = await prisma.promoChannel.findFirst({
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });
  const lastNum = last ? Number(last.refCode.replace("CH", "")) || 0 : 0;
  return `CH${String(lastNum + 1).padStart(3, "0")}`;
}

export async function createChannel(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const refCode = await nextChannelRefCode();
  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "PromoChannel",
    run: () =>
      prisma.promoChannel.create({
        data: { ...parsed.data, slug: slugify(parsed.data.nameEn), refCode },
      }),
  });

  revalidatePath("/admin/channels");
  return { ok: true };
}

export async function updateChannel(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.promoChannel.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบช่องทาง" };

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "PromoChannel",
    before,
    run: () => prisma.promoChannel.update({ where: { id }, data: parsed.data }),
  });

  revalidatePath("/admin/channels");
  return { ok: true };
}

const executiveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(30),
});

function parseExecutive(formData: FormData) {
  return executiveSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
}

// Sequential per-channel, e.g. first exec under CH001 -> CH001-EX01.
async function nextExecutiveRefCode(
  channelId: string,
  channelRefCode: string
): Promise<string> {
  const last = await prisma.channelExecutive.findFirst({
    where: { channelId },
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });
  const lastNum = last ? Number(last.refCode.split("-EX")[1]) || 0 : 0;
  return `${channelRefCode}-EX${String(lastNum + 1).padStart(2, "0")}`;
}

export async function createChannelExecutive(
  channelId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const channel = await prisma.promoChannel.findUnique({
    where: { id: channelId },
  });
  if (!channel) return { ok: false, error: "ไม่พบช่องทาง" };

  const parsed = parseExecutive(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const refCode = await nextExecutiveRefCode(channelId, channel.refCode);
  await withAudit({
    actorId: session.user.id,
    action: "CREATE",
    entityType: "ChannelExecutive",
    run: () =>
      prisma.channelExecutive.create({
        data: { ...parsed.data, channelId, refCode },
      }),
  });

  revalidatePath("/admin/channels");
  return { ok: true };
}

export async function updateChannelExecutive(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.channelExecutive.findUnique({ where: { id } });
  if (!before) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };

  const parsed = parseExecutive(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "ChannelExecutive",
    before,
    run: () =>
      prisma.channelExecutive.update({ where: { id }, data: parsed.data }),
  });

  revalidatePath("/admin/channels");
  return { ok: true };
}

export async function deleteChannelExecutive(id: string): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.channelExecutive.findUnique({
    where: { id },
    include: { _count: { select: { autoLeads: true } } },
  });
  if (!before) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };
  if (before._count.autoLeads > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ มี lead อ้างอิงผู้ดำเนินการนี้ ${before._count.autoLeads} รายการ`,
    };
  }

  const { _count, ...beforeRow } = before;
  void _count;
  await withAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "ChannelExecutive",
    before: beforeRow,
    run: async () => {
      await prisma.channelExecutive.delete({ where: { id } });
      return null;
    },
  });

  revalidatePath("/admin/channels");
  return { ok: true };
}

export async function deleteChannel(id: string): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const before = await prisma.promoChannel.findUnique({
    where: { id },
    include: { _count: { select: { leads: true } } },
  });
  if (!before) return { ok: false, error: "ไม่พบช่องทาง" };
  if (before._count.leads > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ มี lead อ้างอิงช่องทางนี้ ${before._count.leads} รายการ — ปิดการใช้งานแทน`,
    };
  }

  const { _count, ...beforeRow } = before;
  void _count;
  await withAudit({
    actorId: session.user.id,
    action: "DELETE",
    entityType: "PromoChannel",
    before: beforeRow,
    run: async () => {
      await prisma.promoChannel.delete({ where: { id } });
      return null;
    },
  });

  revalidatePath("/admin/channels");
  return { ok: true };
}
