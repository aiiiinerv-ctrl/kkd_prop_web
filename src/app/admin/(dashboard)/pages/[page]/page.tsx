import { notFound } from "next/navigation";
import { getPage, isPageKey } from "@/lib/pages";

type PageParams = { page: string };

/**
 * Canonical dynamic Pages admin route (#67).
 * Fail closed for unknown keys and for registered keys whose Content UI
 * is not enabled yet (all except home). Home keeps a dedicated
 * `pages/home/` route so existing deep links stay stable.
 */
export default async function AdminPagesDynamicPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { page } = await params;
  if (!isPageKey(page)) notFound();

  const entry = getPage(page);
  if (!entry.adminContentEnabled) notFound();

  // Home is served by the sibling `pages/home` segment — avoid dual UI.
  if (page === "home") notFound();

  notFound();
}
