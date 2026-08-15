"use server";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { resolveInterestSlugs } from "@/lib/lead-interest-slugs";
import { notifyNewLead } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { effectiveChannel } from "@/lib/reports/aggregate";
import { resolveRefAttribution, resolveUtmAttribution } from "@/lib/ref-attribution";
import { quoteSchema, zodFieldErrors } from "@/lib/validations/lead";

export type SubmitResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// Accepts a plain object (already shaped by the shared quoteSchema on the
// client) rather than FormData — the quote flow carries no file, so there is
// nothing FormData would buy. zod on the server remains the source of truth:
// the input is re-validated in full regardless of what the client did.
export async function submitQuote(input: unknown): Promise<SubmitResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return { ok: false, error: "rate_limited" };
  }

  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fieldErrors: zodFieldErrors(parsed.error) };
  }
  const data = parsed.data;
  const { autoSourceChannelId, autoSourceExecutiveId } =
    await resolveRefAttribution();
  const utm = await resolveUtmAttribution();
  const { interestedPackageSlug, interestedServiceSlug } = await resolveInterestSlugs(
    data.interestedPackageSlug,
    data.interestedServiceSlug
  );

  const lead = await prisma.lead.create({
    data: {
      type: "QUOTE",
      name: data.name,
      phone: data.phone,
      lineId: data.lineId || null,
      referrerName: data.referrerName || null,
      province: data.province,
      buildingType: data.buildingType,
      buildingTypeOtherText: data.buildingTypeOtherText || null,
      customerMessage: data.notes || null,
      avgMonthlyBill: data.avgMonthlyBill ?? null,
      interestedSystems: data.interestedSystems?.length
        ? data.interestedSystems
        : Prisma.JsonNull,
      interestedPackageSlug,
      interestedServiceSlug,
      locale: data.locale,
      sourceChannelId: data.sourceChannelId || null,
      autoSourceChannelId,
      autoSourceExecutiveId,
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmContent: utm.utmContent,
      utmTerm: utm.utmTerm,
      landingPath: utm.landingPath,
    },
    include: {
      sourceChannel: { select: { nameTh: true } },
      autoSourceChannel: { select: { nameTh: true } },
    },
  });

  const channel = effectiveChannel(lead);
  await notifyNewLead({ kind: "QUOTE", lead, channelName: channel.id ? channel.name : undefined });
  return { ok: true };
}
