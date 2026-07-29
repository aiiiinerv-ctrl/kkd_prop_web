import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireRole("ADMIN");

  // The seed script always creates these singleton rows; fall back to the
  // schema defaults only for the defensive/unlikely case they're missing.
  const [setting, paymentSettings] = await Promise.all([
    prisma.bookingCapacitySetting.findFirst(),
    prisma.paymentSettings.findFirst(),
  ]);

  return (
    <SettingsClient
      setting={{
        maxPerDay: setting?.maxPerDay ?? 4,
        maxPerSlot: setting?.maxPerSlot ?? 2,
      }}
      paymentSettings={{
        promptpayId: paymentSettings?.promptpayId ?? "",
        bankName: paymentSettings?.bankName ?? "",
        bankAccountNumber: paymentSettings?.bankAccountNumber ?? "",
        bankAccountName: paymentSettings?.bankAccountName ?? "",
      }}
    />
  );
}
