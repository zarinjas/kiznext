import {
  ADMIN_ROLES,
  GUEST_HOUSE_ROLES,
  RESIDENCE_VIEW_ROLES,
  SUPPORT_ROLES,
  type Role,
} from "@kiz/shared"

/**
 * Mobile navigation map. Mirrors `components/kiz/shell/nav-config.ts` on the
 * web, but each item carries a mobile route (`path`) instead of a URL href.
 * Items without a `path` are not built on mobile yet — the "More" screen shows
 * them as "Soon" instead of hiding them, so parity gaps stay visible.
 */

export interface NavItem {
  label: string
  /** Material Symbols name — mapped to a MaterialIcons glyph by `ui/icon.tsx`. */
  icon: string
  /** Mobile route inside the `(app)` group, or null when not built yet. */
  path: string | null
  roles?: Role[]
  admin?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export function navForRole(role: Role): NavGroup[] {
  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", icon: "dashboard", path: "" },
        { label: "Announcements", icon: "campaign", path: "pengumuman" },
        { label: "Digital Guide", icon: "menu_book", path: "panduan" },
      ],
    },
    {
      label: "Bookings",
      items: [
        { label: "Room Selection", icon: "bedroom_parent", path: "bilik", roles: ["ahli"] },
        { label: "Check-in / Out", icon: "how_to_reg", path: "checkin", roles: ["ahli"] },
        { label: "Scan counter QR", icon: "qr_code_2", path: "scan" },
        { label: "Facilities", icon: "meeting_room", path: "tempahan-fasiliti" },
        { label: "Laundry", icon: "local_laundry_service", path: "laundry", roles: ["ahli"] },
        { label: "Guest House", icon: "hotel", path: "rumah-tamu", roles: ["ahli", "staf", "fellow"] },
        { label: "My Bookings", icon: "calendar_month", path: "tempahan" },
      ],
    },
    /**
     * AI & AR leads the menu.
     *
     * These were rows 6–7 of a "Support" group, below Lost & Found — the
     * flagship features buried under utilities. Naming the group "AI & AR" also
     * makes the innovation legible at a glance on the one screen that shows the
     * app's full breadth. Labels match what the features are called in-product
     * ("AR Translate" was the nav label for a screen titled "KIZ Lens").
     */
    {
      label: "AI & AR",
      items: [
        { label: "KIZ Lens — Translate", icon: "translate", path: "ar-terjemah" },
        { label: "AR Wayfinder", icon: "view_in_ar", path: "direktori" },
        { label: "KIZ-AI Concierge", icon: "smart_toy", path: "kiz-ai" },
      ],
    },
    {
      label: "Support",
      items: [
        { label: "Notifications", icon: "notifications", path: "notifications" },
        { label: "SOS", icon: "sos", path: "sos" },
        { label: "Helpdesk", icon: "support_agent", path: "helpdesk", roles: ["ahli", "pengetua"] },
        { label: "Lost & Found", icon: "search", path: "hilang" },
        { label: "Offices", icon: "domain", path: "pejabat" },
      ],
    },
    {
      label: "Community",
      items: [
        { label: "Community Chat", icon: "forum", path: "chat" },
        { label: "Digital Resident ID", icon: "qr_code_2", path: "kad-maya" },
        { label: "Profile", icon: "person", path: "profile" },
      ],
    },
    {
      label: "Approvals",
      items: [
        { label: "Approval centre", icon: "task_alt", path: "urus-tempahan", admin: true, roles: GUEST_HOUSE_ROLES },
        { label: "Helpdesk inbox", icon: "inbox", path: "urus-helpdesk", admin: true, roles: SUPPORT_ROLES },
        { label: "Check-in records", icon: "qr_code_2", path: "urus-checkin", admin: true, roles: RESIDENCE_VIEW_ROLES },
      ],
    },
    {
      label: "Content",
      items: [
        { label: "Announcements", icon: "campaign", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Digital Guides", icon: "menu_book", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Activities", icon: "event", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Dashboard Content", icon: "widgets", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Stay Connected", icon: "link", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Facilities", icon: "apartment", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Offices", icon: "domain", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "AR Directory", icon: "view_in_ar", path: null, admin: true, roles: ADMIN_ROLES },
      ],
    },
    {
      label: "AI",
      items: [
        { label: "KIZ-AI", icon: "smart_toy", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "FAQ Knowledge", icon: "quiz", path: null, admin: true, roles: ADMIN_ROLES },
      ],
    },
    {
      label: "System",
      items: [
        { label: "Users", icon: "manage_accounts", path: null, admin: true, roles: ADMIN_ROLES },
        { label: "Invitations", icon: "mail", path: null, admin: true, roles: ["superadmin"] },
        { label: "Settings", icon: "settings", path: null, admin: true, roles: ADMIN_ROLES },
      ],
    },
  ]

  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0)
}
