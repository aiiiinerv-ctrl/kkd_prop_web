import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@paralleldrive/cuid2";
import type { PrismaClient } from "../../generated/prisma/client";
import { compressImage } from "../images";
import { storage } from "../storage";

/**
 * One-time idempotent backfill for `HomePageContent` + `HomeFaqItem`
 * (issue #61 / Home CMS slice Sprint H1). Derives every field from the
 * current `messages.home` / `messages.faq` values and the static hero image
 * — see docs/plans/pages-cms-data-model-migration-decision.md "Backfill
 * contract" and docs/plans/home-cms-slice-implementation-sprints.md Sprint H1.
 *
 * Lives here (not only in the script) so production — which cannot run
 * `tsx` — can run the same logic through a gated temporary route
 * (src/app/api/operations/home-cms-backfill/route.ts), mirroring
 * src/lib/backfill/customer-message.ts.
 *
 * Public readers (`home-content.tsx`, `FaqSection`) are NOT touched by this
 * module and keep reading `messages/*.json` directly — no cutover happens
 * until Sprint H3.
 */

type MessageBundle = Record<string, string>;
type LocaleMessages = { home: MessageBundle; faq: MessageBundle; common: MessageBundle };

const HERO_PREFIX = "public/pages/home/hero";
const FAQ_KEYS = ["q1", "q2", "q3", "q4", "q5"] as const;

export type HomeBackfillReport = {
  homeCreated: boolean;
  faqCreated: number;
  faqUpdated: number;
  faqRowCount: number;
  heroKey: string;
  heroAlreadyPresent: boolean;
  /** sha256 of the normalized DB content (home fields + ordered FAQ rows). */
  contentDigest: string;
  /** sha256 of the stored hero JPEG bytes. */
  heroImageSha256: string;
};

async function loadMessages(locale: "th" | "en"): Promise<LocaleMessages> {
  const filePath = path.join(process.cwd(), "src", "messages", `${locale}.json`);
  const raw = await readFile(filePath, "utf8");
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  return {
    home: (parsed.home as MessageBundle) ?? {},
    faq: (parsed.faq as MessageBundle) ?? {},
    common: (parsed.common as MessageBundle) ?? {},
  };
}

