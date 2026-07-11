"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { notifyNewLead } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
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
    avgMonthlyBill: formData.get("avgMonthlyBill") || undefined,
    sourceChannelId: formData.get("sourceChannelId") ?? "",
    locale: formData.get("locale") ?? "th",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const lead = await prisma.lead.create({
    data: {
      type: "QUOTE",
      name: data.name,
      phone: data.phone,
      lineId: data.lineId || null,
      province: data.province,
      buildingType: data.buildingType,
      avgMonthlyBill: data.avgMonthlyBill ?? null,
      locale: data.locale,
      sourceChannelId: data.sourceChannelId || null,
    },
  });

  await notifyNewLead({ kind: "QUOTE", lead });
  return { ok: true };
}
