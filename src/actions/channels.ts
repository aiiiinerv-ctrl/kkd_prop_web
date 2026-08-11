"use server";

import { z } from "zod";
import { slugify } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { CHANNEL_TYPES, zodEnum } from "@/lib/enums";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./users";

const channelSchema = z.object({
  nameTh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  type: zodEnum(CHANNEL_TYPES),
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

function parseChannel(formData: FormData) {
  return channelSchema.safeParse({
    nameTh: formData.get("nameTh"),
    nameEn: formData.get("nameEn"),
    type: formData.get("type"),
    isActive: formData.get("isActive") === "on",
    sortOrder: formData.get("sortOrder") || 0,
  });
}

const channels = auditedEntity({
  entityType: "PromoChannel",
  model: (client) => client.promoChannel,
  snapshot: "full",
  revalidate: () => ["/admin/channels"],
});

const executives = auditedEntity({
  entityType: "ChannelExecutive",
  model: (client) => client.channelExecutive,
  snapshot: "full",
  revalidate: () => ["/admin/channels"],
});

async function nextChannelRefCode(): Promise<string> {
  const last = await prisma.promoChannel.findFirst({
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });
  const lastNum = last ? Number(last.refCode.replace("CH", "")) || 0 : 0;
  return `CH${String(lastNum + 1).padStart(3, "0")}`;
}

export async function createChannel(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const refCode = await nextChannelRefCode();
  await channels.create({
    ...parsed.data,
    slug: slugify(parsed.data.nameEn),
    refCode,
  });

  return { ok: true };
}

export async function updateChannel(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const updated = await channels.update(id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบช่องทาง" };

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
  await requireRole("ADMIN");

  const channel = await prisma.promoChannel.findUnique({
    where: { id: channelId },
  });
  if (!channel) return { ok: false, error: "ไม่พบช่องทาง" };

  const parsed = parseExecutive(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const refCode = await nextExecutiveRefCode(channelId, channel.refCode);
  await executives.create({ ...parsed.data, channelId, refCode });

  return { ok: true };
}

export async function updateChannelExecutive(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = parseExecutive(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const updated = await executives.update(id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };

  return { ok: true };
}

export async function deleteChannelExecutive(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");

  // Referential guard only — the module loads its own snapshot row, so the
  // `_count` include no longer has to be stripped back out before auditing.
  const guard = await prisma.channelExecutive.findUnique({
    where: { id },
    select: { _count: { select: { autoLeads: true } } },
  });
  if (!guard) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };
  if (guard._count.autoLeads > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ มี lead อ้างอิงผู้ดำเนินการนี้ ${guard._count.autoLeads} รายการ`,
    };
  }

  const before = await executives.remove(id);
  if (!before) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };

  return { ok: true };
}

export async function deleteChannel(id: string): Promise<ActionResult> {
  await requireRole("ADMIN");

  const guard = await prisma.promoChannel.findUnique({
    where: { id },
    select: { _count: { select: { leads: true } } },
  });
  if (!guard) return { ok: false, error: "ไม่พบช่องทาง" };
  if (guard._count.leads > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ มี lead อ้างอิงช่องทางนี้ ${guard._count.leads} รายการ — ปิดการใช้งานแทน`,
    };
  }

  const before = await channels.remove(id);
  if (!before) return { ok: false, error: "ไม่พบช่องทาง" };

  return { ok: true };
}
