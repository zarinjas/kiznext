"use client"

import { useEffect, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { motion, useMotionValue, animate } from "framer-motion"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KDialog } from "@/components/kiz/primitives/k-dialog"
import { Surface } from "@/components/kiz/primitives/list-group"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"

export interface OfficeView {
  id: string
  name: string
  description: string | null
  featuredImage: string | null
  gallery: string[]
}

export interface PanoramaView {
  image: string
  leftLabel: string
  leftX: number
  rightLabel: string
  rightX: number
}

interface Props {
  offices: OfficeView[]
  panorama: PanoramaView | null
}

const DEFAULT_LABELS = ["KIZ Administration Office", "UKM Real Estate Office"]

/**
 * PanoramaStage — a wide photo you drag left/right to explore, with two labels
 * glued to the image (left = KIZ admin office, right = UKM Real Estate) so they
 * pan together with the building. Hand-rolled with framer-motion — no 360 lib.
 */
function PanoramaStage({
  src,
  leftLabel,
  leftX,
  rightLabel,
  rightX,
}: {
  src: string
  leftLabel: string
  leftX: number
  rightLabel: string
  rightX: number
}) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState<{ w: number; h: number } | null>(null)
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null)
  const x = useMotionValue(0)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const update = () => {
      const rect = el.getBoundingClientRect()
      setStage({ w: rect.width, h: rect.height })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const stageW = stage?.w ?? 0
  const imgW =
    stage && natural ? Math.max((stage.h * natural.w) / natural.h, stage.w) : 0
  const minX = stageW - imgW
  const maxX = 0

  function panTo(target: number) {
    const clamped = Math.max(minX, Math.min(maxX, target))
    animate(x, clamped, { type: "spring", stiffness: 320, damping: 36 })
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault()
      panTo(x.get() + 140)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      panTo(x.get() - 140)
    }
  }

  const canPan = imgW > stageW

  return (
    <Box
      ref={stageRef}
      tabIndex={0}
      onKeyDown={handleKey}
      role="img"
      aria-label="Draggable panorama of the administration block. Use arrow keys to explore."
      sx={{
        position: "relative",
        overflow: "hidden",
        aspectRatio: { xs: "16 / 10", sm: "16 / 7", md: "21 / 9" },
        borderRadius: `${radius.card}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        touchAction: "pan-y",
        cursor: canPan ? "grab" : "default",
        outline: "none",
        "&:active": { cursor: canPan ? "grabbing" : "default" },
        "&:focus-visible": { boxShadow: `inset 0 0 0 2px ${color.accent[400]}` },
      }}
    >
      {natural && imgW > 0 ? (
        <motion.div
          drag={canPan ? "x" : false}
          dragConstraints={{ left: minX, right: maxX }}
          dragElastic={0.12}
          dragTransition={{ power: 0.25, timeConstant: 220 }}
          style={{ x, width: imgW, position: "absolute", top: 0, left: 0, height: "100%" }}
        >
          <img
            src={src}
            alt="Administration block panorama"
            onLoad={(e) =>
              setNatural({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            draggable={false}
            style={{
              display: "block",
              width: imgW,
              height: "100%",
              objectFit: "cover",
              maxWidth: "none",
              pointerEvents: "none",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          />

          {/* Labels glued to the image — they pan with the building. */}
          <PanoramaLabel x={leftX} text={leftLabel} />
          <PanoramaLabel x={rightX} text={rightLabel} />
        </motion.div>
      ) : (
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.75,
          }}
        >
          <KIcon icon="360" size={30} sx={{ color: "var(--mui-palette-text-disabled)" }} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Add a panorama image in Manage Offices
          </Typography>
        </Box>
      )}

      {/* Fixed stage overlays (do not move with the drag). */}
      <Box
        sx={{
          position: "absolute",
          top: 12,
          left: 12,
          display: "inline-flex",
          alignItems: "center",
          gap: 0.625,
          px: 1,
          py: 0.375,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(9,9,11,0.08)",
          fontSize: 11.5,
          fontWeight: 650,
          color: "#111",
          pointerEvents: "none",
        }}
      >
        <KIcon icon="360" size={14} />
        {canPan ? "Drag to explore" : "360"}
      </Box>

      {canPan && (
        <>
          <Box
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: "50%",
              width: 2,
              transform: "translateX(-50%)",
              background: "rgba(255,255,255,0.55)",
              pointerEvents: "none",
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: "rgba(9,9,11,0.55)",
              backdropFilter: "blur(8px)",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              whiteSpace: "nowrap",
              pointerEvents: "none",
            }}
          >
            ← drag left · right →
          </Box>
        </>
      )}
    </Box>
  )
}

function PanoramaLabel({ x, text }: { x: number; text: string }) {
  return (
    <Box
      sx={{
        position: "absolute",
        top: "12%",
        left: `${x}%`,
        transform: "translateX(-50%)",
        display: "inline-flex",
        alignItems: "center",
        gap: 0.625,
        px: 1.375,
        py: 0.625,
        borderRadius: 999,
        whiteSpace: "nowrap",
        backgroundColor: "rgba(255,255,255,0.86)",
        backdropFilter: "blur(10px)",
        border: "1px solid rgba(9,9,11,0.08)",
        boxShadow: "0 2px 8px rgba(9,9,11,0.10)",
        fontSize: 12.5,
        fontWeight: 650,
        letterSpacing: "-0.01em",
        color: "#111",
        pointerEvents: "none",
        userSelect: "none",
      }}
    >
      <KIcon icon="domain" size={15} />
      {text}
    </Box>
  )
}

function OfficePhotoDialog({ office, onClose }: { office: OfficeView; onClose: () => void }) {
  const images = [office.featuredImage, ...office.gallery].filter(
    (u): u is string => Boolean(u),
  )
  const [main, setMain] = useState(images[0] ?? null)

  return (
    <KDialog open onClose={onClose} title={office.name} icon="domain" maxWidth="md">
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
            <Box component="img" src={main ?? images[0]} alt={office.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
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

export function OfficeViewer({ offices, panorama }: Props) {
  const [active, setActive] = useState<OfficeView | null>(null)

  const leftLabel = offices[0]?.name ?? DEFAULT_LABELS[0]
  const rightLabel = offices[1]?.name ?? DEFAULT_LABELS[1]

  return (
    <Box sx={{ maxWidth: 960, mx: "auto" }}>
      {panorama && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 650, mb: 0.5 }}>Administration block — 360 view</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 1.25 }}>
            Drag the panorama to see both offices, then open the right office below.
          </Typography>
          <PanoramaStage
            src={panorama.image}
            leftLabel={leftLabel}
            leftX={panorama.leftX}
            rightLabel={rightLabel}
            rightX={panorama.rightX}
          />
        </Box>
      )}

      {offices.length === 0 ? (
        <KEmpty icon="domain" title="No offices yet" body="Offices will appear here once added by the admin." />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {offices.map((office) => (
            <Box key={office.id} onClick={() => setActive(office)} sx={{ cursor: "pointer", display: "block" }}>
              <Surface interactive>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box
                    sx={{
                      aspectRatio: "16 / 9",
                      borderRadius: `${radius.card}px`,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "action.hover",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {office.featuredImage ? (
                      <Box component="img" src={office.featuredImage} alt={office.name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <KIcon icon="domain" size={34} sx={{ color: "var(--mui-palette-text-disabled)" }} />
                    )}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 650, letterSpacing: "-0.015em" }}>{office.name}</Typography>
                      {office.description && (
                        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                          {office.description}
                        </Typography>
                      )}
                    </Box>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.375,
                        flexShrink: 0,
                        px: 1,
                        py: 0.5,
                        borderRadius: 999,
                        backgroundColor: color.brand[50],
                        color: color.brand[700],
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      <KIcon icon="photo_library" size={14} />
                      Photos
                    </Box>
                  </Box>
                </Box>
              </Surface>
            </Box>
          ))}
        </Box>
      )}

      {active && <OfficePhotoDialog office={active} onClose={() => setActive(null)} />}
    </Box>
  )
}
