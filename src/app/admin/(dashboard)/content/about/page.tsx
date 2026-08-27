import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/**
 * Legacy About admin URL — temporary 307 to Pages (#69).
 * Auth first so unauthenticated users still hit login via requireRole/proxy.
 */
export default async function ContentAboutRedirectPage() {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  redirect("/admin/pages/about?tab=content");
}
