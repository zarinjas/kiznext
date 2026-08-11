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
        { label: "Facilities", href: `/${role}/tempahan-fasiliti`, icon: "meeting_room" },
        { label: "Guest House", href: `/${role}/rumah-tamu`, icon: "hotel" },
        { label: "My Bookings", href: `/${role}/tempahan`, icon: "calendar_month" },
      ],
    },
    {
      label: "Support",
      items: [
        { label: "Helpdesk", href: `/${role}/helpdesk`, icon: "support_agent" },
        { label: "Parcels", href: `/${role}/parcel`, icon: "inventory_2" },
        { label: "Lost & Found", href: `/${role}/hilang`, icon: "search" },
        { label: "Directory", href: `/${role}/direktori`, icon: "map" },
      ],
    },
    {
      label: "Community",
      items: [
        { label: "Community Chat", href: `/${role}/chat`, icon: "forum" },
        { label: "Kad Maya", href: `/${role}/kad-maya`, icon: "qr_code_2" },
        { label: "Profile", href: `/${role}/profile`, icon: "person" },
      ],
    },
  ]

  if (canAdmin) {
    groups.push({
      label: "Admin",
      items: [
        { label: "Approval Center", href: `/${role}/urus-tempahan-fasiliti`, icon: "task_alt", admin: true },
        { label: "Guest House", href: `/${role}/urus-rumah-tamu`, icon: "hotel_class", admin: true },
        { label: "Helpdesk Inbox", href: `/${role}/urus-helpdesk`, icon: "inbox", admin: true },
        { label: "Facilities", href: `/${role}/urus-fasiliti`, icon: "apartment", admin: true },
        { label: "Announcements", href: `/${role}/urus-pengumuman`, icon: "campaign", admin: true },
        { label: "Parcels", href: `/${role}/urus-parcel`, icon: "inventory_2", admin: true },
        { label: "Settings", href: `/${role}/urus-tetapan`, icon: "settings", admin: true },
      ],
    })
  }

  return groups
}
