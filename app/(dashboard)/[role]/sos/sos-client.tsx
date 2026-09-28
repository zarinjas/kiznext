"use client"

import { useCallback, useRef, useState } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { keyframes } from "@mui/system"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, font, radius } from "@/lib/theme"
import type { SosTarget } from "@/lib/sos"

/**
 * SosScreen — the full-screen emergency call experience.
 *
 * One big hold-to-confirm SOS button sits at the centre. Holding it for 3
 * seconds fills the ring and dials the smart-routed number: the KIZ office
 * during office hours, the on-call duty fellow outside them. Releasing early
 * resets the ring, so a panicked tap can never misdial. Below the button, the
 * static emergency-contact list stays available as a quiet fallback.
 */

const HOLD_MS = 3000
const SIZE = 224
const STROKE = 7
const R = (SIZE - STROKE) / 2
const CIRC = 2 * Math.PI * R

interface Contact {
  id: string
  title: string
  phone: string | null
  subtitle: string | null
}

const ripple = keyframes`
  0%   { transform: scale(1); opacity: 0.55; }
  70%  { opacity: 0; }
  100% { transform: scale(2.15); opacity: 0; }
`

const norm = (phone: string) => phone.replace(/[^+\d]/g, "")

export function SosScreen({ target, contacts }: { target: SosTarget; contacts: Contact[] }) {
  const [progress, setProgress] = useState(0)
  const [holding, setHolding] = useState(false)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const phone = target.phone
  const dialNumber = phone ? norm(phone) : null

  const clear = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startRef.current = null
  }, [])

  const start = useCallback(() => {
    if (!dialNumber) return
    setHolding(true)
    setProgress(0)
    startRef.current = null
    const step = (now: number) => {
      if (startRef.current == null) startRef.current = now
      const p = Math.min((now - startRef.current) / HOLD_MS, 1)
      setProgress(p)
      if (p >= 1) {
        clear()
        setHolding(false)
        if (dialNumber) window.location.href = `tel:${dialNumber}`
        return
      }
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
  }, [dialNumber, clear])

  const cancel = useCallback(() => {
    clear()
    setHolding(false)
    setProgress(0)
  }, [clear])

  const dashOffset = CIRC * (1 - progress)

  return (
    <Box sx={{ maxWidth: 520, mx: "auto", py: { xs: 1, sm: 3 } }}>
      {/* Smart routing status */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
          p: { xs: 2, sm: 2.25 },
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: `${radius.input}px`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: target.officeOpen ? color.success.soft : color.warning.soft,
            color: target.officeOpen ? color.success.ink : color.warning.ink,
          }}
        >
          <KIcon icon={target.officeOpen ? "domain" : "bedtime"} size={20} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 650, fontSize: 14, letterSpacing: "-0.01em" }}>
            {target.officeOpen ? "The office is open now" : "It's after office hours"}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
            {target.configured ? (
              <>
                You&apos;ll be connected to{" "}
                <Box component="span" sx={{ fontWeight: 650, color: "text.primary" }}>
                  {target.label}
                </Box>{" "}
                <Box component="span" sx={{ fontFamily: font.mono, color: "text.secondary" }}>
                  {phone}
                </Box>
              </>
            ) : (
              "SOS routing isn't configured yet — the numbers below still work."
            )}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
            Office hours · Monday–Friday, 8:00 AM – 5:00 PM.
          </Typography>
        </Box>
      </Box>

      {/* SOS hold button */}
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: { xs: 4, sm: 6 } }}>
        <Box sx={{ position: "relative", width: SIZE, height: SIZE }}>
          {/* Radar ripples */}
          {!holding &&
            [0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "2px solid",
                  borderColor: color.danger.main,
                  animation: `${ripple} 2.4s ease-out ${i * 0.8}s infinite`,
                  pointerEvents: "none",
                }}
              />
            ))}

          {/* Progress ring */}
          <Box
            component="svg"
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              transform: "rotate(-90deg)",
            }}
          >
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={color.danger.soft}
              strokeWidth={STROKE}
            />
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={color.danger.main}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 40ms linear" }}
            />
          </Box>

          {/* Button */}
          <Box
            component="button"
            type="button"
            disabled={!dialNumber}
            onPointerDown={start}
            onPointerUp={cancel}
            onPointerLeave={cancel}
            onPointerCancel={cancel}
            onContextMenu={(e) => e.preventDefault()}
            aria-label={dialNumber ? "Hold to call emergency number" : "SOS not configured"}
            sx={{
              position: "absolute",
              inset: STROKE * 2,
              borderRadius: "50%",
              border: "none",
              cursor: dialNumber ? "pointer" : "not-allowed",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.5,
              color: "#fff",
              backgroundColor: dialNumber ? color.danger.main : color.neutral.main,
              backgroundImage: dialNumber
                ? `radial-gradient(120% 120% at 30% 20%, ${color.danger.main} 0%, ${color.danger.ink} 100%)`
                : "none",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              outline: "none",
              transition: "transform 120ms ease, opacity 120ms ease",
              "&:active": { transform: "scale(0.96)" },
              "&:disabled": { opacity: 0.6 },
            }}
          >
            <KIcon icon="sos" size={42} filled />
            <Typography sx={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.08em", lineHeight: 1 }}>
              {holding ? "KEEP HOLDING" : dialNumber ? "SOS" : "NOT SET"}
            </Typography>
            <Typography sx={{ fontSize: 10.5, fontWeight: 550, opacity: 0.85 }}>
              {holding ? "Connecting…" : dialNumber ? "hold to call" : "configure in settings"}
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="caption"
          sx={{ color: "text.secondary", mt: 2.5, textAlign: "center", maxWidth: 340 }}
        >
          Press and hold for 3 seconds to call. Releasing early cancels — no accidental emergency calls.
        </Typography>
      </Box>

      {/* Secondary contacts */}
      <Box sx={{ mt: { xs: 4, sm: 6 } }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 650,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "text.disabled",
            mb: 1.25,
            px: 0.5,
          }}
        >
          Other emergency numbers
        </Typography>
        <Box
          sx={{
            borderRadius: `${radius.card}px`,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            overflow: "hidden",
          }}
        >
          {contacts.length === 0 ? (
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", p: 2 }}>
              No emergency contacts have been added yet.
            </Typography>
          ) : (
            contacts.map((c, i) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 2,
                  py: 1.5,
                  ...(i > 0 && { borderTop: "1px solid", borderColor: "divider" }),
                }}
              >
                <KIcon icon="call" size={16} sx={{ color: "text.disabled", flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{c.title}</Typography>
                  {c.subtitle && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {c.subtitle}
                    </Typography>
                  )}
                </Box>
                {c.phone ? (
                  <Box
                    component="a"
                    href={`tel:${norm(c.phone)}`}
                    sx={{
                      fontSize: 13,
                      fontWeight: 650,
                      color: color.danger.ink,
                      textDecoration: "none",
                      whiteSpace: "nowrap",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    {c.phone}
                  </Box>
                ) : null}
              </Box>
            ))
          )}
        </Box>
      </Box>
    </Box>
  )
}
