import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { color, elevation, font, radius } from "@/lib/theme"

/**
 * StudentCardFace — official institutional KIZ Digital Student Card for the
 * "ahli" (student) role, modelled on the UKM residential-college ID layout.
 *
 * Content hierarchy (top → bottom):
 *   1. Two logos in a top row — UKM (left) and KIZ (right).
 *   2. "KOLEJ IBU ZAIN" main heading + "myKIZ DIGITAL STUDENT CARD" subheading.
 *   3. A green "ACTIVE STUDENT" status badge.
 *   4. A large centred passenger-style photo (rounded corners + soft shadow).
 *   5. The student's name in bold uppercase.
 *   6. The Student ID (matric number), centred below the name — no box.
 *   7. A short centred divider bar (~40%), then the residence lines:
 *      "Block K18A · Room 101 · Bed A" and "Residential Session 2026/2027".
 *   8. The QR code (no container) near the bottom.
 *   9. A small "Valid until" date beneath the QR — the room check-in date
 *      plus six months (one semester); hidden when there is no check-in.
 *
 * The background is admin-configurable (`backgroundUrl`); the layout keeps a
 * quiet scrim so text and photo stay readable over any uploaded image.
 */
export function StudentCardFace({
  name,
  matricId,
  blockName,
  roomNumber,
  bed,
  session,
  avatarUrl,
  backgroundUrl,
  ukmLogoUrl,
  kizLogoUrl,
  qrDataUrl,
  validUntil,
  roleLabel,
  idLabel,
}: {
  name: string
  /** Student ID — the matric number, always shown below the name. */
  matricId: string
  /** Dormitory block name, e.g. "K18A". null hides the residence lines. */
  blockName?: string | null
  /** Room number within the block, e.g. "101". */
  roomNumber?: string | null
  /** Bed letter "A"/"B", null for single rooms. */
  bed?: string | null
  /** Academic session, e.g. "Session 2026/2027". */
  session?: string | null
  avatarUrl: string | null
  /** Admin-uploaded card background (cover). Falls back to a clean white card. */
  backgroundUrl: string | null
  /** UKM crest — left logo slot. Falls back to a "UKM" monogram tile. */
  ukmLogoUrl?: string | null
  /** KIZ logo — right logo slot. Falls back to a "KIZ" monogram tile. */
  kizLogoUrl?: string | null
  qrDataUrl?: string | null
  /** "Valid until" line, e.g. "30 September 2027". */
  validUntil?: string | null
  /**
   * Non-student role label (e.g. "Admin KIZ"). When set, the card renders in
   * the same layout but the status badge shows this role instead of "Active
   * Student" and the residence lines are hidden (no room/session).
   */
  roleLabel?: string | null
  /** Label above the ID number. Defaults to "Student ID". */
  idLabel?: string
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "K"
  const isStudent = !roleLabel

  const roomLine = (() => {
    const parts: string[] = []
    if (blockName) parts.push(`Block ${blockName}`)
    if (roomNumber) parts.push(`Room ${roomNumber}`)
    if (bed) parts.push(`Bed ${bed}`)
    return parts.join(" · ")
  })()

  // Normalise whatever is stored ("2026/2027", "Session 2026/2027", …) into a
  // single "Residential Session 2026/2027" label.
  const sessionCore = session
    ? session.replace(/^(residential\s+)?session\s+/i, "").trim()
    : ""
  const sessionLine = sessionCore ? `Residential Session ${sessionCore}` : null
  const hasResidence = Boolean(roomLine) || Boolean(sessionLine)

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: 380,
        height: 550,
        mx: "auto",
        borderRadius: `${radius.cardLg}px`,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: elevation.e2,
        backgroundColor: color.canvas,
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Quiet scrim so text and photo stay readable over any uploaded background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.30) 45%, rgba(255,255,255,0.42) 78%, rgba(255,255,255,0.78) 100%)",
          pointerEvents: "none",
        }}
      />

      <Box
        sx={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          px: 4,
          pt: "12px",
          pb: "12px",
        }}
      >
        {/* 1. Logos row — UKM + KIZ grouped at the centre */}
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
          <LogoSlot src={ukmLogoUrl ?? null} monogram="UKM" />
          <LogoSlot src={kizLogoUrl ?? null} monogram="KIZ" accent />
        </Box>

        {/* 2. Main heading + subheading */}
        <Box sx={{ flexShrink: 0, textAlign: "center", mt: "2px" }}>
          <Typography
            sx={{
              fontSize: 17,
              fontWeight: 800,
              letterSpacing: "0.02em",
              lineHeight: 1.2,
              color: color.brand[900],
            }}
          >
            KOLEJ IBU ZAIN
          </Typography>
          <Typography
            sx={{
              mt: "1px",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
              lineHeight: 1.2,
              textTransform: "uppercase",
              color: color.ink[500],
            }}
          >
            {isStudent ? "myKIZ Digital Student Card" : "myKIZ Digital ID Card"}
          </Typography>
        </Box>

        {/* 3. ACTIVE STUDENT status badge */}
        <Box
          sx={{
            flexShrink: 0,
            mt: "2px",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.625,
            px: 1.5,
            py: 0.375,
            borderRadius: 999,
            backgroundColor: isStudent ? color.success.soft : color.brand[50],
            color: isStudent ? color.success.ink : color.brand[700],
          }}
        >
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: 999,
              backgroundColor: isStudent ? color.success.main : color.brand[700],
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", lineHeight: 1.2, textTransform: "uppercase" }}>
            {isStudent ? "Active Student" : roleLabel}
          </Typography>
        </Box>

        {/* 4. Student photo */}
        <Box
          sx={{
            flexShrink: 0,
            mt: "3px",
            width: 130,
            height: 150,
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(9,9,11,0.10)",
            boxShadow: "0 4px 16px rgba(9,9,11,0.16)",
            backgroundColor: "#fff",
          }}
        >
          {avatarUrl ? (
            <Box component="img" src={avatarUrl} alt={name} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Box
              sx={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 52,
                fontWeight: 700,
                color: "text.disabled",
                backgroundColor: actionHover,
              }}
            >
              {initial}
            </Box>
          )}
        </Box>

        {/* 5. Student name */}
        <Typography
          sx={{
            flexShrink: 0,
            mt: "12px",
            textAlign: "center",
            fontWeight: 700,
            fontSize: 16,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: color.ink[700],
            lineHeight: 1.25,
            overflowWrap: "anywhere",
          }}
        >
          {name}
        </Typography>

        {/* 6. Student ID — centred below the name, no box */}
        <Box sx={{ flexShrink: 0, mt: "2px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Typography
            sx={{
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: "0.18em",
              lineHeight: 1.2,
              textTransform: "uppercase",
              color: color.ink[300],
            }}
          >
            {idLabel ?? "Student ID"}
          </Typography>
          <Typography
            sx={{
              mt: "1px",
              textAlign: "center",
              fontWeight: 600,
              fontSize: 13,
              fontFamily: font.mono,
              letterSpacing: "0.05em",
              lineHeight: 1.2,
              color: color.ink[700],
              overflowWrap: "anywhere",
            }}
          >
            {matricId}
          </Typography>
        </Box>

        {/* 7. Residence lines: short centred divider, then block · room · bed + session */}
        {isStudent && hasResidence && (
          <Box sx={{ flexShrink: 0, mt: "4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Box sx={{ width: "40%", height: "1px", backgroundColor: "divider" }} />
            {roomLine && (
              <Typography
                sx={{
                  mt: "3px",
                  fontSize: 12,
                  fontWeight: 600,
                  lineHeight: 1.2,
                  color: color.ink[900],
                  textAlign: "center",
                  overflowWrap: "anywhere",
                }}
              >
                {roomLine}
              </Typography>
            )}
            {sessionLine && (
              <Typography
                sx={{
                  mt: "2px",
                  fontSize: 11,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: color.ink[500],
                  textAlign: "center",
                  overflowWrap: "anywhere",
                }}
              >
                {sessionLine}
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ flex: 1 }} />

        {/* 8. QR code — bare, no container */}
        {qrDataUrl && (
          <Box sx={{ flexShrink: 0, width: 72, height: 72 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code" style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
          </Box>
        )}

        {/* 9. Validity date — room check-in + 6 months, hidden when absent */}
        {validUntil && (
          <Typography
            sx={{
              flexShrink: 0,
              mt: "3px",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.04em",
              lineHeight: 1.2,
              color: color.ink[500],
              textAlign: "center",
            }}
          >
            Valid until {validUntil}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

const actionHover = "#F4F4F5"

/** A single logo slot — renders the uploaded image, or a branded monogram tile. */
function LogoSlot({ src, monogram, accent }: { src: string | null; monogram: string; accent?: boolean }) {
  if (src) {
    return (
      <Box
        sx={{
          width: 112,
          height: 104,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 0.5,
        }}
      >
        <Box component="img" src={src} alt={`${monogram} logo`} sx={{ maxWidth: "100%", maxHeight: "100%", width: "auto", objectFit: "contain" }} />
      </Box>
    )
  }
  return (
    <Box
      sx={{
        width: 112,
        height: 104,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 2,
        border: "1px solid",
        borderColor: accent ? color.success.main : "divider",
        backgroundColor: accent ? color.success.soft : "rgba(255,255,255,0.6)",
      }}
    >
      <Typography sx={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", color: accent ? color.success.ink : color.ink[700] }}>
        {monogram}
      </Typography>
    </Box>
  )
}
