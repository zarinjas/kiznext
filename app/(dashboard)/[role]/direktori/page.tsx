import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Accordion from "@mui/material/Accordion"
import AccordionSummary from "@mui/material/AccordionSummary"
import AccordionDetails from "@mui/material/AccordionDetails"
import Typography from "@mui/material/Typography"
import Chip from "@mui/material/Chip"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"

export default async function DirektoriPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const blocks = await prisma.block.findMany({
    include: {
      facilities: {
        where: { deletedAt: null },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <PageHeader
        overline="Support"
        title="Block & Facility Directory"
        subtitle="Guide to block locations and facilities at KIZ."
      />

      {blocks.length === 0 ? (
        <KEmpty icon="map" title="Directory's empty for now" body="Once blocks are added, they'll show up right here." />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {blocks.map((block) => (
            <Accordion
              key={block.id}
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: `${radius.cardLg}px !important`,
                boxShadow: "none",
                "&:before": { display: "none" },
                "&.Mui-expanded": { margin: 0 },
              }}
            >
              <AccordionSummary
                expandIcon={<KIcon icon="expand_more" size={20} />}
                sx={{ px: 2, py: 0.5, minHeight: 64 }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
                  <KIcon
                    icon="location_on"
                    size={20}
                    sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 550, letterSpacing: "-0.011em" }}>
                      {block.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                      {block.facilities.length} facilit{block.facilities.length === 1 ? "y" : "ies"}
                    </Typography>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2, pb: 2.5 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  {block.description}
                </Typography>
                {block.navigationNotes && (
                  <Box
                    sx={{
                      mt: 1.5,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      p: 1.5,
                      borderRadius: 1.5,
                      backgroundColor: color.info.soft,
                      color: color.info.ink,
                    }}
                  >
                    <KIcon icon="explore" size={16} />
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      {block.navigationNotes}
                    </Typography>
                  </Box>
                )}
                {block.facilities.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="overline" sx={{ color: "text.disabled" }}>
                      Facilities
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.75 }}>
                      {block.facilities.map((facility) => (
                        <Chip
                          key={facility.id}
                          label={
                            <span>
                              {facility.name}
                              {facility.capacity ? (
                                <span style={{ color: "text.disabled" }}> · {facility.capacity}px</span>
                              ) : null}
                            </span>
                          }
                          size="small"
                          sx={{ backgroundColor: "action.hover", color: "text.primary", fontWeight: 600 }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  )
}
