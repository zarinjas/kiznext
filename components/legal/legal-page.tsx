"use client"

import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import { KIcon } from "@/components/kiz/primitives/icon"
import { gradient, radius } from "@/lib/theme"
import { LEGAL, type LegalDocSet, type LegalLang } from "@/lib/legal"

const NAV = [
  { href: "/privacy", label: { ms: "Dasar Privasi", en: "Privacy Policy" } },
  { href: "/data-safety", label: { ms: "Keselamatan Data", en: "Data Safety" } },
  { href: "/terms", label: { ms: "Terma & Syarat", en: "Terms & Conditions" } },
  { href: "/delete-account", label: { ms: "Pemadaman Akaun", en: "Account Deletion" } },
]

function BrandMark() {
  return (
    <Box component={Link} href="/login" sx={{ display: "flex", alignItems: "center", gap: 1.25, textDecoration: "none", color: "inherit" }}>
      <Box
        sx={{
          width: 30,
          height: 30,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "primary.main",
          color: "primary.contrastText",
          fontSize: 14,
          fontWeight: 650,
          letterSpacing: "-0.02em",
        }}
      >
        K
      </Box>
      <Typography sx={{ fontWeight: 600, fontSize: 14.5, letterSpacing: "-0.015em" }}>
        {LEGAL.brand}
      </Typography>
    </Box>
  )
}

export function LegalPage({ docSet }: { docSet: LegalDocSet }) {
  const [lang, setLang] = useState<LegalLang>("ms")
  const doc = docSet[lang]

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundImage: gradient.hero,
        backgroundColor: "background.default",
      }}
    >
      <Box
        component="header"
        sx={{ borderBottom: "1px solid", borderColor: "divider", position: "sticky", top: 0, zIndex: 2, backdropFilter: "blur(12px)", backgroundColor: "color-mix(in srgb, var(--mui-palette-background-default) 82%, transparent)" }}
      >
        <Box
          sx={{
            maxWidth: 860,
            mx: "auto",
            px: { xs: 2.5, sm: 4 },
            py: 1.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <BrandMark />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={lang}
            onChange={(_, next: LegalLang | null) => next && setLang(next)}
            aria-label="Language"
            sx={{
              bgcolor: "background.paper",
              "& .MuiToggleButton-root": {
                px: 1.5,
                py: 0.5,
                fontSize: 12,
                fontWeight: 600,
                textTransform: "none",
                borderColor: "divider",
                color: "text.secondary",
                "&.Mui-selected": { bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" } },
              },
            }}
          >
            <ToggleButton value="ms">BM</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box component="main" sx={{ flex: 1, width: "100%", maxWidth: 760, mx: "auto", px: { xs: 2.5, sm: 4 }, py: { xs: 4, sm: 6 } }}>
        <Box sx={{ mb: 3 }}>
          <Typography
            component="h1"
            sx={{ fontSize: { xs: 28, sm: 34 }, fontWeight: 660, lineHeight: 1.15, letterSpacing: "-0.032em" }}
          >
            {doc.title}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.disabled" }}>
            {lang === "ms" ? "Dikemas kini" : "Last updated"}: {LEGAL.updated}
          </Typography>
          <Typography variant="body1" sx={{ mt: 2, color: "text.secondary", lineHeight: 1.7 }}>
            {doc.summary}
          </Typography>
        </Box>

        <Box
          lang={lang}
          sx={{
            borderRadius: `${radius.cardLg}px`,
            border: "1px solid",
            borderColor: "divider",
            backgroundColor: "background.paper",
            px: { xs: 2.5, sm: 3.5 },
            py: { xs: 1, sm: 1.5 },
          }}
        >
          {doc.sections.map((section, index) => (
            <Box
              component="section"
              key={section.heading}
              sx={{
                py: 3,
                "&:not(:last-of-type)": { borderBottom: "1px solid", borderColor: "divider" },
                ...(index === 0 && { pt: 2.5 }),
              }}
            >
              <Typography
                component="h2"
                sx={{ fontSize: 17, fontWeight: 650, letterSpacing: "-0.015em", mb: 1 }}
              >
                {section.heading}
              </Typography>
              {section.paragraphs?.map((paragraph) => (
                <Typography key={paragraph} variant="body2" sx={{ color: "text.secondary", lineHeight: 1.75, mb: 1 }}>
                  {paragraph}
                </Typography>
              ))}
              {section.bullets && (
                <Box component="ul" sx={{ m: 0, mt: section.paragraphs?.length ? 1 : 0.5, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {section.bullets.map((bullet) => (
                    <Typography component="li" key={bullet} variant="body2" sx={{ color: "text.secondary", lineHeight: 1.75 }}>
                      {bullet}
                    </Typography>
                  ))}
                </Box>
              )}
            </Box>
          ))}
        </Box>

        <Box sx={{ mt: 3, display: "flex", flexWrap: "wrap", gap: 1 }}>
          <Button
            component="a"
            href={`mailto:${LEGAL.contactEmail}`}
            variant="outlined"
            size="small"
            startIcon={<KIcon icon="mail" size={18} />}
          >
            {LEGAL.contactEmail}
          </Button>
          <Button component={Link} href="/login" variant="text" size="small">
            {lang === "ms" ? "Kembali ke log masuk" : "Back to sign in"}
          </Button>
        </Box>
      </Box>

      <Box component="footer" sx={{ borderTop: "1px solid", borderColor: "divider", py: 3 }}>
        <Box sx={{ maxWidth: 760, mx: "auto", px: { xs: 2.5, sm: 4 }, display: "flex", flexWrap: "wrap", gap: { xs: 2, sm: 3 }, alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            {NAV.map((item) => (
              <Typography
                key={item.href}
                component={Link}
                href={item.href}
                variant="caption"
                sx={{ color: "text.secondary", textDecoration: "none", fontWeight: 600, "&:hover": { color: "text.primary" } }}
              >
                {item.label[lang]}
              </Typography>
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            © {new Date().getFullYear()} {LEGAL.college}, {LEGAL.university}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
