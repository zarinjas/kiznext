"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Grid from "@mui/material/Grid"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { motion } from "framer-motion"
import { BookingForm } from "./booking-form"
import { KIcon } from "@/components/kiz/primitives/icon"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"
import {
  FACILITY_SECTION_META,
  FACILITY_STATUS_META,
  facilityCtaLabel,
  facilityCanBook,
  type FacilitySectionMeta,
} from "@/lib/facility-meta"
import type { FacilityDirectorySection, FacilityCardData } from "./page"

export function FacilitiesDirectory({
  sections,
  role,
}: {
  sections: FacilityDirectorySection[]
  role: string
}) {
  const [bookingId, setBookingId] = useState<string | null>(null)
  const [info, setInfo] = useState<FacilityCardData | null>(null)

  if (bookingId) {
    const facility = sections
      .flatMap((s) => s.groups)
      .flatMap((g) => g.facilities)
      .find((f) => f.id === bookingId)
    if (!facility) return null
    return <BookingForm facility={facility} role={role} onBack={() => setBookingId(null)} />
  }

  if (sections.length === 0) {
    return (
      <KEmpty
        icon="apartment"
        title="No facilities listed yet"
        body="Check back soon — facilities are being added by the KIZ office."
      />
    )
  }

  return (
    <Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {sections.map((section) => (
          <DirectorySection
            key={section.section}
            meta={FACILITY_SECTION_META[section.section]}
            section={section}
            onBook={(id) => setBookingId(id)}
            onInfo={setInfo}
          />
        ))}
      </Box>

      {info && <FacilityInfoDialog facility={info} onClose={() => setInfo(null)} />}
    </Box>
  )
}

function DirectorySection({
  meta,
  section,
  onBook,
  onInfo,
}: {
  meta: FacilitySectionMeta
  section: FacilityDirectorySection
  onBook: (id: string) => void
  onInfo: (f: FacilityCardData) => void
}) {
  return (
    <Box>
      {/* Section heading */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, mb: 0.75 }}>
        <Box
          sx={{
            width: 46,
            height: 46,
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: meta.tone === "info" ? color.info.soft : color.canvasSunk,
            color: meta.tone === "info" ? color.info.ink : color.ink[700],
            flexShrink: 0,
          }}
        >
          <KIcon icon={meta.icon} size={24} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{ fontSize: { xs: 24, sm: 26 }, fontWeight: 660, letterSpacing: "-0.032em", lineHeight: 1.15 }}
          >
            {meta.title}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25, maxWidth: 560 }}>
            {meta.subtitle}
          </Typography>
        </Box>
      </Box>

      {section.groups.length === 0 ? (
        <KEmpty
          compact
          icon={meta.icon}
          title="Nothing here yet"
          body="Facilities in this group will appear once they're added."
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3.5, mt: 2.5 }}>
          {section.groups.map((group) => (
            <Box key={group.name}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 650, color: "text.secondary", mb: 1.25, px: { xs: 0.5, sm: 0 } }}
              >
                {group.name}
              </Typography>
              <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                {group.facilities.map((f, i) => {
                  const canBook = facilityCanBook(meta.bookable ? "bookable" : "shared", f.status)
                  const cta = facilityCtaLabel(meta.bookable ? "bookable" : "shared", f.status)
                  const showStatus = !(canBook && f.status === "open")
                  const status = f.status === "open" ? "open" : "coming_soon"
                  return (
                    <Grid key={f.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: Math.min(i * 0.04, 0.3) }}
                        style={{ height: "100%" }}
                      >
                        <FacilityCard
                          facility={f}
                          cta={cta}
                          canBook={canBook}
                          status={status}
                          showStatus={showStatus}
                          onAction={() => (canBook ? onBook(f.id) : onInfo(f))}
                        />
                      </motion.div>
                    </Grid>
                  )
                })}
              </Grid>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}

