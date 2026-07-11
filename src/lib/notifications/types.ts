import type { Lead, SurveyBooking } from "@/generated/prisma/client";

export type LeadNotification = {
  kind: "QUOTE" | "SURVEY";
  lead: Lead;
  booking?: SurveyBooking;
};

export interface NotificationProvider {
  name: string;
  isEnabled(): boolean;
  send(event: LeadNotification): Promise<void>;
}
