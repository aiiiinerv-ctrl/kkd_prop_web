"use server";

import { z } from "zod";
import { slugify } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { CHANNEL_TYPES, zodEnum } from "@/lib/enums";
import {
  CHANNEL_LANDING_PATHS,
  CHANNEL_SUB_TYPE_CODES,
  CHANNEL_UTM_CAMPAIGNS,
} from "@/lib/channel-taxonomy";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./users";

// Empty-string form values collapse to null — a channel created before this
// column existed (or one an admin hasn't classified yet) has no subType/
// utmCampaign, and that must stay a valid, non-blocking state (default #10,
// sa-channel-taxonomy-utm-tasks.md — old refCodes are never auto-migrated).
const optionalCode = (allowed: readonly string[], message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().nullable()
  ).refine((v) => v === null || allowed.includes(v), { message });

const channelSchema = z.object({
  nameTh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  type: zodEnum(CHANNEL_TYPES),
  subType: optionalCode(CHANNEL_SUB_TYPE_CODES, "รหัสประเภทช่องทางย่อยไม่ถูกต้อง"),
  landingPath: zodEnum(CHANNEL_LANDING_PATHS),
  utmCampaign: optionalCode(CHANNEL_UTM_CAMPAIGNS, "utm_campaign ไม่ถูกต้อง"),
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

function parseChannel(formData: FormData) {
  return channelSchema.safeParse({
    nameTh: formData.get("nameTh"),
    nameEn: formData.get("nameEn"),
    type: formData.get("type"),
    subType: formData.get("subType"),
    landingPath: formData.get("landingPath") || "/th/packages",
    utmCampaign: formData.get("utmCampaign"),
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

// One running-3-digit counter per subType prefix (TE001, TE002, FB001, …) —
// never a table-wide counter, or a new prefix would collide with whatever
// number the *last-inserted* channel happened to have (see the old bug this
// replaced: `Number("FB001".replace("CH", ""))` is NaN -> 0 -> "CH001").
async function nextChannelRefCode(subTypePrefix: string): Promise<string> {
  const last = await prisma.promoChannel.findFirst({
    where: { refCode: { startsWith: subTypePrefix } },
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });
  const lastNum = last ? Number(last.refCode.slice(subTypePrefix.length)) || 0 : 0;
  return `${subTypePrefix}${String(lastNum + 1).padStart(3, "0")}`;
}

export async function createChannel(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  // No subType picked -> continues the pre-taxonomy "CH0xx" scheme, matching
  // the "- ไม่ระบุ (คงรหัสเดิม) -" option in the admin dropdown.
  const refCode = await nextChannelRefCode(parsed.data.subType ?? "CH");
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

// Sequential per-channel, running 2 digits appended directly to the channel's
// refCode — e.g. first exec under TE001 -> TE00101 (no "-EX" separator; the
// SA sheet's format). A channel still on the pre-taxonomy CH0xx scheme (see
// default #10 — old refCodes are never auto-migrated) gets the same
// direct-append treatment for any *new* executive created after this shipped;
// its existing "-EX01"-style rows are left untouched.
async function nextExecutiveRefCode(
  channelId: string,
  channelRefCode: string
): Promise<string> {
  const last = await prisma.channelExecutive.findFirst({
    where: { channelId },
    orderBy: { refCode: "desc" },
    select: { refCode: true },
  });
  const lastNum = last
    ? Number(last.refCode.slice(channelRefCode.length)) || 0
    : 0;
  return `${channelRefCode}${String(lastNum + 1).padStart(2, "0")}`;
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