function FacilityCard({
  facility,
  cta,
  canBook,
  status,
  showStatus,
  onAction,
}: {
  facility: FacilityCardData
  cta: string
  canBook: boolean
  status: "open" | "coming_soon"
  showStatus: boolean
  onAction: () => void
}) {
  return (
    <Box
      onClick={onAction}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onAction()
        }
      }}
      sx={{
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        cursor: canBook ? "pointer" : "pointer",
        transition: "border-color 160ms",
        WebkitTapHighlightColor: "transparent",
        "&:active": { backgroundColor: "action.hover" },
        "@media (hover: hover)": { "&:hover": { borderColor: color.borderStrong } },
        outline: "none",
      }}
    >
      {facility.featuredImage ? (
        <Box component="img" src={facility.featuredImage} alt={facility.name} sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
      ) : (
        <Box
          sx={{
            width: "100%",
            aspectRatio: "16/9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.canvasSunk,
            color: "text.disabled",
          }}
        >
          <KIcon icon={canBook ? "meeting_room" : "apartment"} size={34} />
        </Box>
      )}

      <Box sx={{ p: { xs: 2, sm: 2.25 }, flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
          <Typography
            sx={{ flex: 1, minWidth: 0, fontWeight: 620, letterSpacing: "-0.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          >
            {facility.name}
          </Typography>
          {showStatus && (
            <Box sx={{ flexShrink: 0 }}>
              <StatusChip status={status} tone={FACILITY_STATUS_META[status].tone} />
            </Box>
          )}
        </Box>

        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {facility.description}
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "text.secondary", mt: 1.25, flexWrap: "wrap" }}>
          <KIcon icon="location_on" size={15} />
          <Typography variant="caption" sx={{ fontWeight: 550 }}>
            {facility.block.name}
          </Typography>
          {facility.capacity ? (
            <>
              <Box component="span" sx={{ color: "divider" }}>•</Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <KIcon icon="group" size={14} />
                <Typography variant="caption">{facility.capacity}</Typography>
              </Box>
            </>
          ) : null}
          {facility.price != null && (
            <>
              <Box component="span" sx={{ color: "divider" }}>•</Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                <KIcon icon="payments" size={14} />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.primary" }}>
                  RM {facility.price.toFixed(2)}
                </Typography>
              </Box>
            </>
          )}
        </Box>

        <Box sx={{ mt: "auto", pt: 1.75, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant={canBook ? "contained" : "outlined"}
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onAction()
            }}
            startIcon={<KIcon icon={canBook ? "event_available" : "open_in_new"} size={16} />}
            sx={{ borderRadius: `${radius.button}px`, textTransform: "none" }}
          >
            {cta}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

function FacilityInfoDialog({ facility, onClose }: { facility: FacilityCardData; onClose: () => void }) {
  const status = facility.status === "open" ? "open" : "coming_soon"
  const statusMeta = FACILITY_STATUS_META[status]

  return (
    <KDialog open onClose={onClose} title={facility.name} icon="apartment" maxWidth="sm">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {facility.featuredImage && (
          <Box component="img" src={facility.featuredImage} alt={facility.name} sx={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", borderRadius: `${radius.card}px` }} />
        )}
        {facility.gallery.length > 0 && (
          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5 }}>
            {facility.gallery.map((url, i) => (
              <Box key={i} component="img" src={url} alt="" sx={{ width: 80, height: 80, objectFit: "cover", borderRadius: `${radius.input}px`, flexShrink: 0 }} />
            ))}
          </Box>
        )}

        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {facility.description}
        </Typography>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25, mt: 0.5 }}>
          <StatusChip status={status} tone={statusMeta.tone} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
            <KIcon icon="location_on" size={15} />
            <Typography variant="body2">{facility.block.name}</Typography>
          </Box>
          {facility.capacity ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
              <KIcon icon="group" size={15} />
              <Typography variant="body2">{facility.capacity} people</Typography>
            </Box>
          ) : null}
          {facility.price != null && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <KIcon icon="payments" size={15} />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                RM {facility.price.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>

        {status === "coming_soon" && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {facility.bookable
              ? "This facility is coming soon. Booking will open here once it&apos;s available."
              : "This shared facility is coming soon. It will show up here once it&apos;s ready for residents."}
          </Typography>
        )}

        {!facility.bookable && status === "open" && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            This is a shared facility — no advance booking needed. Just walk in during operating hours.
          </Typography>
        )}

        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Box>
      </Box>
    </KDialog>
  )
}
