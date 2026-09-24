import type { AccountStatus, Role } from "@kiz/shared"

/** The signed-in user, as returned by `/api/v1/auth/*`. */
export interface MobileUser {
  id: string
  matricId: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  role: Role
  accountStatus: AccountStatus
}

export interface Announcement {
  id: string
  title: string
  content: string
  tag: string
  isPinned: boolean
  attachmentUrl: string | null
  attachmentType: string | null
  posterName: string | null
  scheduledAt: string | null
  expiresAt: string | null
  createdAt: string
  reactions: { noted: number; excited: number; interested: number }
  mine: string[]
  unread: boolean
}

// ── KIZ-AI ───────────────────────────────────────────────────────────────────
export type ConciergeKind = "chat" | "kiz" | "unknown"

export interface ConciergeReply {
  enabled: boolean
  answer: string
  kind: ConciergeKind
  confident: boolean
  sources: { title: string; href: string | null }[]
  officeOpen: boolean
  error?: string
}

// ── Onboarding ───────────────────────────────────────────────────────────────
export interface OnboardingSlide {
  id: string
  title: string
  body: string | null
  imageUrl: string | null
  gradient: string
  gradientOpacity: number
  buttonLabel: string | null
}

// ── SOS ──────────────────────────────────────────────────────────────────────
export interface SosTarget {
  officeOpen: boolean
  phone: string | null
  label: string
  configured: boolean
}

export interface SosData {
  target: SosTarget
  contacts: { id: string; title: string; phone: string | null; subtitle: string | null }[]
}

// ── Home ─────────────────────────────────────────────────────────────────────
export interface HomeTodo {
  id: "room" | "announcement" | "ecard"
  title: string
  subtitle: string | null
  dueLabel: string | null
  done: boolean
  href: string
  ctaLabel: string
}

export interface ResidentHome {
  room: {
    roomCode: string
    blockName: string
    roomNumber: string
    bed: string | null
    session: string | null
    roommateName: string | null
    roommateMatricId: string | null
  } | null
  todos: HomeTodo[]
  doneCount: number
  checkInStatus: string | null
  pinnedAnnouncements: {
    id: string
    title: string
    content: string
    tag: string
    attachmentUrl: string | null
    attachmentType: string | null
    when: string
  }[]
  importantNotice: { id: string; title: string; content: string; when: string } | null
  nextEvents: { id: string; title: string; description: string | null; venue: string | null; when: string }[]
  helpdesk: { displayId: number; status: string; subject: string; updatedWhen: string } | null
  officeOpen: boolean
  emergencyContacts: { id: string; title: string; phone: string | null; subtitle: string | null; body: string | null }[]
  livingGuides: { id: string; title: string; subtitle: string | null; body: string | null; link: string | null }[]
  laundry: { machineName: string; endsAt: string } | null
  stayConnected?: {
    enabled: boolean
    title: string
    subtitle: string
    links: {
      id: string
      label: string
      description: string | null
      url: string
      icon: string
      isActive: boolean
    }[]
  }
}

// ── eCard ────────────────────────────────────────────────────────────────────
export interface EcardData {
  card: {
    name: string
    matricId: string
    role: Role
    roleLabel: string | null
    block: string | null
    roomNumber: string | null
    bed: string | null
    session: string | null
    validUntil: string | null
    avatarUrl: string | null
    cardBackgroundUrl: string | null
    ukmLogoUrl: string | null
    kizLogoUrl: string | null
  }
  ecardRegistered: boolean
}

/** "Add to Wallet" links; either side is null when that provider isn't configured. */
export interface WalletLinks {
  googleWalletUrl: string | null
  appleWalletUrl: string | null
}

// ── Digital Guide ────────────────────────────────────────────────────────────
export interface Guide {
  id: string
  title: string
  description: string | null
  category: string
  coverImage: string | null
  fileUrl: string
  pageCount: number | null
  isPinned: boolean
  isNew: boolean
  sizeLabel: string | null
  displayDate: string
}

