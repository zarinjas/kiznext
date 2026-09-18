"use client"

import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { SocialIcon } from "@/components/shared/social-icon"
import { color, elevation, radius } from "@/lib/theme"
import type { StayConnectedSection } from "@/lib/stay-connected"

/**
 * "Stay Connected" — outbound social/contact links on the member dashboard.
 *
 * White card, rounded corners and a soft shadow. Each link is a full-row tile
 * (icon left, label + description in the middle, chevron right) that opens in a
 * new tab. The whole section self-hides when disabled or when it has no links,
 * so the dashboard never shows an empty card.
 */
export function StayConnected({ section }: { section: StayConnectedSection }) {
  if (!section.enabled || section.links.length === 0) return null

  return (
    <Box
      sx={{
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        backgroundColor: "background.paper",
        boxShadow: elevation.e2,
        p: { xs: 2, sm: 2.5 },
      }}
    >
      <Box sx={{ px: { xs: 0, sm: 0.5 }, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 640, letterSpacing: "-0.018em", fontSize: { xs: 15.5, sm: 17 } }}>
          {section.title}
        </Typography>
        {section.subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: 13.5, mt: 0.5, lineHeight: 1.5 }}>
            {section.subtitle}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {section.links.map((link) => (
          <Box
            key={link.id}
            component="a"
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: { xs: 1, sm: 1.25 },
              py: 1.25,
              minHeight: 60,
              borderRadius: `${radius.input}px`,
              textDecoration: "none",
              color: "inherit",
              WebkitTapHighlightColor: "transparent",
              transition: "background-color 140ms ease",
              "@media (hover: hover)": {
                "&:hover": {
                  backgroundColor: "action.hover",
                  "& .sc-chevron": { transform: "translateX(2px)" },
                },
              },
              "&:active": { backgroundColor: "action.selected" },
              "& + &": { mt: 0.25 },
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: `${radius.input}px`,
                backgroundColor: color.brand[50],
                color: color.brand[700],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <SocialIcon icon={link.icon} size={22} />
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  fontSize: 14.5,
                  letterSpacing: "-0.011em",
                  lineHeight: 1.35,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
              </Typography>
              {link.description && (
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {link.description}
                </Typography>
              )}
            </Box>

            <KIcon
              icon="chevron_right"
              size={18}
              className="sc-chevron"
              sx={{
                color: "var(--mui-palette-text-disabled)",
                flexShrink: 0,
                transition: "transform 160ms ease",
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  )
}
