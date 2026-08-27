import { createHash, timingSafeEqual } from "node:crypto";
import { backfillPagesCmsSprint3 } from "@/lib/backfill/pages-cms-sprint3";
import { prisma } from "@/lib/db";

/**
 * Temporary, disabled-by-default production backfill for Pages CMS Sprint 3
 * (#66). Host cannot run `tsx` — enable only for the Fri 28 Aug 2026 window:
 *
 *   ENABLE_PAGES_CMS_SPRINT3_BACKFILL_ROUTE="true"
 *   PAGES_CMS_SPRINT3_BACKFILL_SECRET="<high-entropy>"
 *
 * Header: x-kkd-pages-cms-sprint3-backfill-secret
 * Tear down (disable + redeploy) immediately after digest parity.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-kkd-pages-cms-sprint3-backfill-secret";

function secretsMatch(expected: string, supplied: string | null): boolean {
  if (!expected || !supplied) return false;
  const expectedHash = createHash("sha256").update(expected).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash);
}

export async function POST(request: Request): Promise<Response> {
  const enabled = process.env.ENABLE_PAGES_CMS_SPRINT3_BACKFILL_ROUTE === "true";
  const secret = process.env.PAGES_CMS_SPRINT3_BACKFILL_SECRET ?? "";
  if (!enabled || !secretsMatch(secret, request.headers.get(SECRET_HEADER))) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const report = await backfillPagesCmsSprint3(prisma);
    return Response.json({ ok: true, ...report });
  } catch (error) {
    console.error("pages-cms-sprint3-backfill failed", error);
    return Response.json({ error: "backfill_failed" }, { status: 500 });
  }
}