// ── Helpdesk ─────────────────────────────────────────────────────────────────
export interface HelpdeskTicketSummary {
  id: string
  displayId: number
  subject: string
  category: string
  channel: string
  status: string
  locationBlock: string | null
  locationDetail: string | null
  updatedAt: string
  lastMessage: {
    message: string
    isAutoReply: boolean
    senderName: string
    senderRole: string
  } | null
}

export interface HelpdeskListData {
  tickets: HelpdeskTicketSummary[]
  unreadCount: number
  officeOpen: boolean
  blocks: string[]
  defaultBlock: string | null
  defaultRoom: string | null
  emergencyContacts: {
    id: string
    title: string
    phone: string | null
    subtitle: string | null
    body: string | null
  }[]
}

export interface HelpdeskMessage {
  id: string
  message: string
  sourceLang: string | null
  translationEn: string | null
  translationZh: string | null
  isAutoReply: boolean
  createdAt: string
  sender: { id: string; name: string; role: string; avatarUrl: string | null }
}

export interface HelpdeskThread {
  ticket: {
    id: string
    displayId: number
    subject: string
    category: string
    channel: string
    status: string
    locationBlock: string | null
    locationDetail: string | null
    createdAt: string
  }
  messages: HelpdeskMessage[]
  canReply: boolean
}

// ── Community chat ───────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  message: string
  createdAt: string
  attachmentUrl: string | null
  attachmentType: string | null
  attachmentName: string | null
  replyToId: string | null
  replyPreview: { senderName: string; text: string } | null
  sender: { id: string; name: string; role: string; avatarUrl: string | null }
  reactions: { emoji: string; count: number; mine: boolean }[]
}

export interface ChatSnapshot {
  messages: ChatMessage[]
  memberCount: number
  onlineCount: number
  team: { id: string; name: string; role: string; avatarUrl: string | null; online: boolean }[]
  canModerate: boolean
}

// ── Room selection ───────────────────────────────────────────────────────────
export type WindowState = "not_open" | "open" | "closing_soon" | "closed"

export interface BilikState {
  eligible: boolean
  hasRoom: boolean
  windowState: WindowState
  window: { name: string; opensAt: string; closesAt: string; closingSoonHours: number } | null
  fees: { single: number | null; double: number | null }
  application: null | {
    type: "single" | "double" | "flexible"
    status: string
    submittedAt: string
    roommate: { race: string | null; religion: string | null } | null
  }
  incomingRequest: null | { applicantRace: string | null; applicantReligion: string | null }
  allocation: string | null
  reason?: string
}

// ── Bookings ─────────────────────────────────────────────────────────────────
export interface Facility {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  timeSlotDuration: number | null
  maxPerDay: number | null
  bookable: boolean
  status: "open" | "coming_soon"
  section: "bookable" | "shared"
  categoryName: string
  blockName: string | null
  bookings: { start: string; end: string }[]
}

export interface GuestHouse {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  maxDays: number | null
  requiresApproval: boolean
}

export interface GHAvailability {
  id: string
  guestHouseId: string
  guestName: string
  startDate: string
  endDate: string
}

export interface MyFacilityBooking {
  id: string
  facilityName: string
  facilityImage: string | null
  timeSlotStart: string
  timeSlotEnd: string
  bookingRef: string | null
  status: string
  pdfUrl: string | null
  purpose: string | null
}

export interface MyGHBooking {
  id: string
  guestHouseName: string
  guestHouseImage: string | null
  guestName: string
  startDate: string
  endDate: string
  periodType: string
  status: string
  paymentStatus: string
}

export interface MyBookings {
  facilityBookings: MyFacilityBooking[]
  guestHouseBookings: MyGHBooking[]
}

// ── Check-in ─────────────────────────────────────────────────────────────────
export interface CheckInOverview {
  session: { id: string; name: string; type: "check_in" | "check_out"; opensAtIso: string | null; closesAtIso: string | null } | null
  name: string
  matricId: string
  roomLabel: string | null
  alreadySigned: boolean
  isStudent: boolean
}

