import Link from "next/link"
import {
  CheckSquare,
  Hotel,
  MessageSquare,
  Package,
  EyeOff,
  Clock,
} from "lucide-react"

interface Props {
  title: string
  description: string
  userName: string
  role: string
  stats: {
    pendingFacility: number
    pendingGuestHouse: number
    openTickets: number
    activeParcels: number
    activeLostFound: number
  }
}

export function AdminHome({ title, description, userName, role, stats }: Props) {
  const canManage = role === "admin_kiz" || role === "superadmin"

  const cards = [
    {
      label: "Tempahan Menunggu",
      value: stats.pendingFacility,
      href: "urus-tempahan",
      icon: CheckSquare,
      tone: "text-amber-700 bg-amber-100",
    },
    {
      label: "Rumah Tamu Menunggu",
      value: stats.pendingGuestHouse,
      href: "urus-rumah-tamu",
      icon: Hotel,
      tone: "text-blue-700 bg-blue-100",
    },
    {
      label: "Ticket Terbuka",
      value: stats.openTickets,
      href: "urus-helpdesk",
      icon: MessageSquare,
      tone: "text-purple-700 bg-purple-100",
    },
    {
      label: "Parcel Belum Diambil",
      value: stats.activeParcels,
      href: "urus-parcel",
      icon: Package,
      tone: "text-orange-700 bg-orange-100",
    },
    {
      label: "Lost & Found Aktif",
      value: stats.activeLostFound,
      href: "hilang",
      icon: EyeOff,
      tone: "text-rose-700 bg-rose-100",
    },
  ]

  const visibleCards = canManage
    ? cards
    : cards.filter((c) => c.href === "hilang")

  const totalPending = stats.pendingFacility + stats.pendingGuestHouse

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-primary-foreground">{title}</h1>
          <p className="mt-1 text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-primary font-heading text-sm text-primary-foreground">
            {userName.trim().charAt(0).toUpperCase() || "K"}
          </span>
          <div>
            <p className="text-xs text-muted-foreground">Selamat datang,</p>
            <p className="text-sm font-medium text-foreground">{userName}</p>
          </div>
        </div>
      </div>

      {canManage && totalPending > 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Clock className="size-5 shrink-0 text-amber-700" />
          <p className="text-sm text-amber-800">
            Ada <span className="font-semibold">{totalPending}</span> tempahan menunggu kelulusan anda.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {visibleCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={`/${role}/${card.href}`}
              className="group rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <span className={`inline-flex size-10 items-center justify-center rounded-full ${card.tone}`}>
                <Icon className="size-5" />
              </span>
              <p className="mt-4 font-heading text-3xl text-primary-foreground">{card.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{card.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-heading text-lg text-primary-foreground">Tindakan Pantas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {canManage && (
              <>
                <Link
                  href={`/${role}/urus-pengumuman`}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/80"
                >
                  Siar Pengumuman
                </Link>
                <Link
                  href={`/${role}/urus-parcel`}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  Daftar Parcel
                </Link>
              </>
            )}
            <Link
              href={`/${role}/chat`}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Chat Komuniti
            </Link>
            {!canManage && (
              <Link
                href={`/${role}/pengumuman`}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Lihat Pengumuman
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
