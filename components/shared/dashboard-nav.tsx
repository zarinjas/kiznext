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
    { label: "Kad Maya", href: "/ahli/kad-maya", icon: <QrCode className="size-4" /> },
    { label: "Profil", href: "/ahli/profile", icon: <User className="size-4" /> },
  ],
  admin_kiz: [
    { label: "Dashboard", href: "/admin_kiz", icon: <LayoutDashboard className="size-4" /> },
    { label: "Kad Maya", href: "/admin_kiz/kad-maya", icon: <QrCode className="size-4" /> },
    { label: "Profil", href: "/admin_kiz/profile", icon: <User className="size-4" /> },
  ],
  pengetua: [
    { label: "Dashboard", href: "/pengetua", icon: <LayoutDashboard className="size-4" /> },
    { label: "Profil", href: "/pengetua/profile", icon: <User className="size-4" /> },
  ],
  superadmin: [
    { label: "Dashboard", href: "/superadmin", icon: <LayoutDashboard className="size-4" /> },
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
