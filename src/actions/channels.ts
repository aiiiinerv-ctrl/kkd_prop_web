"use server";

import { z } from "zod";
import { slugify } from "@/lib/admin-content";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { CHANNEL_TYPES, zodEnum } from "@/lib/enums";
import {
  CHANNEL_DEFAULT_LANDING_PATH,
  CHANNEL_SUB_TYPE_CODES,
  isPromoLandingPath,
} from "@/lib/channel-taxonomy";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./users";

// Empty-string form values collapse to null — a channel created before this
// column existed (or one an admin hasn't classified yet) has no subType, and
// that must stay a valid, non-blocking state (default #10,
// sa-channel-taxonomy-utm-tasks.md — old refCodes are never auto-migrated).
const optionalCode = (allowed: readonly string[], message: string) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().nullable()
  ).refine((v) => v === null || allowed.includes(v), { message });

const landingPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(180)
  .refine((value) => /^\/(?:th|en)(?:\/|$)/.test(value), {
    message: "path ต้องขึ้นต้นด้วย /th หรือ /en",
  })
  .refine(
    (value) =>
      !value.startsWith("//") &&
      !value.includes("?") &&
      !value.includes("#") &&
      !value.includes("\\") &&
      !value.split("/").some((segment) => segment === "." || segment === ".."),
    { message: "path ต้องเป็นหน้าเว็บภายในและไม่มี query หรือ hash" }
  )
  .transform((value) => {
    const normalized = new URL(value, "https://landing-path.invalid").pathname;
    return normalized.length > 3 && normalized.endsWith("/")
      ? normalized.slice(0, -1)
      : normalized;
  })
  .refine((value) => /^\/(?:th|en)(?:\/|$)/.test(value), {
    message: "path ต้องอยู่ใต้ /th หรือ /en หลัง normalize",
  });

const channelSchema = z.object({
  nameTh: z.string().trim().min(1).max(120),
  nameEn: z.string().trim().min(1).max(120),
  type: zodEnum(CHANNEL_TYPES),
  subType: optionalCode(CHANNEL_SUB_TYPE_CODES, "รหัสประเภทช่องทางย่อยไม่ถูกต้อง"),
  landingPath: landingPathSchema,
  isActive: z.coerce.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

/**
 * Turns a unique-constraint violation into the `{ok:false}` union the rest of
 * these actions return, instead of letting it escape as an unhandled server
 * error that leaves the dialog stuck on "กำลังบันทึก..." with no toast.
 *
 * refCode is the only unique column left in play here: it's chosen by
 * reading the current maximum and adding one, which is a separate round-trip
 * from the insert, so two admins submitting the same subType at the same
 * moment can compute the same code. Retrying is not worth it for two admins
 * on one site; telling them plainly that the code was taken is.
 */
async function asResult(write: () => Promise<unknown>): Promise<ActionResult> {
  try {
    await write();
    return { ok: true };
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2002") {
      return {
        ok: false,
        error: "รหัสนี้ถูกใช้ไปแล้ว กรุณาลองใหม่อีกครั้ง",
      };
    }
    throw err;
  }
}

function parseChannel(formData: FormData) {
  return channelSchema.safeParse({
    nameTh: formData.get("nameTh"),
    nameEn: formData.get("nameEn"),
    type: formData.get("type"),
    subType: formData.get("subType"),
    landingPath: formData.get("landingPath") || CHANNEL_DEFAULT_LANDING_PATH,
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
  await requireRole("ADMIN", "MARKETING");

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  if (!isPromoLandingPath(parsed.data.landingPath)) {
    return { ok: false, error: "หน้า Landing ไม่อยู่ในรายการที่อนุญาต" };
  }

  // No subType picked -> continues the pre-taxonomy "CH0xx" scheme, matching
  // the "- ไม่ระบุ (คงรหัสเดิม) -" option in the admin dropdown.
  const refCode = await nextChannelRefCode(parsed.data.subType ?? "CH");
  return asResult(() =>
    channels.create({
      ...parsed.data,
      slug: slugify(parsed.data.nameEn),
      refCode,
    })
  );
}

export async function updateChannel(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING");

  const parsed = parseChannel(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };
  if (!isPromoLandingPath(parsed.data.landingPath)) {
    return { ok: false, error: "หน้า Landing ไม่อยู่ในรายการที่อนุญาต" };
  }

  const updated = await channels.update(id, parsed.data);
  if (!updated) return { ok: false, error: "ไม่พบช่องทาง" };

  return { ok: true };
}

const executiveSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(30),
  // Set only when the admin picked a system user from the dropdown instead
  // of typing a name — see linkAdminUserToExecutive() below. Absent (or
  // empty string, from the "พิมพ์ชื่อเอง" fallback) keeps today's plain
  // free-text behavior exactly as-is.
  linkedAdminUserId: z.string().trim().optional().or(z.literal("")),
});

function parseExecutive(formData: FormData) {
  return executiveSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    linkedAdminUserId: formData.get("linkedAdminUserId"),
  });
}

