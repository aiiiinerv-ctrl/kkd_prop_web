import { z } from "zod";

const phoneSchema = z
  .string()
  .min(1)
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^0\d{8,9}$/, "Invalid Thai phone number"));

const baseLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  lineId: z.string().trim().max(80).optional().or(z.literal("")),
  province: z.string().trim().min(2).max(80),
  buildingType: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL"]),
  sourceChannelId: z.string().trim().optional().or(z.literal("")),
  locale: z.enum(["th", "en"]).default("th"),
});

export const quoteSchema = baseLeadSchema.extend({
  avgMonthlyBill: z.coerce.number().int().min(0).max(1_000_000).optional(),
});

export const surveySchema = baseLeadSchema.extend({
  address: z.string().trim().min(10).max(500),
  preferredDate: z.coerce.date().refine(
    (d) => d.getTime() > Date.now() - 24 * 60 * 60 * 1000,
    "Date must be in the future"
  ),
  timeSlot: z.enum(["MORNING", "AFTERNOON"]),
});

export type QuoteInput = z.infer<typeof quoteSchema>;
export type SurveyInput = z.infer<typeof surveySchema>;
