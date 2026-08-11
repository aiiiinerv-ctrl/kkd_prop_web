import { z } from "zod";

// Error messages are machine codes, not prose — the booking form translates
// them per-locale via `messages/{th,en}.json` (booking.err* keys). The same
// codes flow through both directions of the seam: react-hook-form's
// zodResolver on the client, and `zodFieldErrors()` on the server.
const phoneSchema = z
  .string()
  .min(1, "required")
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^0\d{8,9}$/, "invalid_phone"));

const baseLeadSchema = z.object({
  name: z.string().trim().min(2, "too_short").max(120, "too_long"),
  phone: phoneSchema,
  lineId: z.string().trim().max(80, "too_long").optional().or(z.literal("")),
  referrerName: z.string().trim().max(120, "too_long").optional().or(z.literal("")),
  province: z.string().trim().min(2, "required").max(80, "too_long"),
  buildingType: z.enum(["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "OTHER"], {
    error: "required",
  }),
  buildingTypeOtherText: z.string().trim().max(120, "too_long").optional().or(z.literal("")),
  notes: z.string().trim().max(1000, "too_long").optional().or(z.literal("")),
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
      message: "required",
    });
  }
}

export const quoteSchema = baseLeadSchema
  .extend({
    // An untouched <select> submits "" — treat it as "not answered" rather than
    // letting z.coerce turn it into 0.
    avgMonthlyBill: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.coerce.number().int().min(0).max(1_000_000).optional()
    ),
    interestedSystems: z.array(z.enum(["ON_GRID", "HYBRID", "OFF_GRID"])).optional(),
  })
  .superRefine(requireBuildingTypeOtherText);

export const surveySchema = baseLeadSchema
  .extend({
    address: z.string().trim().min(10, "too_short").max(500, "too_long"),
    preferredDate: z.coerce.date({ error: "required" }).refine(
      (d) => d.getTime() > Date.now() - 24 * 60 * 60 * 1000,
      "invalid_date"
    ),
    timeSlot: z.enum(["MORNING", "AFTERNOON"], { error: "required" }),
  })
  .superRefine(requireBuildingTypeOtherText);

export type QuoteInput = z.infer<typeof quoteSchema>;
export type SurveyInput = z.infer<typeof surveySchema>;
// What the form fields hold *before* validation (coercions/transforms not yet
// applied) — the type react-hook-form works in when driven by zodResolver.
export type QuoteFormInput = z.input<typeof quoteSchema>;
export type SurveyFormInput = z.input<typeof surveySchema>;
export type BaseLeadFormInput = z.input<typeof baseLeadSchema>;

/**
 * Collapses a zod error into one machine code per field (first issue wins).
 * Returned to the client as `fieldErrors` so the form can attach server-side
 * failures to the exact field, translated the same way as client-side ones.
 */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in fieldErrors)) {
      fieldErrors[field] = issue.message;
    }
  }
  return fieldErrors;
}
