import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/**
 * Legacy Services admin URL — temporary redirect to Pages (#70).
 * Auth first so unauthenticated users still hit login via requireRole/proxy.
 */
export default async function AdminServicesRedirectPage() {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  redirect("/admin/pages/services?tab=content");
}
