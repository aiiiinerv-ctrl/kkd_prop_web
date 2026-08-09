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
  referrerName: z.string().trim().max(120).optional().or(z.literal("")),
  province: z.string().trim().min(2).max(80),
  buildingType: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "OTHER"]),
  buildingTypeOtherText: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  sourceChannelId: z.string().trim().optional().or(z.literal("")),
  locale: z.enum(["th", "en"]).default("th"),
});

// Shared across quote/survey: buildingTypeOtherText is required only when
// buildingType === "OTHER". zod's `.extend()` returns a plain ZodObject
// (not chainable off a `.superRefine()`-wrapped ZodEffects), so this check
// is applied once per concrete schema below rather than on baseLeadSchema
// itself.
function requireBuildingTypeOtherText(
  data: { buildingType: string; buildingTypeOtherText?: string },
  ctx: z.RefinementCtx
) {
  if (data.buildingType === "OTHER" && !data.buildingTypeOtherText) {
    ctx.addIssue({
      code: "custom",
      path: ["buildingTypeOtherText"],
      message: "Required when buildingType is OTHER",
    });
  }
}

export const quoteSchema = baseLeadSchema
  .extend({
    avgMonthlyBill: z.coerce.number().int().min(0).max(1_000_000).optional(),
    interestedSystems: z.array(z.enum(["ON_GRID", "HYBRID", "OFF_GRID"])).optional(),
  })
  .superRefine(requireBuildingTypeOtherText);

export const surveySchema = baseLeadSchema
  .extend({
    address: z.string().trim().min(10).max(500),
    preferredDate: z.coerce.date().refine(
      (d) => d.getTime() > Date.now() - 24 * 60 * 60 * 1000,
      "Date must be in the future"
    ),
    timeSlot: z.enum(["MORNING", "AFTERNOON"]),
  })
  .superRefine(requireBuildingTypeOtherText);

export type QuoteInput = z.infer<typeof quoteSchema>;
export type SurveyInput = z.infer<typeof surveySchema>;
