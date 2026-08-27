import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

/**
 * Legacy Portfolio admin URL — temporary redirect to Pages (#72).
 */
export default async function AdminPortfolioRedirectPage() {
  await requireRole("ADMIN", "SALES", "MARKETING", "EDITOR");
  redirect("/admin/pages/portfolio?tab=content");
}
