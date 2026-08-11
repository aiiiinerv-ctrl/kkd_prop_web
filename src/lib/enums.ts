import { z } from "zod";
import {
  BookingStatus,
  BuildingType,
  ChannelType,
  LeadStatus,
  LeadType,
  PaymentStatus,
  Role,
  ServiceKind,
  TimeSlot,
} from "@/generated/prisma/enums";

/**
 * Enum values derived from the Prisma schema rather than transcribed. Adding a
 * value to schema.prisma now reaches every status filter, whitelist and zod
 * enum through here — and `enum-labels.ts` fails to compile until the new value
 * has a label, so there is no way to add one and silently render a raw code.
 *
 * Order is the schema's declaration order, which is also the pipeline order the
 * admin dropdowns read in (NEW → ASSIGNED → …); don't reorder the schema
 * without checking how those lists look.
 *
 * Runtime module — server-side callers. Client components should import from
 * `enum-labels.ts`, which is type-only and so ships nothing generated.
 */

export const LEAD_STATUSES = Object.values(LeadStatus);
export const LEAD_TYPES = Object.values(LeadType);
export const BOOKING_STATUSES = Object.values(BookingStatus);
export const PAYMENT_STATUSES = Object.values(PaymentStatus);
export const TIME_SLOTS = Object.values(TimeSlot);
export const BUILDING_TYPES = Object.values(BuildingType);
export const ROLES = Object.values(Role);
export const CHANNEL_TYPES = Object.values(ChannelType);
export const SERVICE_KINDS = Object.values(ServiceKind);

/**
 * A zod enum over a schema enum's values. Prisma gives us a readonly string[]
 * and z.enum wants a non-empty tuple, hence the assertion — the values come
 * from a generated enum, so the array is never actually empty.
 */
export function zodEnum<T extends string>(values: readonly T[]) {
  return z.enum(values as unknown as [T, ...T[]]);
}
