import { linePushProvider } from "./line-push";
import { resendEmailProvider } from "./resend-email";
import type { LeadNotification } from "./types";

const providers = [resendEmailProvider, linePushProvider];

/**
 * Fans a new-lead event out to every configured channel. Never throws —
 * it is called after the lead row is committed, and a notification outage
 * must not surface as a form error or lose the lead.
 */
export async function notifyNewLead(event: LeadNotification): Promise<void> {
  const enabled = providers.filter((p) => p.isEnabled());
  if (enabled.length === 0) {
    console.info("[notifications] no providers configured, skipping");
    return;
  }

  const results = await Promise.allSettled(enabled.map((p) => p.send(event)));
  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[notifications] ${enabled[i].name} failed:`, result.reason);
    }
  });
}

export type { LeadNotification } from "./types";
