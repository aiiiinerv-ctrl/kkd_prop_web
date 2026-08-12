import { prisma } from "@/lib/db";

/**
 * Looks up the Package/Service the booking link's `?package=`/`?service=`
 * param (see src/lib/booking-links.ts) claims to be about, and only keeps
 * the slug if a matching row actually exists — the query param is
 * client-controlled, so it's never trusted at face value (#18 chunk 2).
 * An unrecognized slug is stored as null rather than the raw param.
 */
export async function resolveInterestSlugs(
  interestedPackageSlug: string | undefined,
  interestedServiceSlug: string | undefined
): Promise<{ interestedPackageSlug: string | null; interestedServiceSlug: string | null }> {
  const [packageRow, serviceRow] = await Promise.all([
    interestedPackageSlug
      ? prisma.package.findUnique({
          where: { slug: interestedPackageSlug },
          select: { slug: true },
        })
      : null,
    interestedServiceSlug
      ? prisma.service.findUnique({
          where: { slug: interestedServiceSlug },
          select: { slug: true },
        })
      : null,
  ]);
  return {
    interestedPackageSlug: packageRow?.slug ?? null,
    interestedServiceSlug: serviceRow?.slug ?? null,
  };
}
