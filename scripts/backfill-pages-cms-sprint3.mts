/**
 * backfill-pages-cms-sprint3.mts — idempotent Sprint 3 backfill (#66).
 *
 * Logic: src/lib/backfill/pages-cms-sprint3.ts
 * Production twin: src/app/api/operations/pages-cms-sprint3-backfill/route.ts
 *
 *   npx tsx scripts/backfill-pages-cms-sprint3.mts
 * Run twice and confirm contentDigest matches.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { backfillPagesCmsSprint3 } from "../src/lib/backfill/pages-cms-sprint3.js";

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(process.env.DATABASE_URL!),
});

async function main() {
  const report = await backfillPagesCmsSprint3(prisma);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
