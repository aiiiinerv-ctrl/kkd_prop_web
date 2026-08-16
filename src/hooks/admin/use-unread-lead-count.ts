import { useQuery } from "@tanstack/react-query";

type UnreadLeadCountResponse = {
  count: number;
};

// Polls so the sidebar badge reflects new leads without the admin needing
// to refresh or navigate into /admin/leads — in-app substitute for the
// LINE/email notifications blocked on a customer API key (see AGENTS.md
// notification fan-out note).
export function useUnreadLeadCount() {
  return useQuery<UnreadLeadCountResponse>({
    queryKey: ["admin-leads-unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/admin/leads/unread-count");
      if (!res.ok) throw new Error("Failed to load unread lead count");
      return res.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
