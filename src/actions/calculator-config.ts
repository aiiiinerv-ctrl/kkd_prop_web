"use server";

import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { calculatorConfigAuditView, calculatorParamsToSeedData } from "@/lib/calculator-config";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";
import { prisma } from "@/lib/db";
import { calculatorConfigSchema } from "@/lib/validations/calculator-config";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "./users";

const calculatorConfig = auditedEntity({
  entityType: "CalculatorConfig",
  model: (client) => client.calculatorConfig,
  // Hybrid rows hold per-brand prices — project to a row count (see calculatorConfigAuditView).
  snapshot: calculatorConfigAuditView,
  revalidate: () => [
    "/admin/pages/calculator",
    "/th/calculator",
    "/en/calculator",
  ],
});

function parseConfig(formData: FormData) {
  return calculatorConfigSchema.safeParse({
    annualSavingMonthsMultiplier: formData.get("annualSavingMonthsMultiplier"),
    minBill: formData.get("minBill"),
    maxBill: formData.get("maxBill"),
    stepBill: formData.get("stepBill"),
  });
}

export async function updateCalculatorConfig(
  formData: FormData
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN");

  const parsed = parseConfig(formData);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง";
    return { ok: false, error: msg };
  }

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const existing = await prisma.calculatorConfig.findFirst();
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if (existing.version !== expectedVersion) {
    return { ok: false, conflict: true };
  }

  // The check above is only a fast path; the real guard is the conditional
  // version increment inside the write's transaction.
  let updated;
  try {
    updated = await calculatorConfig.updateVersioned(existing.id, expectedVersion, {
      annualSavingMonthsMultiplier: parsed.data.annualSavingMonthsMultiplier,
      minBill: parsed.data.minBill,
      maxBill: parsed.data.maxBill,
      stepBill: parsed.data.stepBill,
    });
  } catch {
    return { ok: false, error: "บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if ("conflict" in updated) return { ok: false, conflict: true };

  return { ok: true };
}

export async function resetCalculatorConfigToDefaults(): Promise<
  ActionResult | { ok: false; conflict: true }
> {
  await requireRole("ADMIN");

  const existing = await prisma.calculatorConfig.findFirst();
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  // The reset button sends no version (the UI contract is unchanged), so the
  // lock is against the version read just above: a table save/apply or config
  // save that commits between this read and the write still conflicts
  // atomically instead of being silently overwritten.
  const defaults = calculatorParamsToSeedData(CALCULATOR_DEFAULTS);
  let updated;
  try {
    updated = await calculatorConfig.updateVersioned(existing.id, existing.version, {
      ...defaults,
      sizeTable: Prisma.JsonNull,
      sizeTableImportId: null,
      hybridSizeTable: Prisma.JsonNull,
    });
  } catch {
    return { ok: false, error: "คืนค่าไม่สำเร็จ — ลองใหม่อีกครั้ง" };
  }
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if ("conflict" in updated) return { ok: false, conflict: true };

  return { ok: true };
}
