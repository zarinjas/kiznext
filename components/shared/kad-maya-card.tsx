import QRCode from "qrcode"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { color, elevation } from "@/lib/theme"

interface Props {
  name: string
  matricId: string
  block: string | null
  roomNumber: string | null
  avatarUrl: string | null
}

export async function KadMayaCard({ name, matricId, block, roomNumber, avatarUrl }: Props) {
  const qrDataUrl = await QRCode.toDataURL(matricId, {
    width: 220,
    margin: 1,
  })

  const initial = name.trim().charAt(0).toUpperCase() || "K"

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 400,
        borderRadius: 3.5,
        overflow: "hidden",
        background: `linear-gradient(135deg, ${color.brand[900]} 0%, #0a6b34 55%, ${color.brand[400]} 100%)`,
        color: "#fff",
        boxShadow: elevation.e4,
        position: "relative",
      }}
    >
      {/* decorative orbs */}
      <Box sx={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.06)" }} />
      <Box sx={{ position: "absolute", bottom: -30, left: 40, width: 100, height: 100, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.05)" }} />

      <Box sx={{ position: "relative", px: 3, pt: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box>
            <Typography sx={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, lineHeight: 1, letterSpacing: "0.04em", fontWeight: 600 }}>
              eCARD
            </Typography>
            <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.7)", mt: 0.5 }}>
              Kolej Ibu Zain, UKM
            </Typography>
          </Box>
          <Box
            component="span"
            sx={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              backgroundColor: "rgba(255,255,255,0.2)",
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              backdropFilter: "blur(4px)",
            }}
          >
            Digital ID
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, my: 2.5 }}>
          {avatarUrl ? (
            <Box component="img" src={avatarUrl} alt={name} sx={{ width: 76, height: 76, objectFit: "cover", borderRadius: 2, border: "2px solid rgba(255,255,255,0.35)" }} />
          ) : (
            <Box
              sx={{
                width: 76,
                height: 76,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-fraunces), serif",
                fontSize: 30,
                border: "2px solid rgba(255,255,255,0.35)",
              }}
            >
              {initial}
            </Box>
          )}
          <Box sx={{ flex: 1 }}>
            <Box sx={{ ml: "auto", width: "fit-content", borderRadius: 2, backgroundColor: "#fff", p: 1.5 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR Code" style={{ width: 96, height: 96, display: "block", mixBlendMode: "multiply" }} />
            </Box>
          </Box>
        </Box>

        <Box sx={{ textAlign: "center", pb: 2.5 }}>
          <Typography sx={{ fontFamily: "var(--font-fraunces), serif", fontSize: 20, fontWeight: 600, lineHeight: 1.3 }}>
            {name}
          </Typography>
          <Typography sx={{ fontSize: 13, letterSpacing: "0.12em", fontFamily: "monospace", mt: 0.25 }}>
            {matricId}
          </Typography>
          {(block || roomNumber) && (
            <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.8)", mt: 0.25 }}>
              {[block, roomNumber].filter(Boolean).join(" • ")}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ backgroundColor: "rgba(0,0,0,0.12)", px: 3, py: 1.5, backdropFilter: "blur(4px)" }}>
        <Typography sx={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
          Digital ID Card — KIZ Super App
        </Typography>
      </Box>
    </Box>
  )
}
