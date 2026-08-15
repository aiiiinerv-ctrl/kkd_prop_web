import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { REF_COOKIE } from "@/lib/ref-cookie";

export type RefAttribution = {
  autoSourceChannelId: string | null;
  autoSourceExecutiveId: string | null;
};

const DIRECT: RefAttribution = {
  autoSourceChannelId: null,
  autoSourceExecutiveId: null,
};

/**
 * Resolves the `kkd_ref` cookie (set by src/proxy.ts from a `?ref=` promo
 * link) to a PromoChannel and/or ChannelExecutive, to be attached to a Lead
 * at submit time. If there's no cookie or it doesn't match anything, both
 * fields stay null, which the leads UI renders as "เข้าโดยตรง" (direct).
 * The executive's name (if any) is also surfaced to the customer, prefilled
 * into the booking form's "ผู้แนะนำ" field — see resolveRefReferrerName below.
 */
export async function resolveRefAttribution(): Promise<RefAttribution> {
  const jar = await cookies();
  const ref = jar.get(REF_COOKIE)?.value?.trim();
  if (!ref) return DIRECT;

  const executive = await prisma.channelExecutive.findUnique({
    where: { refCode: ref },
    select: { id: true, channelId: true },
  });
  if (executive) {
    return {
      autoSourceChannelId: executive.channelId,
      autoSourceExecutiveId: executive.id,
    };
  }

  const channel = await prisma.promoChannel.findUnique({
    where: { refCode: ref },
    select: { id: true },
  });
  if (channel) {
    return { autoSourceChannelId: channel.id, autoSourceExecutiveId: null };
  }

  return DIRECT;
}

/**
 * Resolves the `kkd_ref` cookie to a ChannelExecutive's name, to prefill the
 * booking form's "ผู้แนะนำ" (referrer) field. Only fills in when the ref code
 * matches a ChannelExecutive — a channel-only ref code (e.g. a Facebook page
 * link) has no person to name, and that attribution is already captured via
 * autoSourceChannelId, so this returns "" for it.
 */
export async function resolveRefReferrerName(): Promise<string> {
  const jar = await cookies();
  const ref = jar.get(REF_COOKIE)?.value?.trim();
  if (!ref) return "";

  const executive = await prisma.channelExecutive.findUnique({
    where: { refCode: ref },
    select: { name: true },
  });
  return executive?.name ?? "";
}
