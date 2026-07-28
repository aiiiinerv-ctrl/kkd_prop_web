import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SettingsClient } from "./settings-client";

export default async function SettingsPage() {
  await requireRole("ADMIN");

  // The seed script always creates this singleton row; fall back to the
  // schema defaults only for the defensive/unlikely case it's missing.
  const setting = await prisma.bookingCapacitySetting.findFirst();

  return (
    <SettingsClient
      setting={{
        maxPerDay: setting?.maxPerDay ?? 4,
        maxPerSlot: setting?.maxPerSlot ?? 2,
      }}
    />
  );
}
