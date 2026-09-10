import type { ContentKind } from "@/app/generated/prisma/client"

export const CONTENT_KIND_OPTIONS: ContentKind[] = ["emergency_contact", "living_guide"]

export const CONTENT_KIND_META: Record<
  ContentKind,
  { label: string; icon: string; hint: string }
> = {
  emergency_contact: {
    label: "Emergency contact",
    icon: "sos",
    hint: "Shown in the “Emergency Contact” dashboard widget — e.g. security guard post, KIZ office, duty fellow.",
  },
  living_guide: {
    label: "Life at KIZ guide",
    icon: "menu_book",
    hint: "A “Life at KIZ” card linking to a digital living guide (PDF, page, or external link).",
  },
}

export const CONTENT_KIND_LABELS: Record<ContentKind, string> = {
  emergency_contact: CONTENT_KIND_META.emergency_contact.label,
  living_guide: CONTENT_KIND_META.living_guide.label,
}

export const CONTENT_KIND_ICONS: Record<ContentKind, string> = {
  emergency_contact: CONTENT_KIND_META.emergency_contact.icon,
  living_guide: CONTENT_KIND_META.living_guide.icon,
}
