// Regression check for the Lead intake module's pure surface: the shared
// quote/survey schemas in src/lib/validations/lead.ts (the single validation
// interface used by both the booking form's zodResolver and the submit
// actions) and the capacity rule in src/lib/bookings/capacity.ts. No test
// runner in this repo — see AGENTS.md — so this is a standalone assertion
// script instead of a jest/vitest suite. No server or DB needed.
// Usage: npx tsx scripts/verify-lead-intake.mts
import "dotenv/config";
import { exceedsCapacity } from "../src/lib/bookings/capacity";
import {
  quoteSchema,
  surveySchema,
  zodFieldErrors,
} from "../src/lib/validations/lead";

let failed = false;

function assertEqual(
  label: string,
  actual: number | string | boolean | null | undefined,
  expected: number | string | boolean | null | undefined
) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${label}: got ${actual}, expected ${expected}`);
  if (!ok) failed = true;
}

const validBase = {
  name: "ทดสอบ สคริปต์",
  phone: "081-234-5678",
  province: "กรุงเทพมหานคร",
  buildingType: "RESIDENTIAL",
};

console.log("=== quoteSchema: phone normalization (the old client/server divergence) ===");
{
  const parsed = quoteSchema.safeParse(validBase);
  assertEqual("dashed phone accepted", parsed.success, true);
  if (parsed.success) {
    assertEqual("phone stripped to digits", parsed.data.phone, "0812345678");
    assertEqual("locale defaulted to th", parsed.data.locale, "th");
  }
}
{
  // 12 chars incl. separators passed the old client regex but never the server
  const parsed = quoteSchema.safeParse({ ...validBase, phone: "0 12-345-67890" });
  assertEqual("11-digit phone rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("phone error code", zodFieldErrors(parsed.error).phone, "invalid_phone");
  }
}
{
  const parsed = quoteSchema.safeParse({ ...validBase, phone: "12345" });
  assertEqual("non-leading-zero phone rejected", parsed.success, false);
}

console.log("\n=== quoteSchema: field-level error codes ===");
{
  const parsed = quoteSchema.safeParse({ ...validBase, name: "ก" });
  assertEqual("1-char name rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("name error code", zodFieldErrors(parsed.error).name, "too_short");
  }
}
{
  const parsed = quoteSchema.safeParse({ ...validBase, name: "ก".repeat(121) });
  assertEqual("121-char name rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("name error code", zodFieldErrors(parsed.error).name, "too_long");
  }
}
{
  const parsed = quoteSchema.safeParse({ ...validBase, buildingType: "OTHER" });
  assertEqual("OTHER without free text rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual(
      "buildingTypeOtherText error code",
      zodFieldErrors(parsed.error).buildingTypeOtherText,
      "required"
    );
  }
}
{
  const parsed = quoteSchema.safeParse({
    ...validBase,
    buildingType: "OTHER",
    buildingTypeOtherText: "โกดัง",
  });
  assertEqual("OTHER with free text accepted", parsed.success, true);
}

console.log("\n=== quoteSchema: avgMonthlyBill empty-select guard ===");
{
  const parsed = quoteSchema.safeParse({ ...validBase, avgMonthlyBill: "" });
  assertEqual("empty bill accepted", parsed.success, true);
  if (parsed.success) {
    // "" must mean "not answered", not z.coerce's Number("") === 0
    assertEqual("empty bill is undefined", parsed.data.avgMonthlyBill, undefined);
  }
}
{
  const parsed = quoteSchema.safeParse({ ...validBase, avgMonthlyBill: "7500" });
  assertEqual("bucket bill coerced", parsed.success && parsed.data.avgMonthlyBill === 7500, true);
}

console.log("\n=== surveySchema: survey-only fields ===");
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];
const validSurvey = {
  ...validBase,
  address: "123/45 หมู่บ้านทดสอบ ถนนสุขุมวิท",
  preferredDate: tomorrow,
  timeSlot: "MORNING",
};
{
  const parsed = surveySchema.safeParse(validSurvey);
  assertEqual("valid survey accepted", parsed.success, true);
}
{
  const parsed = surveySchema.safeParse({ ...validSurvey, address: "123456789" });
  assertEqual("9-char address rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("address error code", zodFieldErrors(parsed.error).address, "too_short");
  }
}
{
  const parsed = surveySchema.safeParse({ ...validSurvey, preferredDate: "" });
  assertEqual("empty date rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("date error code", zodFieldErrors(parsed.error).preferredDate, "required");
  }
}
{
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
  const parsed = surveySchema.safeParse({ ...validSurvey, preferredDate: twoDaysAgo });
  assertEqual("past date rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("date error code", zodFieldErrors(parsed.error).preferredDate, "invalid_date");
  }
}
{
  const parsed = surveySchema.safeParse({ ...validSurvey, timeSlot: "" });
  assertEqual("empty time slot rejected", parsed.success, false);
  if (!parsed.success) {
    assertEqual("timeSlot error code", zodFieldErrors(parsed.error).timeSlot, "required");
  }
}

console.log("\n=== exceedsCapacity: day/slot boundaries (defaults maxPerDay=4, maxPerSlot=2) ===");
const caps = { maxPerDay: 4, maxPerSlot: 2 };
assertEqual("empty day", exceedsCapacity({ dayCount: 0, slotCount: 0, ...caps }), false);
assertEqual("under both caps", exceedsCapacity({ dayCount: 3, slotCount: 1, ...caps }), false);
assertEqual("day cap reached", exceedsCapacity({ dayCount: 4, slotCount: 1, ...caps }), true);
assertEqual("slot cap reached", exceedsCapacity({ dayCount: 2, slotCount: 2, ...caps }), true);
assertEqual("both caps reached", exceedsCapacity({ dayCount: 4, slotCount: 2, ...caps }), true);

console.log(failed ? "\nFAILED — see ✗ above" : "\nAll assertions passed ✓");
process.exit(failed ? 1 : 0);