export interface CheckInScan {
  ok: boolean
  name?: string
  type?: "check_in" | "check_out"
  opensAt?: string | null
  closesAt?: string | null
  error?: string
}

export interface CheckInLookup {
  ok: boolean
  canSign: boolean
  hasAccount: boolean
  name?: string
  matricId?: string
  roomLabel?: string | null
  error?: string
}

export interface CheckInSubmit {
  ok: boolean
  error?: string
  matricId?: string
  name?: string
  roomLabel?: string | null
  type?: "check_in" | "check_out"
  signedAtIso?: string
}

// ── Laundry ──────────────────────────────────────────────────────────────────
export type {
  LaundryMachineState,
  LaundryMachineView,
  LaundryReminderView,
  LaundrySnapshot,
} from "@kiz/shared"

// ── Lost & Found ─────────────────────────────────────────────────────────────
export interface LostFoundItem {
  id: string
  itemName: string
  description: string
  photoUrl: string | null
  status: string
  locationFound: string | null
  happenedDate: string | null
  happenedTime: string | null
  createdAt: string
  reportedBy: string
  reporterName: string | null
}

// ── Offices ──────────────────────────────────────────────────────────────────
export interface Office {
  id: string
  name: string
  description: string | null
  featuredImage: string | null
  gallery: string[]
}

export interface Panorama {
  image: string
  leftLabel: string
  leftX: number
  rightLabel: string
  rightX: number
}

// ── AR Directory ─────────────────────────────────────────────────────────────
export interface Destination {
  id: string
  name: string
  type: string
  icon: string
  latitude: number
  longitude: number
  indoor: boolean
  building: string | null
  description: string | null
}

// ── AR Translate (KIZ Lens) ──────────────────────────────────────────────────
export interface ArTranslateBox {
  x: number
  y: number
  w: number
  h: number
}

export interface ArTranslateBlock {
  text: string
  translation: string
  box: ArTranslateBox | null
}

export interface ArTranslateResult {
  sourceLang: string
  targetLang: string
  blocks: ArTranslateBlock[]
}

export interface ArTranslateMeta {
  languages: { code: string; native: string; english: string }[]
  suggestedLang: string | null
}

// ── Admin (urus-*) ───────────────────────────────────────────────────────────
export interface AdminTicketSummary {
  id: string
  displayId: number
  subject: string
  category: string
  channel: string
  status: string
  origin: string
  locationBlock: string | null
  locationDetail: string | null
  updatedAt: string
  createdAt: string
  userName: string
  userMatric: string
  userRole: string
  assignedToName: string | null
  messageCount: number
  lastMessage: {
    message: string
    isAutoReply: boolean
    senderName: string
    senderRole: string
  } | null
}

export interface AdminFacilityBooking {
  id: string
  facilityName: string
  userName: string
  userMatric: string
  timeSlotStart: string
  timeSlotEnd: string
  purpose: string | null
  notes: string | null
  status: string
  bookingRef: string | null
  createdAt: string
}

export interface AdminGHBooking {
  id: string
  guestHouseName: string
  userName: string
  userMatric: string
  guestName: string
  periodType: string
  startDate: string
  endDate: string
  status: string
  paymentStatus: string
  notes: string | null
  createdAt: string
}

export interface NotificationItem {
  id: string
  title: string
  body: string
  link: string | null
  /** KL-formatted label from the server, e.g. "24 Sep 2026, 3:12 PM". */
  createdAt: string
  read: boolean
}

export interface NotificationsData {
  notifications: NotificationItem[]
  unreadCount: number
}

export interface AdminCheckInData {
  sessions: {
    id: string
    name: string
    type: string
    isActive: boolean
    opensAt: string | null
    closesAt: string | null
    token: string
  }[]
  records: {
    id: string
    matricId: string
    name: string
    type: string
    roomLabel: string
    signedAt: string
    manual: boolean
    sessionName: string | null
  }[]
}
