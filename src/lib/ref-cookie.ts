// Shared between src/proxy.ts (edge middleware, no Prisma access) and
// server actions that resolve the cookie to a PromoChannel/ChannelExecutive.
export const REF_COOKIE = "kkd_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
