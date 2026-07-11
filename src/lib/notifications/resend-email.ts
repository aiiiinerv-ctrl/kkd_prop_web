import { Resend } from "resend";
import { formatLeadSummary } from "./format";
import type { NotificationProvider } from "./types";

export const resendEmailProvider: NotificationProvider = {
  name: "resend-email",

  isEnabled() {
    return Boolean(
      process.env.RESEND_API_KEY &&
        process.env.NOTIFY_EMAIL_FROM &&
        process.env.NOTIFY_EMAIL_TO
    );
  },

  async send(event) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { title, lines } = formatLeadSummary(event);

    const { error } = await resend.emails.send({
      from: process.env.NOTIFY_EMAIL_FROM!,
      to: process.env.NOTIFY_EMAIL_TO!.split(",").map((s) => s.trim()),
      subject: title,
      text: lines.join("\n"),
    });
    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }
  },
};