function buildContentFields(th: LocaleMessages, en: LocaleMessages) {
  const pick = (bundle: MessageBundle, key: string): string | null => bundle[key] ?? null;

  return {
    heroKickerTh: pick(th.home, "theme3Kicker"),
    heroKickerEn: pick(en.home, "theme3Kicker"),
    heroTitleWhiteTh: pick(th.home, "theme6HeroTitleWhite"),
    heroTitleWhiteEn: pick(en.home, "theme6HeroTitleWhite"),
    heroTitleGoldTh: pick(th.home, "theme6HeroTitleGold"),
    heroTitleGoldEn: pick(en.home, "theme6HeroTitleGold"),
    heroSubtitleTh: pick(th.home, "heroSubtitle"),
    heroSubtitleEn: pick(en.home, "heroSubtitle"),
    // Public today reuses heroTitle as the hero <Image> alt text — see
    // src/app/[locale]/home-content.tsx.
    heroAltTh: pick(th.home, "heroTitle"),
    heroAltEn: pick(en.home, "heroTitle"),
    // CTA labels are rendered from `common` today (shared with other pages'
    // booking links); backfilled as-is so the digest matches current render.
    ctaPrimaryLabelTh: pick(th.common, "requestQuote"),
    ctaPrimaryLabelEn: pick(en.common, "requestQuote"),
    ctaSecondaryLabelTh: pick(th.common, "bookSurvey"),
    ctaSecondaryLabelEn: pick(en.common, "bookSurvey"),
    quickContactLabelTh: pick(th.home, "quickContactTitle"),
    quickContactLabelEn: pick(en.home, "quickContactTitle"),
    proofLabelTh: pick(th.home, "theme3ProofLabel"),
    proofLabelEn: pick(en.home, "theme3ProofLabel"),
    proofTitleTh: pick(th.home, "theme3ProofTitle"),
    proofTitleEn: pick(en.home, "theme3ProofTitle"),
    proofItem1Th: pick(th.home, "theme3ProofItem1"),
    proofItem1En: pick(en.home, "theme3ProofItem1"),
    proofItem2Th: pick(th.home, "theme3ProofItem2"),
    proofItem2En: pick(en.home, "theme3ProofItem2"),
    proofItem3Th: pick(th.home, "theme3ProofItem3"),
    proofItem3En: pick(en.home, "theme3ProofItem3"),
    feature1LabelTh: pick(th.home, "theme6Feature1"),
    feature1LabelEn: pick(en.home, "theme6Feature1"),
    feature2LabelTh: pick(th.home, "theme6Feature2"),
    feature2LabelEn: pick(en.home, "theme6Feature2"),
    feature3LabelTh: pick(th.home, "theme6Feature3"),
    feature3LabelEn: pick(en.home, "theme6Feature3"),
    feature4LabelTh: pick(th.home, "theme6Feature4"),
    feature4LabelEn: pick(en.home, "theme6Feature4"),

    latestWorksHeadingTh: pick(th.home, "latestProjects"),
    latestWorksHeadingEn: pick(en.home, "latestProjects"),
    metric1LabelTh: pick(th.home, "theme3Metric1Label"),
    metric1LabelEn: pick(en.home, "theme3Metric1Label"),
    metric1ValueTh: pick(th.home, "theme3Metric1Value"),
    metric1ValueEn: pick(en.home, "theme3Metric1Value"),
    metric2LabelTh: pick(th.home, "theme3Metric2Label"),
    metric2LabelEn: pick(en.home, "theme3Metric2Label"),
    metric2ValueTh: pick(th.home, "theme3Metric2Value"),
    metric2ValueEn: pick(en.home, "theme3Metric2Value"),
    metric3LabelTh: pick(th.home, "theme3Metric3Label"),
    metric3LabelEn: pick(en.home, "theme3Metric3Label"),
    metric3ValueTh: pick(th.home, "theme3Metric3Value"),
    metric3ValueEn: pick(en.home, "theme3Metric3Value"),
    viewAllLabelTh: pick(th.home, "viewAllPortfolio"),
    viewAllLabelEn: pick(en.home, "viewAllPortfolio"),

    servicesCtaBadgeTh: pick(th.home, "actionRowBadge"),
    servicesCtaBadgeEn: pick(en.home, "actionRowBadge"),
    servicesCtaTitleTh: pick(th.home, "actionRowTitle"),
    servicesCtaTitleEn: pick(en.home, "actionRowTitle"),
    servicesCtaTextTh: pick(th.home, "actionRowText"),
    servicesCtaTextEn: pick(en.home, "actionRowText"),
    servicesCtaLinkLabelTh: pick(th.home, "actionRowLink"),
    servicesCtaLinkLabelEn: pick(en.home, "actionRowLink"),

    faqBadgeTh: pick(th.faq, "badge"),
    faqBadgeEn: pick(en.faq, "badge"),
    faqTitleTh: pick(th.faq, "title"),
    faqTitleEn: pick(en.faq, "title"),
    faqIntroTh: pick(th.faq, "intro"),
    faqIntroEn: pick(en.faq, "intro"),
    faqLineButtonLabelTh: pick(th.faq, "lineButton"),
    faqLineButtonLabelEn: pick(en.faq, "lineButton"),
  };
}

function buildFaqRows(th: LocaleMessages, en: LocaleMessages) {
  return FAQ_KEYS.map((qKey, i) => {
    const aKey = `a${i + 1}`;
    return {
      sortOrder: i + 1,
      questionTh: th.faq[qKey] ?? "",
      questionEn: en.faq[qKey] ?? "",
      answerTh: th.faq[aKey] ?? "",
      answerEn: en.faq[aKey] ?? "",
    };
  });
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonicalize(v)])
    );
  }
  return value;
}

function digestOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

function omit<T extends Record<string, unknown>>(row: T, keys: readonly string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (!keys.includes(key)) result[key] = val;
  }
  return result;
}

/**
 * Copies/re-encodes the static hero into managed storage exactly once. If a
 * key is already recorded AND its blob still exists, this is a no-op (keeps
 * the key stable across re-runs — required for the digest to stay identical
 * on a second run). If the key is missing or its blob was lost, a fresh key
 * is generated (compensates for a partial prior run/wiped storage).
 */
async function ensureHeroImage(
  prisma: PrismaClient,
  home: { id: string; heroImageKey: string | null }
): Promise<{ heroKey: string; alreadyPresent: boolean; sha256: string }> {
  if (home.heroImageKey) {
    const existing = await storage.get(home.heroImageKey);
    if (existing) {
      return {
        heroKey: home.heroImageKey,
        alreadyPresent: true,
        sha256: createHash("sha256").update(existing.data).digest("hex"),
      };
    }
  }

  const staticHeroPath = path.join(process.cwd(), "public", "marketing", "hero-solar.jpg");
  const staticBuffer = await readFile(staticHeroPath);
  const compressed = await compressImage(staticBuffer);
  const key = `${HERO_PREFIX}/${createId()}.jpg`;
  await storage.put(key, compressed, { contentType: "image/jpeg" });

  await prisma.homePageContent.update({
    where: { id: home.id },
    data: { heroImageKey: key },
  });

  return {
    heroKey: key,
    alreadyPresent: false,
    sha256: createHash("sha256").update(compressed).digest("hex"),
  };
}

export async function backfillHomeContent(prisma: PrismaClient): Promise<HomeBackfillReport> {
  const [th, en] = await Promise.all([loadMessages("th"), loadMessages("en")]);
  const fields = buildContentFields(th, en);
  const faqRows = buildFaqRows(th, en);

  const existing = await prisma.homePageContent.findUnique({ where: { key: "home" } });
  const home = existing
    ? await prisma.homePageContent.update({ where: { id: existing.id }, data: fields })
    : await prisma.homePageContent.create({ data: { key: "home", ...fields } });

  let faqCreated = 0;
  let faqUpdated = 0;
  for (const row of faqRows) {
    const { sortOrder, ...data } = row;
    const existingFaq = await prisma.homeFaqItem.findUnique({
      where: { homePageContentId_sortOrder: { homePageContentId: home.id, sortOrder } },
    });
    if (existingFaq) {
      await prisma.homeFaqItem.update({ where: { id: existingFaq.id }, data });
      faqUpdated += 1;
    } else {
      await prisma.homeFaqItem.create({ data: { homePageContentId: home.id, sortOrder, ...data } });
      faqCreated += 1;
    }
  }

  const hero = await ensureHeroImage(prisma, home);

  const [refreshedHome, faqItems] = await Promise.all([
    prisma.homePageContent.findUniqueOrThrow({ where: { id: home.id } }),
    prisma.homeFaqItem.findMany({
      where: { homePageContentId: home.id },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const contentForDigest = omit(refreshedHome, ["id", "version", "updatedAt", "heroImageKey"]);
  const faqForDigest = faqItems.map((row) =>
    omit(row, ["id", "homePageContentId", "createdAt", "updatedAt"])
  );

  return {
    homeCreated: !existing,
    faqCreated,
    faqUpdated,
    faqRowCount: faqItems.length,
    heroKey: hero.heroKey,
    heroAlreadyPresent: hero.alreadyPresent,
    contentDigest: digestOf({ content: contentForDigest, faq: faqForDigest }),
    heroImageSha256: hero.sha256,
  };
}
