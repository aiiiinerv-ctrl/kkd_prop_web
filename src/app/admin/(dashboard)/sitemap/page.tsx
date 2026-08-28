import { loadSitemapConfigForAdmin } from "@/actions/sitemap-settings";
import { requireRole } from "@/lib/auth";
import type { Role } from "@/lib/auth";
import { buildPublicSitemapTree } from "@/lib/sitemap/public-tree";
import { SitemapAdminClient } from "./sitemap-client";

export default async function AdminSitemapPage() {
  const session = await requireRole(
    "ADMIN",
    "SALES",
    "MARKETING",
    "EDITOR",
    "FINANCE",
    "EXECUTIVE",
    "CHANNEL_EXECUTIVE"
  );
  const role = session.user.role as Role;
  const canMutate = role === "ADMIN" || role === "MARKETING";
  const config = await loadSitemapConfigForAdmin();
  const initialPreviewGroups = await buildPublicSitemapTree("th", config);

  return (
    <SitemapAdminClient
      initialConfig={config}
      initialPreviewGroups={initialPreviewGroups}
      canMutate={canMutate}
    />
  );
}
