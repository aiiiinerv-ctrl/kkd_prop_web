import { formatLeadSummary } from "./format";
import type { NotificationProvider } from "./types";

// Pushes via the LINE Messaging API (through the company's LINE OA).
// LINE Notify was discontinued in April 2025 and cannot be used.
export const linePushProvider: NotificationProvider = {
  name: "line-push",

  isEnabled() {
    return Boolean(
      process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_NOTIFY_TO
    );
  },

  async send(event) {
    const { title, lines } = formatLeadSummary(event);
    const text = [title, ...lines].join("\n");
    const recipients = process.env.LINE_NOTIFY_TO!.split(",").map((s) => s.trim());

    for (const to of recipients) {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
      });
      if (!res.ok) {
        throw new Error(`LINE push failed (${res.status}): ${await res.text()}`);
      }
    }
  },
};
