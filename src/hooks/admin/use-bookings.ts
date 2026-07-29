import { keepPreviousData, useQuery } from "@tanstack/react-query";

export type BookingFilters = {
  page: number;
  status: string;
  paymentStatus: string;
  search: string;
};

export type BookingListItem = {
  id: string;
  bookingNumber: string;
  status:
    | "PENDING_CONFIRMATION"
    | "CONFIRMED"
    | "PREPARED"
    | "SURVEYED"
    | "DESIGNED"
    | "SIGNED"
    | "CANCELLED";
  preferredDate: string;
  timeSlot: "MORNING" | "AFTERNOON";
  paymentStatus: "PENDING_REVIEW" | "VERIFIED" | "REJECTED";
  giftSent: boolean;
  lead: { name: string; phone: string; province: string };
  assignedEngineer: { id: string; name: string } | null;
  assignedSales: { id: string; name: string } | null;
};

type BookingListResponse = {
  bookings: BookingListItem[];
  total: number;
  page: number;
  pageCount: number;
};

export function useBookings(filters: BookingFilters) {
  return useQuery<BookingListResponse>({
    queryKey: ["admin-bookings", filters],
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(filters.page));
      if (filters.status) params.set("status", filters.status);
      if (filters.paymentStatus) params.set("paymentStatus", filters.paymentStatus);
      if (filters.search) params.set("search", filters.search);
      const res = await fetch(`/api/admin/bookings?${params}`);
      if (!res.ok) throw new Error("Failed to load bookings");
      return res.json();
    },
  });
}
