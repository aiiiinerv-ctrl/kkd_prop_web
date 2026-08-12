"use server";

import { z } from "zod";
import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ActionResult } from "./users";

const paymentSettingsSchema = z.object({
  promptpayId: z.string().trim().max(20).optional().or(z.literal("")),
  bankName: z.string().trim().max(120).optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().max(40).optional().or(z.literal("")),
  bankAccountName: z.string().trim().max(120).optional().or(z.literal("")),
});

const paymentSettings = auditedEntity({
  entityType: "PaymentSettings",
  model: (client) => client.paymentSettings,
  snapshot: "full",
  revalidate: () => ["/admin/settings", "/th/booking", "/en/booking"],
});

export async function updatePaymentSettings(formData: FormData): Promise<ActionResult> {
  await requireRole("ADMIN");

  const parsed = paymentSettingsSchema.safeParse({
    promptpayId: formData.get("promptpayId") ?? "",
    bankName: formData.get("bankName") ?? "",
    bankAccountNumber: formData.get("bankAccountNumber") ?? "",
    bankAccountName: formData.get("bankAccountName") ?? "",
  });
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  // Single-row settings table: find the row's id, then mutate it by id like
  // any other entity.
  const existing = await prisma.paymentSettings.findFirst({ select: { id: true } });
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const updated = await paymentSettings.update(existing.id, {
    promptpayId: parsed.data.promptpayId || null,
    bankName: parsed.data.bankName || null,
    bankAccountNumber: parsed.data.bankAccountNumber || null,
    bankAccountName: parsed.data.bankAccountName || null,
  });
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}
