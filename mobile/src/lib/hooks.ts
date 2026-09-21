import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiFetch, apiGet, apiPost } from "./api"
import type {
  AdminCheckInData,
  AdminFacilityBooking,
  AdminGHBooking,
  AdminTicketSummary,
  Announcement,
  BilikState,
  ChatSnapshot,
  CheckInLookup,
  CheckInOverview,
  CheckInScan,
  CheckInSubmit,
  Destination,
  EcardData,
  Facility,
  GHAvailability,
  GuestHouse,
  Guide,
  HelpdeskListData,
  HelpdeskThread,
  LostFoundItem,
  MyBookings,
  Office,
  Panorama,
  ResidentHome,
  SosData,
} from "./types"

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiGet<{ announcements: Announcement[] }>("/announcements"),
  })
}

export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: () => apiGet<{ home: ResidentHome | null }>("/home"),
  })
}

export function useSos() {
  return useQuery({
    queryKey: ["sos"],
    queryFn: () => apiGet<SosData>("/sos"),
  })
}

export function useEcard() {
  return useQuery({
    queryKey: ["ecard"],
    queryFn: () => apiGet<EcardData>("/ecard"),
  })
}

export function useGuides() {
  return useQuery({
    queryKey: ["guides"],
    queryFn: () => apiGet<{ guides: Guide[] }>("/guides"),
  })
}

export function useHelpdesk() {
  return useQuery({
    queryKey: ["helpdesk"],
    queryFn: () => apiGet<HelpdeskListData>("/helpdesk"),
  })
}

export function useHelpdeskThread(id: string | undefined) {
  return useQuery({
    queryKey: ["helpdesk", id],
    queryFn: () => apiGet<HelpdeskThread>(`/helpdesk/${id}`),
    enabled: Boolean(id),
    refetchInterval: 5000,
  })
}

export function useChat() {
  return useQuery({
    queryKey: ["chat"],
    queryFn: () => apiGet<{ chat: ChatSnapshot }>("/chat"),
    refetchInterval: 3000,
  })
}

export function useCreateTicket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost<{ id: string }>("/helpdesk", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["helpdesk"] }),
  })
}

export function useSendReply(ticketId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message: string) =>
      apiPost(`/helpdesk/${ticketId}/messages`, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk"] })
    },
  })
}

export function useSendChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { message: string; replyToId?: string | null }) =>
      apiPost("/chat", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
  })
}

export function useToggleReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { messageId: string; emoji: string }) =>
      apiPost(`/chat/${input.messageId}/reactions`, { emoji: input.emoji }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
  })
}

