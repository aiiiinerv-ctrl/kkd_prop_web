"use server";

import { storePublicImage } from "@/lib/admin-content";
import { auditedAggregate } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { contentRevalidatePaths } from "@/lib/pages";
import { storage } from "@/lib/storage";
import {
  HOME_BOOLEAN_FIELDS,
  HOME_CONTENT_FIELDS,
  HOME_FAQ_MAX,
  homeContentFieldsSchema,
  homeFaqListSchema,
} from "@/lib/validations/home-content";
import type { Prisma } from "@/generated/prisma/client";

export type HomeContentActionResult =
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; conflict: true };

/**
 * Namespace for a replaced hero blob (security research "Image lifecycle" —
 * `public/pages/home/hero/<cuid>.jpg`). Stays `public/` (never `private/`):
 * the hero is rendered on every locale's homepage, so it must be servable
 * through `/files` without a session (S7).
 */
const HERO_IMAGE_PREFIX = "pages/home/hero";

const HOME_ALLOWED_KEYS = new Set<string>([
  ...HOME_CONTENT_FIELDS,
  ...HOME_BOOLEAN_FIELDS,
  "version",
  "faqItemsJson",
  "heroImage",
]);

const homeContentAggregate = auditedAggregate({
  entityType: "HomePageContent",
  model: (client) => client.homePageContent,
  // H3 cutover: registry `home.contentRollout` is "pages", so these
  // revalidations now actually change what the public site shows.
  revalidate: [...contentRevalidatePaths("home")],
});

/** Thrown (and caught) when a submitted FAQ id doesn't belong to this Home row — S14 (IDOR via foreign id). */
class ForeignFaqIdError extends Error {}

type SubmittedFaqItem = {
  id?: string;
  questionTh: string;
  questionEn: string;
  answerTh: string;
  answerEn: string;
};

/**
 * Replaces the Home row's FAQ children with `submitted`, preserving stable
 * ids for rows that survive and normalizing order to contiguous integers
 * (data-model decision "Owned child rows" — HomeFaqItem). Every submitted id
 * must belong to this Home row; a foreign id throws and aborts the whole
 * transaction (S14).
 *
 * Rows are first shifted to a negative `sortOrder` range before being set to
 * their final 1..N values: `@@unique([homePageContentId, sortOrder])` is
 * checked per-statement (not deferred to commit) on MySQL/InnoDB, so writing
 * final positions directly could collide with another row's current value.
 */
async function syncFaqItems(
  tx: Prisma.TransactionClient,
  homeId: string,
  submitted: SubmittedFaqItem[]
): Promise<void> {
  const current = await tx.homeFaqItem.findMany({
    where: { homePageContentId: homeId },
    select: { id: true },
  });
  const currentIds = new Set(current.map((row) => row.id));
  const submittedIds = new Set(
    submitted.filter((item): item is SubmittedFaqItem & { id: string } => !!item.id).map((item) => item.id)
  );

  for (const item of submitted) {
    if (item.id && !currentIds.has(item.id)) throw new ForeignFaqIdError();
  }

  let tempSortOrder = -1;
  for (const id of currentIds) {
    await tx.homeFaqItem.update({ where: { id }, data: { sortOrder: tempSortOrder } });
    tempSortOrder -= 1;
  }

  const toDelete = [...currentIds].filter((id) => !submittedIds.has(id));
  if (toDelete.length > 0) {
    await tx.homeFaqItem.deleteMany({ where: { id: { in: toDelete } } });
  }

  for (let i = 0; i < submitted.length; i++) {
    const item = submitted[i];
    const sortOrder = i + 1;
    const data = {
      questionTh: item.questionTh,
      questionEn: item.questionEn,
      answerTh: item.answerTh,
      answerEn: item.answerEn,
      sortOrder,
    };
    if (item.id) {
      await tx.homeFaqItem.update({ where: { id: item.id }, data });
    } else {
      await tx.homeFaqItem.create({ data: { homePageContentId: homeId, ...data } });
    }
  }
}

/**
 * Bounded aggregate snapshot for the audit row — display fields, visibility,
 * version, ordered FAQ text, and the hero **storage key** only (security
 * research S16: key is fine, bytes/absolute paths are not). Omits the
 * singleton `key`/row `id`/timestamps — same discipline as backfill digests
 * in src/lib/backfill/home-content.ts.
 */
