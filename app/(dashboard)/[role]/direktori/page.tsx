import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius, gradient } from "@/lib/theme"

const teasers = ["Blocks & floors", "Facilities", "Offices & directions"]

export default async function ARDirectoryPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  return (
    <Box sx={{ maxWidth: 720, mx: "auto" }}>
      <PageHeader
        overline="Explore"
        title="AR Directory"
        subtitle="Point your camera at any block, facility or office at KIZ to see what's inside — layered right onto the real world."
        actions={
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.5,
              borderRadius: 999,
              backgroundColor: color.brand[50],
              color: color.brand[800],
              border: "1px solid",
              borderColor: color.brand[200],
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "-0.006em",
              whiteSpace: "nowrap",
            }}
          >
            <KIcon icon="view_in_ar" size={15} />
            Coming soon
          </Box>
        }
      />

      {/* Hero teaser */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          backgroundImage: gradient.hero,
          p: { xs: 3.5, sm: 5 },
          textAlign: "center",
          "[data-mui-color-scheme='dark'] &": {
            backgroundImage: "none",
            backgroundColor: "background.paper",
          },
        }}
      >
        <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none" }} />

        <Box sx={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: `${radius.card}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: color.brand[50],
              color: color.brand[800],
              border: "1px solid",
              borderColor: color.brand[200],
              mb: 2.25,
            }}
          >
            <KIcon icon="view_in_ar" size={36} />
          </Box>

          <Typography
            sx={{
              fontSize: { xs: 22, sm: 26 },
              fontWeight: 640,
              lineHeight: 1.2,
              letterSpacing: "-0.032em",
              mb: 1,
            }}
          >
            We&apos;re building something new
          </Typography>

          <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 440, mx: "auto" }}>
            The block directory is getting an augmented-reality upgrade. Soon you&apos;ll
            explore KIZ like never before — point, look and discover what each space
            has to offer.
          </Typography>

          <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 1, mt: 2.5 }}>
            {teasers.map((t) => (
              <Box
                key={t}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 999,
                  backgroundColor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  fontSize: 12,
                  fontWeight: 550,
                  color: "text.secondary",
                }}
              >
                <KIcon icon="check" size={13} sx={{ color: color.success.main }} />
                {t}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
