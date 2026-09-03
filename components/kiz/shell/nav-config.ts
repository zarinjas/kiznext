import type { Role } from "@/lib/rbac"

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
  return item.href.endsWith("/bilik")
}

export const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin_kiz: "Admin KIZ",
  pengetua: "Principal",
  ahli: "Student",
}

export const ROLE_OVERLINES: Record<Role, string> = {
  superadmin: "College operations",
  admin_kiz: "College operations",
  pengetua: "Principal view · read only",
  ahli: "Resident",
}

export function navForRole(role: Role): NavGroup[] {
  const admins: Role[] = ["superadmin", "admin_kiz"]
  const canAdmin = admins.includes(role)

  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: `/${role}`, icon: "dashboard" },
        { label: "Announcements", href: `/${role}/pengumuman`, icon: "campaign" },
      ],
    },
    {
      label: "Bookings",
      items: [
        { label: "Choose Room", href: `/${role}/bilik`, icon: "bedroom_parent", roles: ["ahli"] },
        { label: "Facilities", href: `/${role}/tempahan-fasiliti`, icon: "meeting_room" },
        { label: "Guest House", href: `/${role}/rumah-tamu`, icon: "hotel" },
        { label: "My Bookings", href: `/${role}/tempahan`, icon: "calendar_month" },
      ],
    },
    {
      label: "Support",
      items: [
        { label: "Helpdesk", href: `/${role}/helpdesk`, icon: "support_agent" },
        { label: "Lost & Found", href: `/${role}/hilang`, icon: "search" },
        { label: "Offices", href: `/${role}/pejabat`, icon: "domain" },
        { label: "Directory", href: `/${role}/direktori`, icon: "map" },
      ],
    },
    {
      label: "Community",
      items: [
        { label: "Community Chat", href: `/${role}/chat`, icon: "forum" },
        { label: "eCard", href: `/${role}/kad-maya`, icon: "qr_code_2" },
        { label: "Profile", href: `/${role}/profile`, icon: "person" },
      ],
    },
  ]

  if (canAdmin) {
    groups.push(
      {
        label: "Approvals",
        items: [
          { label: "Facility Requests", href: `/${role}/urus-tempahan-fasiliti`, icon: "task_alt", admin: true },
          { label: "Guest House", href: `/${role}/urus-rumah-tamu`, icon: "hotel_class", admin: true },
          { label: "Room Selection", href: `/${role}/urus-bilik`, icon: "bedroom_parent", admin: true },
          { label: "Helpdesk Inbox", href: `/${role}/urus-helpdesk`, icon: "inbox", admin: true },
        ],
      },
      {
        label: "Content",
        items: [
          { label: "Announcements", href: `/${role}/urus-pengumuman`, icon: "campaign", admin: true },
          { label: "Facilities", href: `/${role}/urus-fasiliti`, icon: "apartment", admin: true },
          { label: "Offices", href: `/${role}/urus-pejabat`, icon: "domain", admin: true },
        ],
      },
      {
        label: "System",
        items: [
          { label: "Users", href: `/${role}/urus-pengguna`, icon: "manage_accounts", admin: true },
          { label: "Settings", href: `/${role}/urus-tetapan`, icon: "settings", admin: true },
        ],
      },
    )
  }

  // Role-gated items: drop anything that lists explicit roles the current
  // session role isn't in (e.g. room selection is student-only).
  return groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  }))
}
