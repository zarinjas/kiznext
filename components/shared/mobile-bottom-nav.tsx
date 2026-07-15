"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CalendarDays, QrCode, MessageCircle, LayoutGrid } from "lucide-react"

interface Props {
  role: string
}

export function MobileBottomNav({ role }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    href === `/${role}` ? pathname === href : pathname.startsWith(href)

  const leftItems = [
    { label: "Utama", href: `/${role}`, icon: Home },
    { label: "Tempahan", href: `/${role}/tempahan`, icon: CalendarDays },
  ]

  const rightItems = [
    { label: "Chat", href: `/${role}/chat`, icon: MessageCircle },
    { label: "Lagi", href: `/${role}/lagi`, icon: LayoutGrid },
  ]

  const kadMayaActive = isActive(`/${role}/kad-maya`)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur pb-safe">
      <div className="relative mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-2">
        {leftItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors"
            >
              <Icon
                className={`size-5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={active ? "text-primary-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </Link>
          )
        })}

        <div className="flex flex-col items-center justify-end">
          <Link
            href={`/${role}/kad-maya`}
            className={`-mt-8 flex size-14 items-center justify-center rounded-full border-4 border-background shadow-lg transition-transform active:scale-95 ${
              kadMayaActive ? "bg-[#004B23]" : "bg-primary"
            }`}
          >
            <QrCode className="size-6 text-primary-foreground" />
          </Link>
          <span
            className={`mt-1 text-[11px] font-medium ${
              kadMayaActive ? "text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            Kad Maya
          </span>
        </div>

        {rightItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors"
            >
              <Icon
                className={`size-5 ${active ? "text-primary-foreground" : "text-muted-foreground"}`}
                strokeWidth={active ? 2.4 : 2}
              />
              <span className={active ? "text-primary-foreground" : "text-muted-foreground"}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
