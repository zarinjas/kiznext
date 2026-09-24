import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { apiFetch, apiGet, apiPost } from "./api"
import type {
  AdminCheckInData,
  AdminFacilityBooking,
  AdminGHBooking,
  AdminTicketSummary,
  Announcement,
  ArTranslateMeta,
  ArTranslateResult,
  BilikState,
  ChatSnapshot,
  CheckInLookup,
  ConciergeReply,
  HeroOverlay,
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
  LaundrySnapshot,
  LostFoundItem,
  MyBookings,
  NotificationsData,
  Office,
  OnboardingSlide,
  Panorama,
  ResidentHome,
  ShowcaseBackgrounds,
  SosData,
  WalletLinks,
} from "./types"

/** One-shot KIZ-AI question. Returns the reply (never throws for AI-off). */
export function askConcierge(question: string): Promise<ConciergeReply> {
  return apiPost<ConciergeReply>("/concierge", { question })
}

/** The concierge's identity + availability, for the header and greeting. */
export function useConciergeMeta() {
  return useQuery({
    queryKey: ["concierge-meta"],
    queryFn: () =>
      apiGet<{ name: string; avatarUrl: string | null; enabled: boolean }>("/concierge"),
    staleTime: 5 * 60 * 1000,
  })
}

export function useOnboardingSlides() {
  return useQuery({
    queryKey: ["onboarding"],
    queryFn: () => apiGet<{ slides: OnboardingSlide[] }>("/onboarding"),
    staleTime: 5 * 60 * 1000,
  })
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: () => apiGet<{ announcements: Announcement[] }>("/announcements"),
  })
}

export function useMarkAnnouncementRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost(`/announcements/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] })
      qc.invalidateQueries({ queryKey: ["home"] })
    },
  })
}

export function useToggleAnnouncementReaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; type: string }) =>
      apiPost(`/announcements/${input.id}/reaction`, { type: input.type }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  })
}

export function useHome() {
  return useQuery({
    queryKey: ["home"],
    queryFn: () =>
      apiGet<{
        home: ResidentHome | null
        heroBackgroundUrl: string | null
        heroOverlay: HeroOverlay
        showcase: ShowcaseBackgrounds
      }>("/home"),
  })
}

// ── Notifications ────────────────────────────────────────────────────────────
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiGet<NotificationsData>("/notifications"),
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiPost("/notifications", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost("/notifications", { all: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
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

export function useWalletLinks() {
  return useQuery({
    queryKey: ["ecard", "wallet"],
    queryFn: () => apiGet<WalletLinks>("/ecard/wallet"),
    staleTime: 5 * 60 * 1000,
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
    mutationFn: (input: {
      message: string
      replyToId?: string | null
      attachment?: { url: string; type: string; name: string } | null
    }) => apiPost("/chat", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chat"] }),
  })
}

/** Upload a chat attachment (image/PDF) and return its stored path. */
export function uploadChatAttachment(uri: string, name: string, mimeType: string) {
  const form = new FormData()
  form.append("file", { uri, name, type: mimeType } as unknown as Blob)
  form.append("dir", "chat")
  return apiFetch<{ url: string; filename: string }>("/upload", { method: "POST", formData: form })
}

export function useReportChatMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { messageId: string; reason: string; note?: string }) =>
      apiPost(`/chat/${input.messageId}/report`, { reason: input.reason, note: input.note }),
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

// ── Laundry ──────────────────────────────────────────────────────────────────
export function useLaundry() {
  return useQuery({
    queryKey: ["laundry"],
    queryFn: () => apiGet<LaundrySnapshot>("/laundry"),
    refetchInterval: 20000,
  })
}

export function useStartLaundry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { machineId: string; durationMinutes: number }) =>
      apiPost<LaundrySnapshot>("/laundry", { action: "start", ...input }),
    onSuccess: (data) => qc.setQueryData(["laundry"], data),
  })
}

export function useCancelLaundry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (reminderId: string) =>
      apiPost<LaundrySnapshot>("/laundry", { action: "cancel", reminderId }),
    onSuccess: (data) => qc.setQueryData(["laundry"], data),
  })
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

// ── AR Translate (KIZ Lens) ──────────────────────────────────────────────────
export function useArTranslateMeta() {
  return useQuery({
    queryKey: ["ar-translate-meta"],
    queryFn: () => apiGet<ArTranslateMeta>("/ar-translate"),
  })
}

/** One-shot OCR + translate of a captured camera frame. */
export function arTranslateScan(input: {
  image: string
  targetLang: string
  mimeType?: string
}): Promise<ArTranslateResult> {
  return apiPost<ArTranslateResult>("/ar-translate", input)
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
