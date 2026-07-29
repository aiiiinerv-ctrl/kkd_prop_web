"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { withAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./users";

// No requireRole here — the public /booking page (an RSC) reads this
// directly, it isn't a form-submitting server action. requireRole only
// guards the mutation below.
export async function getPaymentSettings() {
  return prisma.paymentSettings.findFirst();
}

const paymentSettingsSchema = z.object({
  promptpayId: z.string().trim().max(20).optional().or(z.literal("")),
  bankName: z.string().trim().max(120).optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().max(40).optional().or(z.literal("")),
  bankAccountName: z.string().trim().max(120).optional().or(z.literal("")),
});

export async function updatePaymentSettings(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("ADMIN");

  const parsed = paymentSettingsSchema.safeParse({
    promptpayId: formData.get("promptpayId") ?? "",
    bankName: formData.get("bankName") ?? "",
    bankAccountNumber: formData.get("bankAccountNumber") ?? "",
    bankAccountName: formData.get("bankAccountName") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const before = await prisma.paymentSettings.findFirst();
  if (!before) return { ok: false, error: "ไม่พบการตั้งค่า" };

  await withAudit({
    actorId: session.user.id,
    action: "UPDATE",
    entityType: "PaymentSettings",
    before,
    run: () =>
      prisma.paymentSettings.update({
        where: { id: before.id },
        data: {
          promptpayId: parsed.data.promptpayId || null,
          bankName: parsed.data.bankName || null,
          bankAccountNumber: parsed.data.bankAccountNumber || null,
          bankAccountName: parsed.data.bankAccountName || null,
        },
      }),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/th/booking");
  revalidatePath("/en/booking");
  return { ok: true };
}
