import { z } from "zod";

/**
 * Single contract for every link into the booking page (#13 decision 4) —
 * the same shape is parsed on the receiving end in
 * src/app/[locale]/booking/page.tsx. `.strict()` plus the exported type mean
 * a typo'd key (e.g. `pkg` instead of `package`) fails `npm run build` via
 * TypeScript's excess-property check on the object literal passed to
 * `bookingHref()`, instead of silently vanishing like the old ad-hoc
 * `{ pathname: "/booking", query: {...} }` literals did.
 */
export const bookingLinkParamsSchema = z
  .object({
    tab: z.enum(["quote", "survey"]).optional(),
    bill: z.string().regex(/^\d+$/, "invalid_bill").optional(),
    package: z.string().trim().min(1).max(200).optional(),
    service: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

export type BookingLinkParams = z.infer<typeof bookingLinkParamsSchema>;

type BookingHref = "/booking" | { pathname: "/booking"; query: Record<string, string> };

/**
 * Builds an href for next-intl's `<Link>` pointing at /booking with the given
 * query params. No params (or all falsy) collapses to the plain "/booking"
 * string — per #13 decision 3, "no `tab` = quote" is the one rule, and
 * header/footer entry points intentionally don't send `tab` at all.
 */
export function bookingHref(params: BookingLinkParams = {}): BookingHref {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value) query[key] = value;
  }
  return Object.keys(query).length > 0 ? { pathname: "/booking", query } : "/booking";
}
