import Link from "next/link"
import {
  Calendar,
  Hotel,
  LifeBuoy,
  Package,
  EyeOff,
  MapPin,
  ChevronRight,
  Megaphone,
  CheckCircle,
  Clock,
  QrCode,
} from "lucide-react"

interface Props {
  user: {
    name: string
    matricId: string
    block: string | null
    roomNumber: string | null
  }
  announcements: {
    id: string
    title: string
    tag: string
    isPinned: boolean
    attachmentType: string | null
    createdAt: Date
  }[]
  bookings: {
    id: string
    status: string
    timeSlotStart: Date
    facility: { name: string }
  }[]
  role: string
}

const quickActions = [
  {
    label: "Booking",
    href: "tempahan",
    icon: Calendar,
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 text-blue-600",
  },
  {
    label: "Guest House",
    href: "rumah-tamu",
    icon: Hotel,
    gradient: "from-purple-500 to-purple-600",
    bg: "bg-purple-50 text-purple-600",
  },
  {
    label: "Helpdesk",
    href: "helpdesk",
    icon: LifeBuoy,
    gradient: "from-orange-500 to-orange-600",
    bg: "bg-orange-50 text-orange-600",
  },
  {
    label: "Parcel",
    href: "parcel",
    icon: Package,
    gradient: "from-amber-500 to-amber-600",
    bg: "bg-amber-50 text-amber-600",
  },
  {
    label: "Lost & Found",
    href: "hilang",
    icon: EyeOff,
    gradient: "from-rose-500 to-rose-600",
    bg: "bg-rose-50 text-rose-600",
  },
  {
    label: "Directory",
    href: "direktori",
    icon: MapPin,
    gradient: "from-teal-500 to-teal-600",
    bg: "bg-teal-50 text-teal-600",
  },
]

const firstName = (name: string) => name.trim().split(" ")[0]

export function AhliHome({ user, announcements, bookings, role }: Props) {
  return (
    <div className="px-4 py-5">
      <p className="text-sm text-muted-foreground">Welcome,</p>
      <h1 className="font-heading text-2xl text-foreground">
        {firstName(user.name)} 👋
      </h1>

      {/* Hero eCard */}
      <div className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#004B23] via-[#006633] to-[#008844] p-5 text-white shadow-lg shadow-[#004B23]/20">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-white/[0.04]" />
        <div className="absolute -bottom-6 right-12 size-20 rounded-full bg-white/[0.06]" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-white/60">
                KIZ eCard
              </p>
              <p className="mt-1 font-heading text-lg font-semibold">{user.name}</p>
              <p className="mt-0.5 text-sm font-medium text-white/80">
                {user.matricId}
              </p>
            </div>
            <span className="rounded-full bg-white/[0.12] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
              Kolej Ibu Zain
            </span>
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-white/[0.12] pt-3">
            <p className="text-sm font-medium text-white/70">
              {[user.block, user.roomNumber].filter(Boolean).join("  •  ") || "Block not assigned"}
            </p>
            <Link
              href={`/${role}/kad-maya`}
              className="flex items-center gap-1.5 rounded-full bg-white/[0.15] px-3.5 py-1.5 text-sm font-semibold backdrop-blur-sm transition active:bg-white/25"
            >
              <QrCode className="size-3.5" />
              Show QR
            </Link>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Quick Access</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={`/${role}/${item.href}`}
                className="group flex flex-col items-center gap-2.5 rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition active:scale-95 active:bg-muted/50"
              >
                <span
                  className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} shadow-md shadow-current/15`}
                >
                  <Icon className="size-5 text-white" />
                </span>
                <span className="text-center text-[11px] font-semibold text-foreground">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent bookings */}
      {bookings.length > 0 && (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Bookings</h2>
            <Link
              href={`/${role}/tempahan`}
              className="text-xs font-semibold text-primary"
            >
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-white p-3.5 shadow-sm"
              >
                {b.status === "approved" ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-green-100">
                    <CheckCircle className="size-4 text-green-600" />
                  </span>
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Clock className="size-4 text-amber-600" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {b.facility.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.timeSlotStart).toLocaleDateString("ms-MY", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    b.status === "approved"
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {b.status === "approved" ? "Approved" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Announcements */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Latest Announcements
          </h2>
          <Link
            href={`/${role}/pengumuman`}
            className="text-xs font-semibold text-primary"
          >
            View All
          </Link>
        </div>
        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-white p-6 text-center text-sm text-muted-foreground shadow-sm">
            No announcements.
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={`/${role}/pengumuman`}
                className={`flex items-start gap-3 rounded-2xl border border-border/60 bg-white p-3.5 shadow-sm transition active:bg-muted/50 ${
                  a.isPinned ? "ring-2 ring-primary/25" : ""
                }`}
              >
                <span
                  className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-white ${
                    a.tag === "penting"
                      ? "bg-gradient-to-br from-red-500 to-red-600"
                      : "bg-gradient-to-br from-[#004B23] to-[#006633]"
                  }`}
                >
                  {a.isPinned ? (
                    <span className="text-sm">!</span>
                  ) : (
                    <Megaphone className="size-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {a.tag} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("ms-MY", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 self-center text-muted-foreground/40" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
