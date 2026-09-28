"use client"

import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { Surface } from "@/components/kiz/primitives/list-group"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { OfficeOpenBadge } from "@/components/shared/office-open-badge"
import { officeTone, officeTitle } from "@/lib/office-meta"
import { color, radius } from "@/lib/theme"

export interface OfficeView {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  categoryLabel: string | null
  categoryIcon: string | null
  categoryTone: string | null
  services: string[]
  location: string | null
  hoursLabel: string | null
  phone: string | null
  featuredImage: string | null
  gallery: string[]
}

interface Props {
  offices: OfficeView[]
  directoryHref?: string
  /** Resolved server-side from office hours so SSR and hydration agree. */
  officeOpen: boolean
}

function OfficePhotoDialog({ office, onClose }: { office: OfficeView; onClose: () => void }) {
  const images = [office.featuredImage, ...office.gallery].filter(
    (u): u is string => Boolean(u),
  )
  const [main, setMain] = useState(images[0] ?? null)

  return (
    <KDialog open onClose={onClose} title={officeTitle(office)} icon="domain" maxWidth="md">
      {images.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            py: 5,
          }}
        >
          <KIcon icon="photo_library" size={30} sx={{ color: "var(--mui-palette-text-disabled)" }} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            No photos uploaded yet.
          </Typography>
        </Box>
      ) : (
        <Box>
          <Box
            sx={{
              aspectRatio: "16 / 9",
              borderRadius: `${radius.card}px`,
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "action.hover",
            }}
          >
            <Box component="img" src={main ?? images[0]} alt={officeTitle(office)} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Box>
          {images.length > 1 && (
            <Box sx={{ display: "flex", gap: 1, mt: 1.5, overflowX: "auto", pb: 0.5 }}>
              {images.map((url, i) => (
                <Box
                  key={i}
                  component="button"
                  type="button"
                  onClick={() => setMain(url)}
                  aria-label={`View photo ${i + 1}`}
                  sx={{
                    width: 72,
                    height: 56,
                    borderRadius: 1.5,
                    overflow: "hidden",
                    padding: 0,
                    border: "1px solid",
                    borderColor: url === main ? color.brand[600] : "divider",
                    cursor: "pointer",
                    flexShrink: 0,
                  }}
                >
                  <Box component="img" src={url} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                </Box>
              ))}
            </Box>
          )}
          {office.description && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 2 }}>
              {office.description}
            </Typography>
          )}
        </Box>
      )}
    </KDialog>
  )
}

function InfoBit({ icon, text }: { icon: string; text: string }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.625, minWidth: 0 }}>
      <KIcon icon={icon} size={16} sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }} />
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        {text}
      </Typography>
    </Box>
  )
}

function OfficeCard({
  office,
  open,
  onOpenPhotos,
  directoryHref,
}: {
  office: OfficeView
  open: boolean
  onOpenPhotos: () => void
  directoryHref?: string
}) {
  const tone = officeTone(office.categoryTone)
  const hasPhotos = Boolean(office.featuredImage) || office.gallery.length > 0
  const title = officeTitle(office)

  return (
    <Surface padded={false} sx={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <Box
        onClick={hasPhotos ? onOpenPhotos : undefined}
        role={hasPhotos ? "button" : undefined}
        tabIndex={hasPhotos ? 0 : undefined}
        aria-label={hasPhotos ? `View photos of ${title}` : undefined}
        onKeyDown={
          hasPhotos
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  onOpenPhotos()
                }
              }
            : undefined
        }
        sx={{
          position: "relative",
          aspectRatio: "16 / 9",
          backgroundColor: "action.hover",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: hasPhotos ? "pointer" : "default",
          outline: "none",
          "&:focus-visible": { boxShadow: `inset 0 0 0 2px ${color.accent[400]}` },
        }}
      >
        {office.featuredImage ? (
          <Box component="img" src={office.featuredImage} alt={title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <KIcon icon="domain" size={34} sx={{ color: "var(--mui-palette-text-disabled)" }} />
        )}
      </Box>

      <Box sx={{ p: { xs: 2, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 1.5, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          {office.categoryLabel ? (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.625,
                px: 1.25,
                py: 0.5,
                borderRadius: "999px",
                backgroundColor: tone.soft,
                color: tone.ink,
                fontSize: 12.5,
                fontWeight: 650,
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}
            >
              <KIcon icon={office.categoryIcon || "domain"} size={15} />
              {office.categoryLabel}
            </Box>
          ) : (
            <Box />
          )}
          <OfficeOpenBadge open={open} openLabel="Open now" closedLabel="Closed now" />
        </Box>

        <Box>
          <Typography sx={{ fontWeight: 700, letterSpacing: "-0.02em", fontSize: { xs: 18, sm: 20 }, lineHeight: 1.25 }}>
            {title}
          </Typography>
          {office.description && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              {office.description}
            </Typography>
          )}
        </Box>

        {office.services.length > 0 && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 650, mb: 0.75 }}>
              Go here for
            </Typography>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 0.75 }}>
              {office.services.map((service, i) => (
                <Box component="li" key={i} sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <KIcon icon="check_circle" color={color.success.main} size={17} sx={{ marginTop: "1px", flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {service}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {(office.location || office.hoursLabel) && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 1, sm: 2 },
              pt: 1.5,
              mt: "auto",
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            {office.location && <InfoBit icon="location_on" text={office.location} />}
            {office.hoursLabel && <InfoBit icon="schedule" text={office.hoursLabel} />}
          </Box>
        )}

        {(directoryHref || office.phone) && (
          <Box sx={{ display: "flex", gap: 1.25, mt: 0.5 }}>
            {directoryHref && (
              <Button
                component={Link}
                href={directoryHref}
                variant="outlined"
                fullWidth
                startIcon={<KIcon icon="location_on" size={18} />}
              >
                View Location
              </Button>
            )}
            {office.phone && (
              <Button
                component="a"
                href={`tel:${office.phone.replace(/\s+/g, "")}`}
                fullWidth
                startIcon={<KIcon icon="call" size={18} />}
              >
                Contact Office
              </Button>
            )}
          </Box>
        )}
      </Box>
    </Surface>
  )
}

export function OfficeViewer({ offices, directoryHref, officeOpen }: Props) {
  const [active, setActive] = useState<OfficeView | null>(null)

  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      {offices.length === 0 ? (
        <KEmpty icon="domain" title="No offices yet" body="Offices will appear here once added by the admin." />
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
            alignItems: "stretch",
          }}
        >
          {offices.map((office) => (
            <OfficeCard
              key={office.id}
              office={office}
              open={officeOpen}
              onOpenPhotos={() => setActive(office)}
              directoryHref={directoryHref}
            />
          ))}
        </Box>
      )}

      {active && <OfficePhotoDialog office={active} onClose={() => setActive(null)} />}
    </Box>
  )
}
