import QRCode from "qrcode"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { color, elevation, font } from "@/lib/theme"

interface Props {
  name: string
  matricId: string
  block: string | null
  roomNumber: string | null
  avatarUrl: string | null
}

export async function KadMayaCard({ name, matricId, block, roomNumber, avatarUrl }: Props) {
  const qrDataUrl = await QRCode.toDataURL(matricId, { width: 220, margin: 1 })

  const initial = name.trim().charAt(0).toUpperCase() || "K"

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 380,
        borderRadius: 4,
        overflow: "hidden",
        backgroundColor: color.brand[900],
        color: "#fff",
        boxShadow: elevation.e3,
        position: "relative",
      }}
    >
      {/* Soft ambient wash */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            radial-gradient(520px 320px at 100% 0%, rgba(139,124,238,0.30), transparent 60%),
            radial-gradient(460px 300px at 0% 100%, rgba(56,132,255,0.22), transparent 62%)
          `,
          pointerEvents: "none",
        }}
      />

      <Box sx={{ position: "relative", p: 3 }}>
        {/* Head */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
          <Box>
            <Typography sx={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2 }}>
              KIZ eCard
            </Typography>
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.55)", mt: 0.25 }}>
              Kolej Ibu Zain, UKM
            </Typography>
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: 10.5,
              fontWeight: 550,
              color: "rgba(255,255,255,0.75)",
              backgroundColor: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.14)",
              px: 1.25,
              py: 0.375,
              borderRadius: 999,
            }}
          >
            Digital ID
          </Box>
        </Box>

        {/* Identity */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
          {avatarUrl ? (
            <Box
              component="img"
              src={avatarUrl}
              alt={name}
              sx={{ width: 56, height: 56, objectFit: "cover", borderRadius: 2.5, border: "1px solid rgba(255,255,255,0.2)" }}
            />
          ) : (
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2.5,
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {initial}
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.25 }}>
              {name}
            </Typography>
            <Typography sx={{ fontSize: 12.5, fontFamily: font.mono, color: "rgba(255,255,255,0.6)", mt: 0.375 }}>
              {matricId}
            </Typography>
            {(block || roomNumber) && (
              <Typography sx={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)" }}>
                {[block, roomNumber].filter(Boolean).join(" • ")}
              </Typography>
            )}
          </Box>
        </Box>

        {/* QR */}
        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: 3,
            p: 2,
            display: "flex",
            justifyContent: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR Code" style={{ width: 150, height: 150, display: "block", mixBlendMode: "multiply" }} />
        </Box>

        <Typography sx={{ textAlign: "center", fontSize: 11.5, color: "rgba(255,255,255,0.45)", mt: 2 }}>
          Show this code at the college office
        </Typography>
      </Box>
    </Box>
  )
}
