import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type LeadFilters = {
  page: number;
  type: string;
  status: string;
  channelId: string;
  search: string;
};

export type LeadListItem = {
  id: string;
  type: "QUOTE" | "SURVEY";
  status: "NEW" | "CONTACTED" | "QUOTED" | "WON" | "LOST";
  name: string;
  phone: string;
  province: string;
  buildingType: string;
  avgMonthlyBill: number | null;
  createdAt: string;
  booking: { paymentStatus: string; preferredDate: string } | null;
  sourceChannel: { nameTh: string } | null;
};

type LeadListResponse = {
  leads: LeadListItem[];
  total: number;
  page: number;
  pageCount: number;
};

export function useLeads(filters: LeadFilters) {
  return useQuery<LeadListResponse>({
    queryKey: ["admin-leads", filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      if (filters.type) params.set("type", filters.type);
      if (filters.status) params.set("status", filters.status);
      if (filters.channelId) params.set("channelId", filters.channelId);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/admin/leads?${params}`);
      if (!res.ok) throw new Error("Failed to load leads");
      return res.json();
    },
  });
}
