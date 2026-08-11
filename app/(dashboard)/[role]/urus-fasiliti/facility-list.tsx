"use client"

import { useState, useMemo } from "react"
import { Search, Plus, Edit3, Building2, Users, Clock, CalendarDays, CheckCircle, XCircle, IndianRupee } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteButton } from "./delete-button"
import { FacilityForm } from "./facility-form"

interface FacilityItem {
  id: string
  name: string
  blockName: string
  description: string
  featuredImage: string | null
  gallery: string[]
  price: number | null
  capacity: number | null
  timeSlotDuration: number | null
  maxPerDay: number | null
  requiresApproval: boolean
}

interface BlockOption {
  id: string
  name: string
}

interface Props {
  facilities: FacilityItem[]
  blocks: BlockOption[]
  role: string
}

export function FacilityList({ facilities, blocks, role }: Props) {
  const [search, setSearch] = useState("")
  const [blockFilter, setBlockFilter] = useState("all")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return facilities.filter((f) => {
      const matchSearch =
        !search ||
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase())
      const matchBlock = blockFilter === "all" || f.blockName === blockFilter
      return matchSearch && matchBlock
    })
  }, [facilities, search, blockFilter])

  const editingFacility = editingId
    ? facilities.find((f) => f.id === editingId) ?? null
    : null

  const blockNames = useMemo(
    () => [...new Set(facilities.map((f) => f.blockName))],
    [facilities]
  )

  function formatPrice(price: number | null): string {
    if (price == null) return "Free"
    return `RM ${price.toFixed(2)}`
  }

  function formatDuration(minutes: number | null): string {
    if (!minutes) return "—"
    if (minutes < 60) return `${minutes} min`
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}h ${m}m` : `${h} hrs`
  }

  return (
    <>
      {/* Search & Filter Bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search facilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={blockFilter}
          onChange={(e) => setBlockFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All Blocks</option>
          {blockNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <Button onClick={() => setShowForm(true)} className="shrink-0">
          <Plus className="size-4" />
          Add Facility
        </Button>
      </div>

      {/* Facility Grid */}
      {filtered.length === 0 ? (
        <div className="mt-12 rounded-lg border bg-card p-12 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">
            {search || blockFilter !== "all"
              ? "No facilities match your search."
              : "No facilities yet. Click 'Add Facility' to get started."}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((facility) => (
            <Card key={facility.id} size="sm" className="flex flex-col">
              {facility.featuredImage && (
                <div className="aspect-video w-full overflow-hidden rounded-t-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={facility.featuredImage}
                    alt={facility.name}
                    className="size-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="line-clamp-1">{facility.name}</CardTitle>
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {facility.blockName}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-2">
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {facility.description}
                </p>

                <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <IndianRupee className="size-3.5 shrink-0" />
                    {formatPrice(facility.price)}
                  </span>
                  {facility.capacity && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5 shrink-0" />
                      {facility.capacity} pax
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5 shrink-0" />
                    {formatDuration(facility.timeSlotDuration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3.5 shrink-0" />
                    {facility.maxPerDay ?? 3}/day
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs">
                  {facility.requiresApproval ? (
                    <span className="flex items-center gap-1 text-amber-600">
                      <CheckCircle className="size-3.5" />
                      Requires approval
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600">
                      <XCircle className="size-3.5" />
                      Auto-approved
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setEditingId(facility.id)}
                >
                  <Edit3 className="size-3" />
                  Edit
                </Button>
                <DeleteButton
                  facilityId={facility.id}
                  facilityName={facility.name}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add Facility Modal */}
      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Add New Facility">
          <FacilityForm role={role} blocks={blocks} />
        </Modal>
      )}

      {/* Edit Facility Modal */}
      {editingFacility && (
        <Modal
          onClose={() => setEditingId(null)}
          title={`Edit Facility: ${editingFacility.name}`}
        >
          <FacilityForm
            role={role}
            blocks={blocks}
            initialData={{
              id: editingFacility.id,
              name: editingFacility.name,
              blockId: blocks.find((b) => b.name === editingFacility.blockName)?.id ?? "",
              description: editingFacility.description,
              featuredImage: editingFacility.featuredImage,
              gallery: editingFacility.gallery,
              price: editingFacility.price,
              capacity: editingFacility.capacity,
              timeSlotDuration: editingFacility.timeSlotDuration,
              maxPerDay: editingFacility.maxPerDay,
              requiresApproval: editingFacility.requiresApproval,
            }}
          />
        </Modal>
      )}
    </>
  )
}

/** Modal wrapper — mobile-friendly full-screen overlay */
function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode
  onClose: () => void
  title: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 pt-4 pb-8 sm:pt-12">
      <div className="mx-auto w-full max-w-2xl rounded-xl bg-card p-6 shadow-lg sm:mx-4">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-heading text-xl text-primary-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
