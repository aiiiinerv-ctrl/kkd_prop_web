"use server";

import { createId } from "@paralleldrive/cuid2";
import { headers } from "next/headers";
import { nextBookingNumber } from "@/lib/bookings/booking-number";
import { isDateFull } from "@/lib/bookings/capacity";
import { prisma } from "@/lib/db";
import { compressImage } from "@/lib/images";
import { notifyNewLead } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveRefAttribution } from "@/lib/ref-attribution";
import { storage, validateImage } from "@/lib/storage";
import { surveySchema } from "@/lib/validations/lead";
import type { SubmitResult } from "./submit-quote";

export async function submitSurveyBooking(
  formData: FormData
): Promise<SubmitResult> {
  const hdrs = await headers();
  const ip = hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return { ok: false, error: "rate_limited" };
  }

  const parsed = surveySchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    lineId: formData.get("lineId") ?? "",
    referrerName: formData.get("referrerName") ?? "",
    province: formData.get("province"),
    buildingType: formData.get("buildingType"),
    buildingTypeOtherText: formData.get("buildingTypeOtherText") ?? "",
    notes: formData.get("notes") ?? "",
    address: formData.get("address"),
    preferredDate: formData.get("preferredDate"),
    timeSlot: formData.get("timeSlot"),
    sourceChannelId: formData.get("sourceChannelId") ?? "",
    locale: formData.get("locale") ?? "th",
  });
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  const slip = formData.get("paymentSlip");
  if (!(slip instanceof File) || slip.size === 0) {
    return { ok: false, error: "slip_required" };
  }
  const slipCheck = validateImage(slip, { maxMb: 5 });
  if (!slipCheck.ok) {
    return { ok: false, error: "slip_invalid" };
  }

  // Server-side capacity check — the availability endpoint only informs the
  // form; this is the check that actually protects the calendar. See
  // capacity.ts for why the residual check-then-create race is accepted.
  if (await isDateFull(data.preferredDate, data.timeSlot)) {
    return { ok: false, error: "date_full" };
  }

  // Same compression pipeline as admin uploads — slips come from the one path
  // an unauthenticated visitor controls, so storing raw buffers here was the
  // worst place to skip it.
  const compressed = await compressImage(Buffer.from(await slip.arrayBuffer()));
  const slipKey = `private/slips/${createId()}.jpg`;
  await storage.put(slipKey, compressed, { contentType: "image/jpeg" });

  const bookingNumber = await nextBookingNumber();
  const { autoSourceChannelId, autoSourceExecutiveId } =
    await resolveRefAttribution();
  const lead = await prisma.lead.create({
    data: {
      type: "SURVEY",
      name: data.name,
      phone: data.phone,
      lineId: data.lineId || null,
      referrerName: data.referrerName || null,
      province: data.province,
      buildingType: data.buildingType,
      buildingTypeOtherText: data.buildingTypeOtherText || null,
      notes: data.notes || null,
      locale: data.locale,
      sourceChannelId: data.sourceChannelId || null,
      autoSourceChannelId,
      autoSourceExecutiveId,
      booking: {
        create: {
          bookingNumber,
          address: data.address,
          preferredDate: data.preferredDate,
          timeSlot: data.timeSlot,
          paymentSlipKey: slipKey,
        },
      },
    },
    include: { booking: true },
  });

  await notifyNewLead({
    kind: "SURVEY",
    lead,
    booking: lead.booking ?? undefined,
  });
  return { ok: true };
}
