/**
 * Regression: shared sitemap path collector covers legacy static paths + packages.
 * Run: npx tsx scripts/verify-sitemap-tree.mts
 */
import "dotenv/config";
import { collectSitemapPaths } from "../src/lib/sitemap/public-tree.js";

const LEGACY_STATIC = [
  "/",
  "/about",
  "/services",
  "/packages",
  "/portfolio",
  "/booking",
  "/contact",
  "/calculator",
  "/sitemap",
];

async function main() {
  const entries = await collectSitemapPaths();
  const paths = new Set(entries.map((e) => e.path));

  const missing = LEGACY_STATIC.filter((p) => !paths.has(p));
  if (missing.length > 0) {
    console.error("✗ missing static paths:", missing.join(", "));
    process.exit(1);
  }

  const packageDetails = entries.filter((e) => e.path.startsWith("/packages/"));
  if (packageDetails.length === 0) {
    console.error("✗ expected at least one /packages/{slug} entry");
    process.exit(1);
  }

  const hasSitemapPage = paths.has("/sitemap");
  if (!hasSitemapPage) {
    console.error("✗ /sitemap page missing from collector");
    process.exit(1);
  }

  console.log(`✓ sitemap tree: ${paths.size} unique paths (${packageDetails.length} package details)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
