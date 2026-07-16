"use client"

import { useState } from "react"
import { BookingForm } from "./booking-form"
import { Search, MapPin } from "lucide-react"
import Image from "next/image"

interface Facility {
  id: string
  name: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  block: { name: string }
  bookings: { timeSlotStart: Date; timeSlotEnd: Date }[]
}

interface Props {
  facilities: Facility[]
  role: string
  compact?: boolean
  userId: string
}

export function FacilitiesList({ facilities, role, compact = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  const filtered = facilities.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.description.toLowerCase().includes(search.toLowerCase())
  )

  if (selected) {
    const facility = facilities.find((f) => f.id === selected)
    if (!facility) return null

    return (
      <div className={compact ? "rounded-2xl border border-border bg-card p-5" : "rounded-lg border bg-card p-6"}>
        <BookingForm facility={facility} role={role} compact={compact} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search facilities..."
          className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-4 text-sm"
        />
      </div>

      {/* Facility Grid */}
      <div className={compact ? "space-y-3" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
        {filtered.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelected(f.id)}
            className="w-full text-left rounded-2xl border border-border bg-card overflow-hidden transition-all hover:shadow-md active:scale-[0.98]"
          >
            {f.featuredImage ? (
              <div className="relative aspect-video w-full">
                <Image src={f.featuredImage} alt={f.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-muted">
                <span className="text-4xl opacity-20">🏛️</span>
              </div>
            )}
            <div className={compact ? "p-3.5 space-y-1" : "p-4 space-y-1"}>
              <h3 className="font-medium text-foreground truncate">{f.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{f.description}</p>
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" /> {f.block.name}
                </span>
                <span className="text-xs font-medium text-foreground">
                  {f.price ? `RM${f.price.toFixed(2)}` : "Free"}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No facilities found.
        </div>
      )}
    </div>
  )
}
