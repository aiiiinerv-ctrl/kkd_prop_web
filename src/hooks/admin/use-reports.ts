import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type ReportFilters = {
  from: string; // "" or "YYYY-MM-DD"
  to: string;
  channelId: string;
  executiveId: string;
  salesId: string;
};

export type ReportAggregate = {
  totalLeads: number;
  totalBookings: number;
  totalConfirmedBookings: number;
  totalRevenueThb: number;
  leadStatusBreakdown: { status: string; label: string; count: number }[];
  bookingStatusBreakdown: { status: string; label: string; count: number }[];
  channelBreakdown: {
    channelId: string | null;
    channelName: string;
    leadCount: number;
    bookingCount: number;
    confirmedBookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  }[];
  executiveBreakdown: {
    executiveId: string;
    executiveName: string;
    channelName: string;
    leadCount: number;
    bookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  }[];
  salesBreakdown: {
    salesId: string;
    salesName: string;
    leadCount: number;
    bookingCount: number;
    revenueThb: number;
    closedLeadCount: number;
    closeRatePercent: number;
  }[];
};

export function reportFiltersToParams(filters: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.channelId) params.set("channelId", filters.channelId);
  if (filters.executiveId) params.set("executiveId", filters.executiveId);
  if (filters.salesId) params.set("salesId", filters.salesId);
  return params;
}

export function useReportSummary(filters: ReportFilters) {
  return useQuery<ReportAggregate>({
    queryKey: ["admin-reports-summary", filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = reportFiltersToParams(filters);
      const res = await fetch(`/api/admin/reports/summary?${params}`);
      if (!res.ok) throw new Error("Failed to load report summary");
      return res.json();
    },
  });
}
