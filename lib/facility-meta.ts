/**
 * Facilities directory meta — statuses, sections and button copy shared by the
 * member directory, the facility cards and the admin forms.
 *
 * A facility is either `bookable` (needs a reservation → appears under the
 * "Bookable Facilities" directory section) or a shared facility (available
 * without advance booking → "Shared Facilities"). `status` is orthogonal:
 * `open` now, or `coming_soon`.
 */
import type { FacilitySection, FacilityStatus } from "@/app/generated/prisma/client"

export interface FacilityStatusMeta {
  label: string
  /** Semantic tone key for StatusChip; bookable/open cards may hide it. */
  tone: "success" | "warning" | "info" | "danger" | "neutral"
  icon: string
}

export const FACILITY_STATUS_META: Record<FacilityStatus, FacilityStatusMeta> = {
  open: { label: "Open", tone: "success", icon: "check_circle" },
  coming_soon: { label: "Coming soon", tone: "warning", icon: "schedule" },
}

export interface FacilitySectionMeta {
  /** Fixed top-level heading on the member directory. */
  title: string
  subtitle: string
  /** Shared facilities (kemudahan umum) never get a booking CTA. */
  bookable: boolean
  icon: string
  /** Tone for the small section chip. */
  tone: "info" | "neutral"
}

export const FACILITY_SECTION_META: Record<FacilitySection, FacilitySectionMeta> = {
  bookable: {
    title: "Bookable Facilities",
    subtitle: "Spaces that require a reservation before use.",
    bookable: true,
    icon: "event_available",
    tone: "info",
  },
  shared: {
    title: "Shared Facilities",
    subtitle: "Facilities available to residents without advance booking.",
    bookable: false,
    icon: "apartment",
    tone: "neutral",
  },
}

/**
 * CTA shown on a facility card.
 * - Bookable & open         → "View & Book" (goes to the booking flow).
 * - Shared & open           → "View Details" (info only, no booking).
 * - Bookable & coming soon  → "View Details" (not bookable yet).
 * - Shared & coming soon    → "Learn More" (teaser; not available yet).
 */
export function facilityCtaLabel(section: FacilitySection, status: FacilityStatus): string {
  if (status === "coming_soon") return section === "bookable" ? "View Details" : "Learn More"
  return section === "bookable" ? "View & Book" : "View Details"
}

/** True when the CTA leads into the booking flow (only open, bookable). */
export function facilityCanBook(section: FacilitySection, status: FacilityStatus): boolean {
  return section === "bookable" && status === "open"
}
