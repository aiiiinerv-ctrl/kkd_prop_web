import { createHash, timingSafeEqual } from "node:crypto";
import { backfillHomeContent } from "@/lib/backfill/home-content";
import { prisma } from "@/lib/db";

/**
 * Temporary, disabled-by-default production backfill endpoint for
 * `HomePageContent` + `HomeFaqItem` (issue #61, Home CMS Sprint H1).
 * Production cannot run `tsx scripts/backfill-home-content.mts` — this route
 * runs the same shared logic (src/lib/backfill/home-content.ts) inside the
 * app instead, following the same gated pattern as
 * src/app/api/operations/pages-cms-backup/route.ts and the backfill contract
 * in docs/plans/pages-cms-data-model-migration-decision.md.
 *
 * Enable only for the duration of the one-time production backfill:
 *   ENABLE_HOME_CMS_BACKFILL_ROUTE="true"
 *   HOME_CMS_BACKFILL_SECRET="<high-entropy value, panel env var UI only>"
 * Then set both back to disabled/empty and redeploy immediately after the
 * response is verified (row counts / digest match a second, idempotent call).
 * Never leave this enabled outside that window.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-kkd-home-cms-backfill-secret";

function secretsMatch(expected: string, supplied: string | null): boolean {
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function POST(request: Request): Promise<Response> {
  const enabled = process.env.ENABLE_HOME_CMS_BACKFILL_ROUTE === "true";
  const secret = process.env.HOME_CMS_BACKFILL_SECRET ?? "";
  if (!enabled || !secretsMatch(secret, request.headers.get(SECRET_HEADER))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const report = await backfillHomeContent(prisma);
    // Counts/digests only — never the actual TH/EN content or storage bytes.
    return Response.json({ ok: true, ...report });
  } catch (error) {
    console.error("home-cms-backfill failed", error);
    return Response.json({ error: "backfill_failed" }, { status: 500 });
  }
}