export function useMarkGuideRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (guideId: string) => apiPost(`/guides/${guideId}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["guides"] }),
  })
}

export function useRegisterEcard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost("/ecard/register"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ecard"] })
      qc.invalidateQueries({ queryKey: ["home"] })
    },
  })
}

export function useCloseTicket(ticketId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost(`/helpdesk/${ticketId}/close`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk"] })
    },
  })
}

// ── Room selection ───────────────────────────────────────────────────────────
export function useBilik() {
  return useQuery({
    queryKey: ["bilik"],
    queryFn: () => apiGet<{ state: BilikState }>("/bilik"),
  })
}

export function useSubmitApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { type: string; roommateMatricId?: string }) => apiPost("/bilik", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bilik"] }),
  })
}

export function useWithdrawApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost("/bilik/withdraw"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bilik"] }),
  })
}

export function useRespondRoommate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (response: "approved" | "rejected") => apiPost("/bilik/roommate", { response }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bilik"] }),
  })
}

export function checkRoommate(matricId: string) {
  return apiPost<{ ok: boolean; race?: string | null; religion?: string | null; error?: string }>(
    "/bilik/check-roommate",
    { matricId }
  )
}

// ── Bookings ─────────────────────────────────────────────────────────────────
export function useFacilities() {
  return useQuery({
    queryKey: ["facilities"],
    queryFn: () => apiGet<{ facilities: Facility[] }>("/facilities"),
  })
}

export function useGuestHouses() {
  return useQuery({
    queryKey: ["guest-houses"],
    queryFn: () => apiGet<{ guestHouses: GuestHouse[]; activeBookings: GHAvailability[] }>("/guest-houses"),
  })
}

export function useMyBookings() {
  return useQuery({
    queryKey: ["bookings"],
    queryFn: () => apiGet<MyBookings>("/bookings"),
  })
}

export function useBookFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost<{ bookingRef: string }>("/bookings/facility", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

export function useCancelFacility() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost(`/bookings/facility/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

export function useBookGuestHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Record<string, unknown>) => apiPost("/bookings/guest-house", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

export function useCancelGuestHouse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost(`/bookings/guest-house/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }),
  })
}

// ── Check-in ─────────────────────────────────────────────────────────────────
export function useCheckIn() {
  return useQuery({
    queryKey: ["checkin"],
    queryFn: () => apiGet<CheckInOverview>("/checkin"),
  })
}

export function useSubmitOwnCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (signature: string) => apiPost<CheckInSubmit>("/checkin", { signature }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checkin"] })
      qc.invalidateQueries({ queryKey: ["home"] })
    },
  })
}

// Public counter-QR flow (no bearer token needed).
export function checkInScan(token: string) {
  return apiPost<CheckInScan>("/checkin/scan", { token })
}
export function checkInLookup(token: string, matricId: string) {
  return apiPost<CheckInLookup>("/checkin/lookup", { token, matricId })
}
export function checkInSubmit(token: string, matricId: string, signature: string) {
  return apiPost<CheckInSubmit>("/checkin/submit", { token, matricId, signature })
}
export function getCheckInDirections() {
  return apiGet<{ url: string | null }>("/checkin/directions")
}

// ── Lost & Found ─────────────────────────────────────────────────────────────
export function useLostFound() {
  return useQuery({
    queryKey: ["lost-found"],
    queryFn: () => apiGet<{ items: LostFoundItem[] }>("/lost-found"),
  })
}

export function useReportItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (form: FormData) =>
      apiFetch<{ ok: boolean }>("/lost-found", { method: "POST", formData: form }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lost-found"] }),
  })
}

export function useClaimItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost(`/lost-found/${id}/claim`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lost-found"] }),
  })
}

// ── Offices ──────────────────────────────────────────────────────────────────
export function useOffices() {
  return useQuery({
    queryKey: ["offices"],
    queryFn: () => apiGet<{ offices: Office[]; panorama: Panorama | null }>("/offices"),
  })
}

// ── AR Directory ─────────────────────────────────────────────────────────────
export function useDestinations() {
  return useQuery({
    queryKey: ["destinations"],
    queryFn: () => apiGet<{ destinations: Destination[] }>("/destinations"),
  })
}

// ── Admin (urus-*) ───────────────────────────────────────────────────────────
export function useAdminHelpdesk(status: string) {
  return useQuery({
    queryKey: ["admin-helpdesk", status],
    queryFn: () => apiGet<{ tickets: AdminTicketSummary[] }>(`/admin/helpdesk?status=${status}`),
  })
}

export function useAdminTicketAction(ticketId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: "assign" | "resolve" | "close" | "reopen" | "more_info") =>
      apiPost(`/admin/helpdesk/${ticketId}/status`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-helpdesk"] })
      qc.invalidateQueries({ queryKey: ["helpdesk", ticketId] })
    },
  })
}

export function useAdminBookings(status: string) {
  return useQuery({
    queryKey: ["admin-bookings", status],
    queryFn: () =>
      apiGet<{ facilityBookings: AdminFacilityBooking[]; guestHouseBookings: AdminGHBooking[] }>(
        `/admin/bookings?status=${status}`
      ),
  })
}

export function useAdminFacilityAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "approve" | "reject" }) =>
      apiPost(`/admin/bookings/facility/${id}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  })
}

export function useAdminGHAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string
      action: "approve" | "reject" | "check_in" | "check_out" | "mark_paid"
    }) => apiPost(`/admin/bookings/guest-house/${id}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bookings"] }),
  })
}

export function useAdminCheckin() {
  return useQuery({
    queryKey: ["admin-checkin"],
    queryFn: () => apiGet<AdminCheckInData>("/admin/checkin"),
  })
}
