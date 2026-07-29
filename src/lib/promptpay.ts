import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/**
 * Generates a PromptPay QR code as a PNG data URL, server-side only — no
 * external network calls. `promptpayId` can be a phone number, citizen ID,
 * tax ID, or e-Wallet ID per the promptpay-qr package.
 */
export async function generatePromptPayQrDataUrl(
  promptpayId: string
): Promise<string> {
  const payload = generatePayload(promptpayId, {});
  return QRCode.toDataURL(payload, { margin: 1, width: 240 });
}
