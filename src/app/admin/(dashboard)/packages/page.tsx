import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/**
 * Legacy Packages admin URL — temporary redirect to Pages (#71).
 */
export default async function AdminPackagesRedirectPage() {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  redirect("/admin/pages/packages?tab=content");
}
