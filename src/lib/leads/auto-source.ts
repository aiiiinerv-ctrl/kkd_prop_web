/**
 * Display rules for a Lead's automatic attribution (the `?ref=` link the
 * customer arrived through), shared by the leads list and the lead detail
 * page so the two never drift apart.
 */

export type AutoSourceRelations = {
  autoSourceExecutive: { refCode: string; name: string } | null;
  autoSourceChannel: { refCode: string; nameTh: string } | null;
};

/**
 * The executive's refCode is the one the customer actually clicked
 * (resolveRefAttribution() matches ChannelExecutive before PromoChannel), so
 * it wins over the channel-level code.
 */
export function resolveAutoSource(lead: AutoSourceRelations): {
  refCode: string | null;
  name: string | null;
} {
  return {
    refCode: lead.autoSourceExecutive?.refCode ?? lead.autoSourceChannel?.refCode ?? null,
    name: lead.autoSourceExecutive?.name ?? lead.autoSourceChannel?.nameTh ?? null,
  };
}

export function formatAutoSource(refCode: string | null, name: string | null): string {
  if (!refCode) return "เข้าโดยตรง";
  return name ? `${refCode} - ${name}` : refCode;
}

export function formatLeadAutoSource(lead: AutoSourceRelations): string {
  const { refCode, name } = resolveAutoSource(lead);
  return formatAutoSource(refCode, name);
}
