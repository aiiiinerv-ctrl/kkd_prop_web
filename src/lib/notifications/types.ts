import type { Lead, SurveyBooking } from "@/generated/prisma/client";

export type LeadNotification = {
  kind: "QUOTE" | "SURVEY";
  lead: Lead;
  booking?: SurveyBooking;
  // Resolved by the caller (submit-quote.ts / submit-survey-booking.ts) via
  // effectiveChannel() — a plain string rather than widening `lead` with
  // relation fields, since format.ts only needs the display name, not the
  // channel record. Undefined when the lead has no channel attribution at
  // all (direct traffic) — the "แสดงเฉพาะเมื่อมีค่า" line pattern hides it.
  channelName?: string;
};

export interface NotificationProvider {
  name: string;
  isEnabled(): boolean;
  send(event: LeadNotification): Promise<void>;
}
