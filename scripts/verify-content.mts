// Checks for the content module (src/lib/content/): the pure row → view-model
// mappers, plus the structural rule that public pages read through the module
// rather than reaching for Prisma themselves. No test runner in this repo —
// see AGENTS.md — so this is a standalone assertion script. Needs no server
// and no database: the mappers take plain rows, and the rule is checked by
// reading the source.
// Usage: npx tsx scripts/verify-content.mts
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  toChannelView,
  toPackageView,
  toProjectView,
  toServiceView,
  toTestimonialView,
} from "../src/lib/content/views";

let failed = false;

function assert(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? `: ${detail}` : ""}`);
  if (!ok) failed = true;
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    `${ok ? "✓" : "✗"} ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`
  );
  if (!ok) failed = true;
}

console.log("=== paired locale columns: picks the requested language ===");
const pkgRow = {
  id: "p1",
  slug: "solar-5kw",
  nameTh: "แพ็กเกจ 5 กิโลวัตต์",
  nameEn: "5kW Package",
  suitableTh: "เหมาะกับบ้านขนาดกลาง",
  suitableEn: "Suits a mid-size home",
  featuresTh: ["แผง 10 แผ่น", "รับประกัน 10 ปี"],
  featuresEn: ["10 panels", "10-year warranty"],
  priceThb: 155000,
  sizeKw: 5,
  isPopular: true,
  seasonalProduction: null,
  updatedAt: new Date("2026-01-15T00:00:00Z"),
};
assertEqual("th name", toPackageView(pkgRow, "th").name, "แพ็กเกจ 5 กิโลวัตต์");
assertEqual("en name", toPackageView(pkgRow, "en").name, "5kW Package");
assertEqual("th features", toPackageView(pkgRow, "th").features, ["แผง 10 แผ่น", "รับประกัน 10 ปี"]);
assertEqual("en features", toPackageView(pkgRow, "en").features, ["10 panels", "10-year warranty"]);
assertEqual(
  "unknown locale falls back to th",
  toPackageView(pkgRow, "de").name,
  "แพ็กเกจ 5 กิโลวัตต์"
);

console.log("\n=== fallback when the English column is absent vs. blank ===");
// These pin down current behaviour, which is narrower than pickLocale's
// docstring claims ("falls back to Thai when the English field is empty"):
// `??` only falls back for null/undefined, so a blank string or empty list is
// taken at face value and the English page renders nothing there. Left as-is
// because this refactor is not meant to change what the site shows — see the
// note in the summary. If the fallback is widened later, these two
// expectations are the ones to flip.
const missingEn = { ...pkgRow, nameEn: undefined, featuresEn: undefined };
assertEqual("absent en column falls back to th", toPackageView(missingEn, "en").name, "แพ็กเกจ 5 กิโลวัตต์");
assertEqual(
  "absent en features fall back to th",
  toPackageView(missingEn, "en").features,
  ["แผง 10 แผ่น", "รับประกัน 10 ปี"]
);

const blankEn = { ...pkgRow, nameEn: "", featuresEn: [] };
assertEqual("blank en name renders blank (no fallback)", toPackageView(blankEn, "en").name, "");
assertEqual("blank en features render empty (no fallback)", toPackageView(blankEn, "en").features, []);

console.log("\n=== seasonal production is optional, not assumed ===");
assertEqual("null seasonalProduction becomes undefined", toPackageView(pkgRow, "th").seasonal, undefined);
const withSeasonal = { ...pkgRow, seasonalProduction: { summer: { unitsPerDay: 20 } } };
assert(
  "present seasonalProduction is carried through",
  toPackageView(withSeasonal, "th").seasonal !== undefined
);

console.log("\n=== portfolio images: Json column is never trusted blindly ===");
const projectRow = {
  id: "pr1",
  titleTh: "ติดตั้งโรงงาน",
  titleEn: "Factory install",
  descriptionTh: "รายละเอียด",
  descriptionEn: "Description",
  province: "สมุทรปราการ",
  systemSizeKw: 30,
  category: "INDUSTRIAL",
  imageKeys: ["public/portfolio/a.jpg", "public/portfolio/b.jpg"],
};
const projectView = toProjectView(projectRow, "th");
assert("first image becomes the cover url", projectView.imageUrl?.includes("a.jpg") === true);
assertEqual("all images mapped", projectView.imageUrls.length, 2);
assertEqual(
  "empty imageKeys yields a null cover",
  toProjectView({ ...projectRow, imageKeys: [] }, "th").imageUrl,
  null
);
assertEqual(
  "non-array imageKeys is treated as no images",
  toProjectView({ ...projectRow, imageKeys: null }, "th").imageUrls,
  []
);
assertEqual(
  "non-string entries are dropped rather than rendered",
  toProjectView({ ...projectRow, imageKeys: ["public/ok.jpg", 42, null] }, "th").imageUrls.length,
  1
);

console.log("\n=== other entities ===");
assertEqual(
  "service picks locale",
  toServiceView(
    { id: "s1", slug: "on-grid", kind: "SYSTEM", titleTh: "ออนกริด", titleEn: "On-Grid", descriptionTh: "ก", descriptionEn: "a", featuresTh: [], featuresEn: [] },
    "en"
  ).title,
  "On-Grid"
);
const testimonialView = toTestimonialView(
  { id: "t1", customerName: "คุณสมชาย", quoteTh: "ดีมาก", quoteEn: "Great", role: "", province: "ชลบุรี", photoKey: null },
  "th"
);
assertEqual("testimonial quote", testimonialView.quote, "ดีมาก");
assertEqual("blank role becomes null", testimonialView.role, null);
assertEqual("missing photo becomes null", testimonialView.photoUrl, null);
assertEqual(
  "channel picks locale",
  toChannelView({ id: "c1", nameTh: "เฟซบุ๊ก", nameEn: "Facebook" }, "en").name,
  "Facebook"
);

console.log("\n=== public pages read through the content module, not Prisma ===");
// The rule this protects: every public read goes through src/lib/content, so
// "what counts as published" can't drift back into individual pages.
const PUBLIC_DIRS = ["src/app/[locale]", "src/components/site"];
const BANNED = ["@/lib/db", "@/lib/i18n-content", "@/lib/storage"];

function walk(dir: string): string[] {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const offenders: string[] = [];
for (const dir of PUBLIC_DIRS) {
  for (const file of walk(dir)) {
    if (!/\.tsx?$/.test(file)) continue;
    const source = readFileSync(file, "utf8");
    for (const banned of BANNED) {
      if (source.includes(`from "${banned}"`)) {
        offenders.push(`${file} → ${banned}`);
      }
    }
  }
}
assert(
  "no public page imports prisma, pickLocale or the storage driver directly",
  offenders.length === 0,
  offenders.join(" · ")
);

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
