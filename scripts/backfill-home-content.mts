/**
 * backfill-home-content.mts — one-time idempotent backfill for
 * `HomePageContent` + `HomeFaqItem` from messages.home / messages.faq, and
 * the static hero image into managed storage (issue #61, Home CMS Sprint H1).
 *
 * The backfill logic lives in src/lib/backfill/home-content.ts, shared with
 * the gated temporary admin route that runs the same thing against
 * production (which cannot run this script at all — `tsx` is a
 * devDependency the deploy artifact never contains).
 *
 * Safe to run more than once: re-running upserts the same singleton row and
 * the same 5 FAQ rows, and skips re-generating the hero blob once one is
 * stored. Run twice and diff `contentDigest` / `heroImageSha256` to prove
 * idempotency.
 *
 *   docker compose up -d mysql   # first, if not already running
 *   npx tsx scripts/backfill-home-content.mts
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { backfillHomeContent } from "../src/lib/backfill/home-content.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

async function main() {
  const report = await backfillHomeContent(prisma);

  console.log(`HomePageContent: ${report.homeCreated ? "created" : "updated (already existed)"}`);
  console.log(`HomeFaqItem: created=${report.faqCreated} updated=${report.faqUpdated} total=${report.faqRowCount}`);
  console.log(`Hero key: ${report.heroKey} (${report.heroAlreadyPresent ? "already present, skipped re-store" : "newly stored"})`);
  console.log(`Hero image sha256: ${report.heroImageSha256}`);
  console.log(`Content digest: ${report.contentDigest}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