/**
 * Mirrors the projection in src/actions/users.ts — passwordHash must never
 * reach an audit snapshot.
 */
const adminUserLinks = auditedEntity({
  entityType: "AdminUser",
  model: (client) => client.adminUser,
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
 * When an executive is created from a picked system user (not the manual
 * "พิมพ์ชื่อเอง" fallback), closes the loop from the channel side by pointing
 * that AdminUser.linkedChannelExecutiveId at the new executive. Last-write-
 * wins: if the user was already linked to a different executive, this
 * re-links it — the old executive row is untouched, it just loses its admin
 * login attachment and stays a valid free-text-style executive.
 */
async function linkAdminUserToExecutive(
  linkedAdminUserId: string,
  executiveId: string
) {
  await adminUserLinks.update(linkedAdminUserId, {
    linkedChannelExecutiveId: executiveId,
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
  await requireRole("ADMIN", "MARKETING", "EDITOR");

  const channel = await prisma.promoChannel.findUnique({
    where: { id: channelId },
  });
  if (!channel) return { ok: false, error: "ไม่พบช่องทาง" };

  const parsed = parseExecutive(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const { linkedAdminUserId, ...data } = parsed.data;
  let name = data.name;
  if (linkedAdminUserId) {
    const adminUser = await prisma.adminUser.findUnique({
      where: { id: linkedAdminUserId },
    });
    if (!adminUser) return { ok: false, error: "ไม่พบผู้ใช้ที่เลือก" };
    name = adminUser.name;
  }

  const refCode = await nextExecutiveRefCode(channelId, channel.refCode);
  return asResult(async () => {
    const created = await executives.create({
      name,
      phone: data.phone,
      channelId,
      refCode,
    });
    if (linkedAdminUserId) {
      await linkAdminUserToExecutive(linkedAdminUserId, created.id);
    }
  });
}

export async function updateChannelExecutive(
  id: string,
  formData: FormData
): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING", "EDITOR");

  const parsed = parseExecutive(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  // Editing an existing executive stays plain free-text (see channels-client:
  // the user-picker dropdown only appears on the "เพิ่ม" create form) — the
  // admin-user link, if any, is left as-is here.
  const { linkedAdminUserId: _linkedAdminUserId, ...data } = parsed.data;
  const updated = await executives.update(id, data);
  if (!updated) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };

  return { ok: true };
}

export async function deleteChannelExecutive(id: string): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING", "EDITOR");

  // Referential guard only — the module loads its own snapshot row, so the
  // `_count` include no longer has to be stripped back out before auditing.
  const guard = await prisma.channelExecutive.findUnique({
    where: { id },
    select: {
      _count: { select: { autoLeads: true, linkedAdminUsers: true } },
    },
  });
  if (!guard) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };
  if (guard._count.autoLeads > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ มี lead อ้างอิงผู้ดำเนินการนี้ ${guard._count.autoLeads} รายการ`,
    };
  }
  if (guard._count.linkedAdminUsers > 0) {
    return {
      ok: false,
      error: `ลบไม่ได้ มีบัญชีผู้ใช้เชื่อมกับผู้ดำเนินการนี้ ${guard._count.linkedAdminUsers} บัญชี กรุณาเชื่อมบัญชีไปยังผู้ดำเนินการอื่นหรือเปลี่ยนบทบาทก่อน`,
    };
  }

  const before = await executives.remove(id);
  if (!before) return { ok: false, error: "ไม่พบผู้ดำเนินการ" };

  return { ok: true };
}

export async function deleteChannel(id: string): Promise<ActionResult> {
  await requireRole("ADMIN", "MARKETING");

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
