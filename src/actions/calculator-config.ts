"use server";

import { auditedEntity } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { calculatorParamsToSeedData } from "@/lib/calculator-config";
import { CALCULATOR_DEFAULTS } from "@/lib/calculator";
import { prisma } from "@/lib/db";
import { calculatorConfigPhaseASchema } from "@/lib/validations/calculator-config";
import type { ActionResult } from "./users";

const calculatorConfig = auditedEntity({
  entityType: "CalculatorConfig",
  model: (client) => client.calculatorConfig,
  snapshot: "full",
  revalidate: () => [
    "/admin/pages/calculator",
    "/th/calculator",
    "/en/calculator",
  ],
});

function parsePhaseA(formData: FormData) {
  return calculatorConfigPhaseASchema.safeParse({
    sunHoursPerDay: formData.get("sunHoursPerDay"),
    pricePerKwhThb: formData.get("pricePerKwhThb"),
    annualSavingMonthsMultiplier: formData.get("annualSavingMonthsMultiplier"),
  });
}

export async function updateCalculatorConfig(
  formData: FormData
): Promise<ActionResult | { ok: false; conflict: true }> {
  await requireRole("ADMIN");

  const parsed = parsePhaseA(formData);
  if (!parsed.success) return { ok: false, error: "ข้อมูลไม่ถูกต้อง" };

  const expectedVersion = Number(formData.get("version"));
  if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
    return { ok: false, error: "เวอร์ชันไม่ถูกต้อง" };
  }

  const existing = await prisma.calculatorConfig.findFirst();
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };
  if (existing.version !== expectedVersion) {
    return { ok: false, conflict: true };
  }

  const updated = await calculatorConfig.update(existing.id, {
    sunHoursPerDay: parsed.data.sunHoursPerDay,
    pricePerKwhThb: parsed.data.pricePerKwhThb,
    annualSavingMonthsMultiplier: parsed.data.annualSavingMonthsMultiplier,
    version: existing.version + 1,
  });
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}

export async function resetCalculatorConfigToDefaults(): Promise<
  ActionResult | { ok: false; conflict: true }
> {
  await requireRole("ADMIN");

  const existing = await prisma.calculatorConfig.findFirst();
  if (!existing) return { ok: false, error: "ไม่พบการตั้งค่า" };

  const defaults = calculatorParamsToSeedData(CALCULATOR_DEFAULTS);
  const updated = await calculatorConfig.update(existing.id, {
    ...defaults,
    version: existing.version + 1,
  });
  if (!updated) return { ok: false, error: "ไม่พบการตั้งค่า" };

  return { ok: true };
}
