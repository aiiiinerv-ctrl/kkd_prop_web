"use server";

import { createId } from "@paralleldrive/cuid2";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { notifyNewLead } from "@/lib/notifications";
import { checkRateLimit } from "@/lib/rate-limit";
import { resolveRefAttribution } from "@/lib/ref-attribution";
import { storage, validateImage } from "@/lib/storage";
import { surveySchema } from "@/lib/validations/lead";
import type { SubmitResult } from "./submit-quote";

// TODO(sprint 3): move to a shared bookings helper once booking admin/actions
// land; for now this just keeps `bookingNumber` populated (format
// KKD-YYYYMMDD-NNN) so the schema's required/unique constraint is satisfied.
async function nextBookingNumber(): Promise<string> {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const prefix = `KKD-${datePart}-`;
  const todaysCount = await prisma.surveyBooking.count({
    where: { bookingNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(todaysCount + 1).padStart(3, "0")}`;
}

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
    province: formData.get("province"),
    buildingType: formData.get("buildingType"),
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

  const ext = slip.name.slice(slip.name.lastIndexOf(".")).toLowerCase();
  const slipKey = `private/slips/${createId()}${ext}`;
  await storage.put(slipKey, Buffer.from(await slip.arrayBuffer()), {
    contentType: slip.type,
  });

  const bookingNumber = await nextBookingNumber();
  const { autoSourceChannelId, autoSourceExecutiveId } =
    await resolveRefAttribution();
  const lead = await prisma.lead.create({
    data: {
      type: "SURVEY",
      name: data.name,
      phone: data.phone,
      lineId: data.lineId || null,
      province: data.province,
      buildingType: data.buildingType,
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
