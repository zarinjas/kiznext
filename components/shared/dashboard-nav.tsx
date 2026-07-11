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
  Calendar,
  CheckSquare,
  Luggage,
  Hotel,
  MessageSquare,
  LifeBuoy,
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

const roleNavItems: Record<Role, NavItem[]> = {
  ahli: [
    { label: "Dashboard", href: "/ahli", icon: <LayoutDashboard className="size-4" /> },
    { label: "Pengumuman", href: "/ahli/pengumuman", icon: <Megaphone className="size-4" /> },
    { label: "Chat Komuniti", href: "/ahli/chat", icon: <MessageCircle className="size-4" /> },
    { label: "Tempahan Fasiliti", href: "/ahli/tempahan", icon: <Calendar className="size-4" /> },
    { label: "Rumah Tamu", href: "/ahli/rumah-tamu", icon: <Luggage className="size-4" /> },
    { label: "Helpdesk", href: "/ahli/helpdesk", icon: <LifeBuoy className="size-4" /> },
    { label: "Bungkusan Saya", href: "/ahli/parcel", icon: <Package className="size-4" /> },
    { label: "Lost & Found", href: "/ahli/hilang", icon: <EyeOff className="size-4" /> },
    { label: "Direktori Blok", href: "/ahli/direktori", icon: <MapPin className="size-4" /> },
    { label: "Kad Maya", href: "/ahli/kad-maya", icon: <QrCode className="size-4" /> },
    { label: "Profil", href: "/ahli/profile", icon: <User className="size-4" /> },
  ],
  admin_kiz: [
    { label: "Dashboard", href: "/admin_kiz", icon: <LayoutDashboard className="size-4" /> },
    { label: "Urus Pengumuman", href: "/admin_kiz/urus-pengumuman", icon: <Megaphone className="size-4" /> },
    { label: "Chat Komuniti", href: "/admin_kiz/chat", icon: <MessageCircle className="size-4" /> },
    { label: "Urus Tempahan", href: "/admin_kiz/urus-tempahan", icon: <CheckSquare className="size-4" /> },
    { label: "Urus Rumah Tamu", href: "/admin_kiz/urus-rumah-tamu", icon: <Hotel className="size-4" /> },
    { label: "Urus Helpdesk", href: "/admin_kiz/urus-helpdesk", icon: <MessageSquare className="size-4" /> },
    { label: "Urus Parcel", href: "/admin_kiz/urus-parcel", icon: <Package className="size-4" /> },
    { label: "Lost & Found", href: "/admin_kiz/hilang", icon: <EyeOff className="size-4" /> },
    { label: "Direktori Blok", href: "/admin_kiz/direktori", icon: <MapPin className="size-4" /> },
    { label: "Kad Maya", href: "/admin_kiz/kad-maya", icon: <QrCode className="size-4" /> },
    { label: "Profil", href: "/admin_kiz/profile", icon: <User className="size-4" /> },
  ],
  pengetua: [
    { label: "Dashboard", href: "/pengetua", icon: <LayoutDashboard className="size-4" /> },
    { label: "Pengumuman", href: "/pengetua/pengumuman", icon: <Megaphone className="size-4" /> },
    { label: "Chat Komuniti", href: "/pengetua/chat", icon: <MessageCircle className="size-4" /> },
    { label: "Lost & Found", href: "/pengetua/hilang", icon: <EyeOff className="size-4" /> },
    { label: "Direktori Blok", href: "/pengetua/direktori", icon: <MapPin className="size-4" /> },
    { label: "Profil", href: "/pengetua/profile", icon: <User className="size-4" /> },
  ],
  superadmin: [
    { label: "Dashboard", href: "/superadmin", icon: <LayoutDashboard className="size-4" /> },
    { label: "Urus Pengumuman", href: "/superadmin/urus-pengumuman", icon: <Megaphone className="size-4" /> },
    { label: "Chat Komuniti", href: "/superadmin/chat", icon: <MessageCircle className="size-4" /> },
    { label: "Urus Tempahan", href: "/superadmin/urus-tempahan", icon: <CheckSquare className="size-4" /> },
    { label: "Urus Rumah Tamu", href: "/superadmin/urus-rumah-tamu", icon: <Hotel className="size-4" /> },
    { label: "Urus Helpdesk", href: "/superadmin/urus-helpdesk", icon: <MessageSquare className="size-4" /> },
    { label: "Urus Parcel", href: "/superadmin/urus-parcel", icon: <Package className="size-4" /> },
    { label: "Lost & Found", href: "/superadmin/hilang", icon: <EyeOff className="size-4" /> },
    { label: "Direktori Blok", href: "/superadmin/direktori", icon: <MapPin className="size-4" /> },
    { label: "Kad Maya", href: "/superadmin/kad-maya", icon: <QrCode className="size-4" /> },
    { label: "Profil", href: "/superadmin/profile", icon: <User className="size-4" /> },
  ],
}

interface Props {
  role: Role
  userName: string
  roleLabel: string
}

export function DashboardNav({ role, userName, roleLabel }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const items = roleNavItems[role]

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-200 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b p-4">
          <h2 className="font-heading text-lg text-primary-foreground">
            KIZ Super App
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{userName}</p>
          <span className="inline-block mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {roleLabel}
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground font-medium"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t p-3">
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
