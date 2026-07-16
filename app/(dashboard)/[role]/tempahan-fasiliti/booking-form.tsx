"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createFacilityBooking } from "./actions"
import { Calendar, Clock, MapPin, ImageIcon } from "lucide-react"
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
  facility: Facility
  role: string
  compact?: boolean
}

export function BookingForm({ facility, role, compact = false }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<"detail" | "form" | "done">("detail")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [bookingRef, setBookingRef] = useState("")

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split("T")[0]

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = new FormData(e.currentTarget)
    form.set("facilityId", facility.id)

    try {
      const ref = await createFacilityBooking(form)
      setBookingRef(ref)
      setStep("done")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat berlaku")
    } finally {
      setLoading(false)
    }
  }

  if (step === "done") {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100">
          <span className="text-2xl">✅</span>
        </div>
        <p className="text-lg font-semibold text-foreground">Tempahan Dihantar!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No. Rujukan: <span className="font-mono font-bold">{bookingRef}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Tempahan sedang menunggu kelulusan admin. Anda akan menerima notifikasi setelah diluluskan.
        </p>
        <Button className="mt-6 w-full" onClick={() => router.push(`/${role}/tempahan-fasiliti`)}>
          Kembali
        </Button>
      </div>
    )
  }

  if (step === "form") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-foreground">Tempah: {facility.name}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={() => setStep("detail")}>
            Kembali
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Tarikh</Label>
          <Input id="date" name="date" type="date" min={minDate} required />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="timeStart">Masa Mula</Label>
            <Input id="timeStart" name="timeStart" type="time" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timeEnd">Masa Tamat</Label>
            <Input id="timeEnd" name="timeEnd" type="time" required />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purpose">Tujuan Tempahan</Label>
          <select
            id="purpose"
            name="purpose"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            required
          >
            <option value="">Pilih tujuan...</option>
            <option value="Mesyuarat">Mesyuarat</option>
            <option value="Program">Program</option>
            <option value="Riadah">Riadah</option>
            <option value="Belajar/Berkumpulan">Belajar / Berkumpulan</option>
            <option value="Lain-lain">Lain-lain</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Nota (optional)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            placeholder="Contoh: perlu projektor, 20 orang..."
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Memproses..." : "Hantar Tempahan"}
        </Button>
      </form>
    )
  }

  // Detail view
  const bookedDates = facility.bookings.map((b) => ({
    start: new Date(b.timeSlotStart),
    end: new Date(b.timeSlotEnd),
  }))

  return (
    <div className={compact ? "space-y-4" : ""}>
      {/* Featured Image */}
      {facility.featuredImage && (
        <div className="relative aspect-video w-full overflow-hidden rounded-xl">
          <Image
            src={facility.featuredImage}
            alt={facility.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Gallery */}
      {facility.gallery.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {facility.gallery.map((url, i) => (
            <div key={i} className="relative size-20 shrink-0 overflow-hidden rounded-lg">
              <Image src={url} alt="" fill className="object-cover" />
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-heading text-lg text-primary-foreground">{facility.name}</h2>
        <p className="text-sm text-muted-foreground">{facility.description}</p>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" /> {facility.block.name}
          </span>
          {facility.capacity && (
            <span className="flex items-center gap-1">
              👥 {facility.capacity} orang
            </span>
          )}
          <span className="flex items-center gap-1 font-medium text-foreground">
            {facility.price ? `RM ${facility.price.toFixed(2)}` : "Percuma"}
          </span>
        </div>

        {/* Booked dates summary */}
        {bookedDates.length > 0 && (
          <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
            <p className="font-medium">📅 Tempahan sedia ada: {bookedDates.length}</p>
            <p className="mt-1">
              Sila semak ketersediaan sebelum membuat tempahan baru.
            </p>
          </div>
        )}
      </div>

      <Button className="w-full" onClick={() => setStep("form")}>
        Tempah Sekarang
      </Button>
    </div>
  )
}
