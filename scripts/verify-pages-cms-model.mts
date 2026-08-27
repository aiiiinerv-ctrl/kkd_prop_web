/**
 * Pure model checks for Pages CMS Sprint 4 (#67).
 * Registry keys, rollout partition, Properties schema, high-risk helper.
 *
 * Usage: npx tsx scripts/verify-pages-cms-model.mts
 */
import assert from "node:assert/strict";
import {
  PAGE_KEYS,
  PAGE_REGISTRY,
  adminEnabledPages,
  contentRevalidatePaths,
  isPageKey,
  rolloutPartition,
} from "../src/lib/pages/index.js";
import {
  isHighRiskPropertiesTransition,
  pagePropertiesFieldsSchema,
} from "../src/lib/validations/page-properties.js";

let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`FAIL  ${name}`);
    console.error(err);
  }
}

check("exactly six page keys", () => {
  assert.equal(PAGE_KEYS.length, 6);
  assert.deepEqual([...PAGE_KEYS].sort(), [
    "about",
    "calculator",
    "home",
    "packages",
    "portfolio",
    "services",
  ]);
});

check("isPageKey allowlist", () => {
  assert.equal(isPageKey("home"), true);
  assert.equal(isPageKey("booking"), false);
  assert.equal(isPageKey("contact"), false);
  assert.equal(isPageKey(""), false);
  assert.equal(isPageKey(null), false);
});

check("rollout partition: five pages live, calculator legacy", () => {
  const { legacy, pages } = rolloutPartition();
  assert.deepEqual([...pages].sort(), ["about", "home", "packages", "portfolio", "services"]);
  assert.deepEqual(legacy.sort(), ["calculator"]);
});

check("five pages admin Content + Properties enabled", () => {
  const enabled = adminEnabledPages().map((e) => e.key).sort();
  assert.deepEqual(enabled, ["about", "home", "packages", "portfolio", "services"]);
  for (const key of PAGE_KEYS) {
    const on = key !== "calculator";
    assert.equal(PAGE_REGISTRY[key].adminContentEnabled, on);
    assert.equal(PAGE_REGISTRY[key].propertiesAdminEnabled, on);
  }
});

check("content revalidate paths include locales + admin", () => {
  const paths = contentRevalidatePaths("home");
  assert.ok(paths.includes("/th"));
  assert.ok(paths.includes("/en"));
  assert.ok(paths.includes("/admin/pages/home"));
});

check("properties schema rejects non-registry key", () => {
  const bad = pagePropertiesFieldsSchema.safeParse({
    pageKey: "booking",
    expectedVersion: 1,
    titleTh: "ท",
    titleEn: "E",
    descriptionTh: "ด",
    descriptionEn: "D",
    canonicalPathTh: null,
    canonicalPathEn: null,
    robotsIndex: true,
    robotsFollow: true,
  });
  assert.equal(bad.success, false);
});

check("properties schema accepts home key", () => {
  const good = pagePropertiesFieldsSchema.safeParse({
    pageKey: "home",
    expectedVersion: 1,
    titleTh: "หน้าแรก",
    titleEn: "Home",
    descriptionTh: "คำอธิบาย",
    descriptionEn: "Description",
    ogTitleTh: "",
    ogTitleEn: "",
    ogDescriptionTh: "",
    ogDescriptionEn: "",
    canonicalPathTh: "/th",
    canonicalPathEn: "/en",
    robotsIndex: true,
    robotsFollow: true,
    ogImageOperation: "keep",
  });
  assert.equal(good.success, true, JSON.stringify(good.error?.flatten()));
});

check("canonical must match locale prefix", () => {
  const bad = pagePropertiesFieldsSchema.safeParse({
    pageKey: "about",
    expectedVersion: 1,
    titleTh: "ท",
    titleEn: "E",
    descriptionTh: "ด",
    descriptionEn: "D",
    canonicalPathTh: "/en/about",
    canonicalPathEn: "/th/about",
    robotsIndex: true,
    robotsFollow: true,
  });
  assert.equal(bad.success, false);
});

check("high-risk when index turns off", () => {
  assert.equal(
    isHighRiskPropertiesTransition({
      prevIndex: true,
      prevFollow: true,
      nextIndex: false,
      nextFollow: true,
    }),
    true,
  );
  assert.equal(
    isHighRiskPropertiesTransition({
      prevIndex: true,
      prevFollow: true,
      nextIndex: true,
      nextFollow: true,
    }),
    false,
  );
});

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nAll Pages CMS model checks passed.");
