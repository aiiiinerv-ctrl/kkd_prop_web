"use server";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { notifyNewLead } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveRefAttribution } from "@/lib/ref-attribution";
import { quoteSchema } from "@/lib/validations/lead";

export type SubmitResult = { ok: true } | { ok: false; error: string };

export async function submitQuote(formData: FormData): Promise<SubmitResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return { ok: false, error: "rate_limited" };
  }

  const parsed = quoteSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    lineId: formData.get("lineId") ?? "",
    province: formData.get("province"),
    buildingType: formData.get("buildingType"),
    buildingTypeOtherText: formData.get("buildingTypeOtherText") ?? "",
    notes: formData.get("notes") ?? "",
    avgMonthlyBill: formData.get("avgMonthlyBill") || undefined,
    interestedSystems: formData.getAll("interestedSystems"),
    sourceChannelId: formData.get("sourceChannelId") ?? "",
    locale: formData.get("locale") ?? "th",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;
  const { autoSourceChannelId, autoSourceExecutiveId } =
    await resolveRefAttribution();

  const lead = await prisma.lead.create({
    data: {
      type: "QUOTE",
      name: data.name,
      phone: data.phone,
      lineId: data.lineId || null,
      province: data.province,
      buildingType: data.buildingType,
      buildingTypeOtherText: data.buildingTypeOtherText || null,
      notes: data.notes || null,
      avgMonthlyBill: data.avgMonthlyBill ?? null,
      interestedSystems: data.interestedSystems?.length
        ? data.interestedSystems
        : Prisma.JsonNull,
      locale: data.locale,
      sourceChannelId: data.sourceChannelId || null,
      autoSourceChannelId,
      autoSourceExecutiveId,
    },
  });

  await notifyNewLead({ kind: "QUOTE", lead });
  return { ok: true };
}
