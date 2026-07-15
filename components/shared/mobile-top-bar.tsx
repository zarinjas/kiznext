"use client"

import Link from "next/link"
import { signOut } from "next-auth/react"
import { Bell, LogOut } from "lucide-react"
import { useState } from "react"

interface Props {
  userName: string
  roleLabel: string
  role: string
}

export function MobileTopBar({ userName, roleLabel, role }: Props) {
  const [open, setOpen] = useState(false)
  const initial = userName.trim().charAt(0).toUpperCase() || "K"

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card/95 px-4 pt-safe backdrop-blur pb-3 pt-3">
      <Link href={`/${role}`} className="flex items-center gap-2">
        <span className="font-heading text-lg leading-none text-primary-foreground">
          KIZ
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
          {roleLabel}
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <button
          className="relative flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground"
          aria-label="Notifikasi"
        >
          <Bell className="size-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-full bg-primary font-heading text-sm text-primary-foreground"
          >
            {initial}
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border bg-card p-1 shadow-lg">
                <Link
                  href={`/${role}/profile`}
                  className="block rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                  onClick={() => setOpen(false)}
                >
                  Profil Saya
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="size-3.5" />
                  Log Keluar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
