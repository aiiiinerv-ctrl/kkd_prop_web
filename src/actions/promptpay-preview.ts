"use server";

import { requireRole } from "@/lib/auth";
import { generatePromptPayQrDataUrl } from "@/lib/promptpay";

export type PromptPayPreviewResult =
  | { ok: true; dataUrl: string }
  | { ok: false; error: string };

// ADMIN-only preview helper for the settings form's "live" QR preview —
// separate from getPaymentSettings()/updatePaymentSettings() because it
// never touches the DB, it just renders whatever PromptPay ID is currently
// typed into the (unsaved) form field.
export async function previewPromptPayQr(
  promptpayId: string
): Promise<PromptPayPreviewResult> {
  await requireRole("ADMIN");
  if (!promptpayId.trim()) {
    return { ok: false, error: "กรุณากรอก PromptPay ID" };
  }
  try {
    const dataUrl = await generatePromptPayQrDataUrl(promptpayId.trim());
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "PromptPay ID ไม่ถูกต้อง" };
  }
}
