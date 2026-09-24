import type { Role } from "@/lib/rbac"
import {
  ADMIN_ROLES,
  GUEST_HOUSE_ROLES,
  LAUNDRY_VIEW_ROLES,
  NOTIFICATION_SEND_ROLES,
  REPORT_ROLES,
  RESIDENCE_VIEW_ROLES,
  SUPPORT_ROLES,
} from "@/lib/rbac"

export interface NavItem {
  label: string
  href: string
  icon: string
  admin?: boolean
  roles?: Role[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** True for the room-selection item, which earns a live badge when the window is open. */
export function isRoomSelectionItem(item: NavItem): boolean {
  return item.href.endsWith("/bilik") && !item.href.endsWith("/urus-bilik")
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin_kiz: "Admin KIZ",
  pengetua: "Principal",
  fellow: "Fellow",
  ahli: "Student",
  staf: "Staff",
  kafe: "Cafe Operator",
}

export const ROLE_OVERLINES: Record<Role, string> = {
  superadmin: "College operations",
  admin_kiz: "College operations",
  pengetua: "Principal view · read only",
  fellow: "Fellow",
  ahli: "Resident",
  staf: "Staff",
  kafe: "KIZ Cafe",
}

export function navForRole(role: Role): NavGroup[] {
  // The cafe operator gets a single-purpose shell: manage the cafe, view its
  // orders, nothing else. (Enforced in `proxy.ts` too.)
  if (role === "kafe") {
    return [
      {
        label: "KIZ Cafe",
        items: [
          { label: "Cafe Dashboard", href: `/${role}/urus-kafe`, icon: "restaurant" },
          { label: "Profile", href: `/${role}/profile`, icon: "person" },
        ],
      },
    ]
  }

  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: `/${role}`, icon: "dashboard" },
        { label: "Announcements", href: `/${role}/pengumuman`, icon: "campaign" },
        { label: "Digital Guide", href: `/${role}/panduan`, icon: "menu_book" },
      ],
    },
    {
      label: "Bookings",
      items: [
        { label: "Room Selection", href: `/${role}/bilik`, icon: "bedroom_parent", roles: ["ahli"] },
        { label: "Check-in / Out", href: `/${role}/checkin`, icon: "how_to_reg", roles: ["ahli"] },
        { label: "Facilities", href: `/${role}/tempahan-fasiliti`, icon: "meeting_room" },
        { label: "Laundry", href: `/${role}/laundry`, icon: "local_laundry_service", roles: ["ahli"] },
        { label: "Guest House", href: `/${role}/rumah-tamu`, icon: "hotel", roles: ["ahli", "staf", "fellow"] },
        { label: "My Bookings", href: `/${role}/tempahan`, icon: "calendar_month" },
      ],
    },
    {
      label: "Support",
      items: [
        { label: "SOS", href: `/${role}/sos`, icon: "sos" },
        { label: "Helpdesk", href: `/${role}/helpdesk`, icon: "support_agent", roles: ["ahli", "pengetua"] },
        { label: "Lost & Found", href: `/${role}/hilang`, icon: "search" },
        { label: "Offices", href: `/${role}/pejabat`, icon: "domain" },
        { label: "AR Directory", href: `/${role}/direktori`, icon: "view_in_ar" },
        { label: "AR Translate", href: `/${role}/ar-terjemah`, icon: "translate" },
      ],
    },
    {
      label: "Community",
      items: [
        { label: "Community Chat", href: `/${role}/chat`, icon: "forum" },
        { label: "KIZ Cafe", href: `/${role}/kafe`, icon: "restaurant" },
        { label: "Digital Resident ID", href: `/${role}/kad-maya`, icon: "qr_code_2" },
        { label: "Profile", href: `/${role}/profile`, icon: "person" },
      ],
    },
    {
      label: "Approvals",
      items: [
        { label: "Facility Requests", href: `/${role}/urus-tempahan-fasiliti`, icon: "task_alt", admin: true, roles: ADMIN_ROLES },
        { label: "Guest House", href: `/${role}/urus-rumah-tamu`, icon: "hotel_class", admin: true, roles: GUEST_HOUSE_ROLES },
        { label: "Accommodation", href: `/${role}/urus-bilik`, icon: "bedroom_parent", admin: true, roles: RESIDENCE_VIEW_ROLES },
        { label: "Check-in / Out", href: `/${role}/urus-checkin`, icon: "qr_code_2", admin: true, roles: RESIDENCE_VIEW_ROLES },
        { label: "Helpdesk Inbox", href: `/${role}/urus-helpdesk`, icon: "inbox", admin: true, roles: SUPPORT_ROLES },
      ],
    },
    {
      label: "Insights",
      items: [
        { label: "Reports", href: `/${role}/urus-laporan`, icon: "monitoring", admin: true, roles: REPORT_ROLES },
      ],
    },
    {
      label: "Content",
      items: [
        { label: "Announcements", href: `/${role}/urus-pengumuman`, icon: "campaign", admin: true, roles: ADMIN_ROLES },
        { label: "KIZ Cafe", href: `/${role}/urus-kafe`, icon: "restaurant", admin: true, roles: ADMIN_ROLES },
        { label: "Notifications", href: `/${role}/urus-notifikasi`, icon: "notifications_active", admin: true, roles: NOTIFICATION_SEND_ROLES },
        { label: "Digital Guides", href: `/${role}/urus-panduan`, icon: "menu_book", admin: true, roles: ADMIN_ROLES },
        { label: "Activities", href: `/${role}/urus-aktiviti`, icon: "event", admin: true, roles: ADMIN_ROLES },
        { label: "Dashboard Content", href: `/${role}/urus-kandungan`, icon: "widgets", admin: true, roles: ADMIN_ROLES },
        { label: "Onboarding", href: `/${role}/urus-onboarding`, icon: "view_carousel", admin: true, roles: ADMIN_ROLES },
        { label: "Stay Connected", href: `/${role}/urus-sosial`, icon: "link", admin: true, roles: ADMIN_ROLES },
        { label: "Facilities", href: `/${role}/urus-fasiliti`, icon: "apartment", admin: true, roles: ADMIN_ROLES },
        { label: "Laundry", href: `/${role}/urus-laundry`, icon: "local_laundry_service", admin: true, roles: LAUNDRY_VIEW_ROLES },
        { label: "Offices", href: `/${role}/urus-pejabat`, icon: "domain", admin: true, roles: ADMIN_ROLES },
        { label: "AR Directory", href: `/${role}/urus-direktori`, icon: "view_in_ar", admin: true, roles: ADMIN_ROLES },
      ],
    },
    {
      label: "AI",
      items: [
        { label: "KIZ-AI", href: `/${role}/urus-ai`, icon: "smart_toy", admin: true, roles: ADMIN_ROLES },
        { label: "FAQ Knowledge", href: `/${role}/urus-faq`, icon: "quiz", admin: true, roles: ADMIN_ROLES },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Users", href: `/${role}/urus-pengguna`, icon: "manage_accounts", admin: true, roles: ADMIN_ROLES },
        { label: "Invitations", href: `/${role}/urus-jemputan`, icon: "mail", admin: true, roles: ["superadmin"] },
        { label: "Settings", href: `/${role}/urus-tetapan`, icon: "settings", admin: true, roles: ADMIN_ROLES },
      ],
    },
  ]

  // Role-gated items: drop anything that lists explicit roles the current
  // session role isn't in (e.g. room selection is student-only), then drop any
  // group left empty (e.g. Content for pengetua/staf/fellow).
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}
