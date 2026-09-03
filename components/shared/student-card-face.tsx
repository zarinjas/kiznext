import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { elevation, font, radius } from "@/lib/theme"

/**
 * StudentCardFace — official university-style resident card for the "ahli"
 * (student) role. Fixed portrait height (550px), admin-configurable
 * background image and name-bar colour/gradient. A compact QR code sits inside
 * the card just below the room number.
 *
 * Photo is fixed at 150×150px and QR at 90×90px regardless of render width.
 */
export function StudentCardFace({
  name,
  block,
  roomNumber,
  avatarUrl,
  backgroundUrl,
  nameBarBackground,
  logoUrl,
  qrDataUrl,
}: {
  name: string
  block: string | null
  roomNumber: string | null
  avatarUrl: string | null
  backgroundUrl: string | null
  nameBarBackground: string
  logoUrl: string | null
  qrDataUrl?: string | null
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "K"
  const roomLabel = (() => {
    if (!block) return roomNumber ?? ""
    if (!roomNumber) return block
    const n = roomNumber.trim()
    const b = block.trim()
    if (n.toLowerCase().startsWith(b.toLowerCase())) return n
    return `${b}-${n}`
  })()

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
        backgroundColor: "#F4F4F5",
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Subtle scrim so text/photo stay readable over any uploaded background */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.1) 65%, rgba(255,255,255,0.55) 100%)",
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
          pt: 4,
        }}
      >
        {/* 1. Header — logo only, admin-uploaded, centered */}
        <Box sx={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", mb: "35px" }}>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="App logo" sx={{ maxHeight: 54, maxWidth: "75%", width: "auto", objectFit: "contain" }} />
          ) : null}
        </Box>

        {/* Info block: photo + name bar + room number, grouped tightly */}
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* 2. Student photo — fixed size, centered */}
          <Box
            sx={{
              width: 170,
              height: 200,
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
              backgroundColor: "#fff",
              flexShrink: 0,
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
                  backgroundColor: "action.hover",
                }}
              >
                {initial}
              </Box>
            )}
          </Box>

          {/* 3. Student name bar — directly below photo, colour/gradient is admin-configurable */}
          <Box
            sx={{
              width: "100%",
              mt: "30px",
              background: nameBarBackground,
              borderRadius: 1.5,
              py: 1.25,
              px: 1.5,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                color: "#fff",
                fontWeight: 700,
                fontSize: { xs: 14, sm: 17 },
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                overflowWrap: "anywhere",
              }}
            >
              {name}
            </Typography>
          </Box>

          {/* 4. Room number — directly below name bar, number only */}
          {roomLabel && (
            <Typography
              sx={{
                mt: 1.5,
                fontSize: 15,
                fontWeight: 600,
                fontFamily: font.mono,
                color: "#3F3F46",
                letterSpacing: "0.01em",
              }}
            >
              {roomLabel}
            </Typography>
          )}

          {/* 5. QR code — compact, inside the card below the room number */}
          {qrDataUrl && (
            <Box sx={{ mt: 1.25, width: 90, height: 90, padding: "4px", backgroundColor: "#fff", borderRadius: 1, overflow: "hidden", flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code" style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }} />
            </Box>
          )}
        </Box>

        <Box sx={{ flex: 1 }} />
      </Box>
    </Box>
  )
}