async function homeAuditSnapshot(tx: Prisma.TransactionClient, homeId: string) {
  const [home, faqItems] = await Promise.all([
    tx.homePageContent.findUniqueOrThrow({ where: { id: homeId } }),
    tx.homeFaqItem.findMany({
      where: { homePageContentId: homeId },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const { id, updatedAt, key, ...fields } = home;
  void id;
  void updatedAt;
  void key;
  return {
    ...fields,
    faqItems: faqItems.map(({ questionTh, questionEn, answerTh, answerEn, sortOrder }) => ({
      questionTh,
      questionEn,
      answerTh,
      answerEn,
      sortOrder,
    })),
  };
}

/**
 * Saves the whole Home Page Content aggregate (parent fields + FAQ children
 * + hero image) in one optimistic-versioned, audited transaction. Content
 * roles per the security research RBAC contract — same as About
 * (ADMIN/SALES/MARKETING/EDITOR); contact/social fields are **not** handled
 * here at all — the Home admin UI calls the existing `updateContactSettings`
 * (site-settings.ts) directly, which stays ADMIN/MARKETING-only.
 *
 * Hero image lifecycle (security research "Image lifecycle (hero)"): the
 * new blob is validated/re-encoded and stored under a fresh generated key
 * *before* the transaction — never a client-supplied key/path (S4). If the
 * aggregate save then conflicts, throws, or the request fails validation
 * after the upload already landed, the new blob is deleted (S6) and the old
 * key is left untouched. Only after a successful commit is the *previous*
 * key deleted, so a mid-flight failure never leaves the public page pointing
 * at a missing blob.
 */
export async function updateHomeContent(formData: FormData): Promise<HomeContentActionResult> {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");

  for (const key of formData.keys()) {
    if (!HOME_ALLOWED_KEYS.has(key)) {
      return { ok: false, error: "พบข้อมูลที่ไม่รู้จักในฟอร์ม กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง" };
    }
  }

  const rawFields = Object.fromEntries(HOME_CONTENT_FIELDS.map((k) => [k, formData.get(k) ?? ""]));
  const parsedFields = homeContentFieldsSchema.safeParse(rawFields);
  if (!parsedFields.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const showLatestWorks = formData.get("showLatestWorks") === "on";
  const showServicesCta = formData.get("showServicesCta") === "on";
  const showFaq = formData.get("showFaq") === "on";

  const expectedVersion = Number.parseInt(String(formData.get("version") ?? ""), 10);
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันข้อมูลไม่ถูกต้อง กรุณาโหลดหน้าใหม่" };
  }

  let faqRaw: unknown;
  try {
    faqRaw = JSON.parse(String(formData.get("faqItemsJson") ?? "[]"));
  } catch {
    return { ok: false, error: "ข้อมูลคำถามที่พบบ่อยไม่ถูกต้อง" };
  }
  const parsedFaq = homeFaqListSchema.safeParse(faqRaw);
  if (!parsedFaq.success) {
    return { ok: false, error: `ข้อมูลคำถามที่พบบ่อยไม่ถูกต้อง — ต้องกรอกครบทั้งไทย/อังกฤษ และไม่เกิน ${HOME_FAQ_MAX} ข้อ` };
  }
  if (showFaq && parsedFaq.data.length === 0) {
    return { ok: false, error: "เมื่อเปิดแสดงส่วนคำถามที่พบบ่อย ต้องมีอย่างน้อย 1 ข้อ" };
  }

  const existing = await prisma.homePageContent.findUnique({ where: { key: "home" } });
  if (!existing) return { ok: false, error: "ไม่พบข้อมูลหน้าแรก — ต้องรัน backfill ก่อน" };

  const heroUpload = await storePublicImage(formData.get("heroImage"), HERO_IMAGE_PREFIX);
  if (!heroUpload.ok) return { ok: false, error: heroUpload.error };
  const newHeroKey = heroUpload.key;

  try {
    const result = await homeContentAggregate.save({
      id: existing.id,
      expectedVersion,
      snapshotBefore: (tx) => homeAuditSnapshot(tx, existing.id),
      mutate: async (tx) => {
        await tx.homePageContent.update({
          where: { id: existing.id },
          data: {
            ...parsedFields.data,
            showLatestWorks,
            showServicesCta,
            showFaq,
            ...(newHeroKey ? { heroImageKey: newHeroKey } : {}),
          },
        });
        await syncFaqItems(tx, existing.id, parsedFaq.data);
      },
      snapshotAfter: (tx) => homeAuditSnapshot(tx, existing.id),
    });

    if (!result.ok) {
      if (newHeroKey) await storage.delete(newHeroKey);
      return { ok: false, conflict: true };
    }
    if (newHeroKey && existing.heroImageKey && existing.heroImageKey !== newHeroKey) {
      await storage.delete(existing.heroImageKey);
    }
    return { ok: true };
  } catch (err) {
    if (newHeroKey) await storage.delete(newHeroKey);
    if (err instanceof ForeignFaqIdError) {
      return { ok: false, error: "พบรายการคำถามที่ไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง" };
    }
    throw err;
  }
}
