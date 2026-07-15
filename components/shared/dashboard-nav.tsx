"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Role } from "@/lib/rbac"
import {
  LayoutDashboard,
  User,
  QrCode,
  LogOut,
  Menu,
  X,
  MapPin,
  CheckSquare,
  Hotel,
  MessageSquare,
  Megaphone,
  MessageCircle,
  Package,
  EyeOff,
} from "lucide-react"
import { useState } from "react"

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const roleNavGroups: Record<"admin_kiz" | "superadmin" | "pengetua", NavGroup[]> = {
  admin_kiz: [
    {
      label: "Ringkasan",
      items: [
        { label: "Dashboard", href: "/admin_kiz", icon: <LayoutDashboard className="size-4" /> },
      ],
    },
    {
      label: "Kelulusan",
      items: [
        { label: "Urus Tempahan", href: "/admin_kiz/urus-tempahan", icon: <CheckSquare className="size-4" /> },
        { label: "Urus Rumah Tamu", href: "/admin_kiz/urus-rumah-tamu", icon: <Hotel className="size-4" /> },
      ],
    },
    {
      label: "Komuniti",
      items: [
        { label: "Urus Pengumuman", href: "/admin_kiz/urus-pengumuman", icon: <Megaphone className="size-4" /> },
        { label: "Chat Komuniti", href: "/admin_kiz/chat", icon: <MessageCircle className="size-4" /> },
        { label: "Urus Helpdesk", href: "/admin_kiz/urus-helpdesk", icon: <MessageSquare className="size-4" /> },
      ],
    },
    {
      label: "Operasi",
      items: [
        { label: "Urus Parcel", href: "/admin_kiz/urus-parcel", icon: <Package className="size-4" /> },
        { label: "Lost & Found", href: "/admin_kiz/hilang", icon: <EyeOff className="size-4" /> },
        { label: "Direktori Blok", href: "/admin_kiz/direktori", icon: <MapPin className="size-4" /> },
      ],
    },
    {
      label: "Akaun",
      items: [
        { label: "Kad Maya", href: "/admin_kiz/kad-maya", icon: <QrCode className="size-4" /> },
        { label: "Profil", href: "/admin_kiz/profile", icon: <User className="size-4" /> },
      ],
    },
  ],
  superadmin: [
    {
      label: "Ringkasan",
      items: [
        { label: "Dashboard", href: "/superadmin", icon: <LayoutDashboard className="size-4" /> },
      ],
    },
    {
      label: "Kelulusan",
      items: [
        { label: "Urus Tempahan", href: "/superadmin/urus-tempahan", icon: <CheckSquare className="size-4" /> },
        { label: "Urus Rumah Tamu", href: "/superadmin/urus-rumah-tamu", icon: <Hotel className="size-4" /> },
      ],
    },
    {
      label: "Komuniti",
      items: [
        { label: "Urus Pengumuman", href: "/superadmin/urus-pengumuman", icon: <Megaphone className="size-4" /> },
        { label: "Chat Komuniti", href: "/superadmin/chat", icon: <MessageCircle className="size-4" /> },
        { label: "Urus Helpdesk", href: "/superadmin/urus-helpdesk", icon: <MessageSquare className="size-4" /> },
      ],
    },
    {
      label: "Operasi",
      items: [
        { label: "Urus Parcel", href: "/superadmin/urus-parcel", icon: <Package className="size-4" /> },
        { label: "Lost & Found", href: "/superadmin/hilang", icon: <EyeOff className="size-4" /> },
        { label: "Direktori Blok", href: "/superadmin/direktori", icon: <MapPin className="size-4" /> },
      ],
    },
    {
      label: "Akaun",
      items: [
        { label: "Kad Maya", href: "/superadmin/kad-maya", icon: <QrCode className="size-4" /> },
        { label: "Profil", href: "/superadmin/profile", icon: <User className="size-4" /> },
      ],
    },
  ],
  pengetua: [
    {
      label: "Ringkasan",
      items: [
        { label: "Dashboard", href: "/pengetua", icon: <LayoutDashboard className="size-4" /> },
      ],
    },
    {
      label: "Komuniti",
      items: [
        { label: "Pengumuman", href: "/pengetua/pengumuman", icon: <Megaphone className="size-4" /> },
        { label: "Chat Komuniti", href: "/pengetua/chat", icon: <MessageCircle className="size-4" /> },
      ],
    },
    {
      label: "Operasi",
      items: [
        { label: "Lost & Found", href: "/pengetua/hilang", icon: <EyeOff className="size-4" /> },
        { label: "Direktori Blok", href: "/pengetua/direktori", icon: <MapPin className="size-4" /> },
      ],
    },
    {
      label: "Akaun",
      items: [
        { label: "Profil", href: "/pengetua/profile", icon: <User className="size-4" /> },
      ],
    },
  ],
}

interface Props {
  role: Exclude<Role, "ahli">
  userName: string
  roleLabel: string
}

export function DashboardNav({ role, userName, roleLabel }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const groups = roleNavGroups[role]
  const initial = userName.trim().charAt(0).toUpperCase() || "K"

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md lg:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-sidebar-border p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary font-heading text-base text-primary-foreground">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-foreground">{userName}</p>
            <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-sidebar-foreground">
              {roleLabel}
            </span>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-primary text-primary-foreground font-medium"
                          : "hover:bg-sidebar-accent text-sidebar-foreground"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="size-4" />
            Log Keluar
          </Button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
