import { z } from "zod";

/** Shared optional paired text — empty string → null after trim. */
export const optionalPageText = z
  .string()
  .trim()
  .transform((v) => v || null);

/** Required non-empty trimmed text (e.g. hero alt). */
export const requiredPageText = (message: string, max = 200) =>
  z.string().trim().min(1, message).max(max);

/**
 * Optimistic concurrency version from FormData (string → positive int).
 * Rejects missing / non-integer / non-positive values.
 */
export const pageVersionSchema = z.coerce.number().int().positive();

/** Reject HTML-ish characters in SEO/plain metadata text. */
export function plainMetaText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v), {
      message: "ต้องเป็นข้อความธรรมดา ไม่มีอักขระควบคุมหรือเครื่องหมาย < >",
    });
}

export const optionalPlainMetaText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((v) => !/[<>\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(v), {
      message: "ต้องเป็นข้อความธรรมดา ไม่มีอักขระควบคุมหรือเครื่องหมาย < >",
    })
    .transform((v) => v || null);
