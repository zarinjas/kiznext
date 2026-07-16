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
  { label: "Booking", href: "tempahan", icon: Calendar },
  { label: "Guest House", href: "rumah-tamu", icon: Hotel },
  { label: "Helpdesk", href: "helpdesk", icon: LifeBuoy },
  { label: "Parcel", href: "parcel", icon: Package },
  { label: "Lost & Found", href: "hilang", icon: EyeOff },
  { label: "Directory", href: "direktori", icon: MapPin },
]

const firstName = (name: string) => name.trim().split(" ")[0]

export function AhliHome({ user, announcements, bookings, role }: Props) {
  return (
    <div className="px-4 py-5">
      <p className="text-sm text-muted-foreground">Welcome,</p>
      <h1 className="font-heading text-2xl text-primary-foreground">
        {firstName(user.name)} 👋
      </h1>

      {/* Hero card */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-[#004B23] to-[#0a6b34] p-5 text-primary-foreground shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-primary-foreground/70">
              Kad Maya
            </p>
            <p className="mt-1 font-heading text-lg">{user.name}</p>
            <p className="mt-0.5 text-sm text-primary-foreground/80">
              {user.matricId}
            </p>
          </div>
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
            Kolej Ibu Zain
          </span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
          <p className="text-sm text-primary-foreground/80">
            {[user.block, user.roomNumber].filter(Boolean).join(" • ") || "Block not assigned"}
          </p>
          <Link
            href={`/${role}/kad-maya`}
            className="flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline"
          >
            Show QR
            <ChevronRight className="size-3.5" />
          </Link>
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
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card py-4 active:bg-muted"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-primary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="text-center text-xs font-medium text-foreground">
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
            <Link href={`/${role}/tempahan`} className="text-xs font-medium text-primary-foreground">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                {b.status === "approved" ? (
                  <CheckCircle className="size-4 shrink-0 text-green-600" />
                ) : (
                  <Clock className="size-4 shrink-0 text-amber-600" />
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
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
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
          <h2 className="text-sm font-semibold text-foreground">Latest Announcements</h2>
          <Link href={`/${role}/pengumuman`} className="text-xs font-medium text-primary-foreground">
            View All
          </Link>
        </div>
        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No announcements.
          </div>
        ) : (
          <div className="space-y-2">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={`/${role}/pengumuman`}
                className={`flex items-start gap-3 rounded-2xl border border-border bg-card p-3.5 active:bg-muted ${
                  a.isPinned ? "ring-1 ring-primary/30" : ""
                }`}
              >
                <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-primary-foreground ${
                  a.tag === "penting" ? "bg-red-500" : "bg-primary/10"
                }`}>
                  {a.isPinned ? "📌" : <Megaphone className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {a.tag} · {new Date(a.createdAt).toLocaleDateString("ms-MY", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
