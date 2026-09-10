import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"

interface EmergencyContactRow {
  id: string
  title: string
  phone: string | null
  subtitle: string | null
}

/**
 * EmergencyNote — a warning strip at the top of the helpdesk form so students
 * don't use the (office-hours-only) form for urgent situations. Shows the
 * office-managed emergency numbers when they exist.
 */
export function EmergencyNote({ contacts }: { contacts: EmergencyContactRow[] }) {
  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        p: { xs: 1.75, sm: 2 },
        borderRadius: `${radius.card}px`,
        border: "1px solid",
        borderColor: color.danger.main,
        backgroundColor: color.danger.soft,
      }}
    >
      <Box
        sx={{
          width: 34,
          height: 34,
          borderRadius: `${radius.input}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          backgroundColor: color.danger.main,
          color: "#fff",
        }}
      >
        <KIcon icon="sos" size={18} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 650, fontSize: 13.5, color: color.danger.ink, lineHeight: 1.35 }}>
          Emergency? Don&apos;t submit this form.
        </Typography>
        <Typography variant="caption" sx={{ color: color.danger.ink, opacity: 0.85, display: "block", mt: 0.25 }}>
          The form is only checked during office hours. For fires, injuries, security incidents or anything
          urgent, call immediately instead:
        </Typography>
        {contacts.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}>
            {contacts.map((c) => (
              <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                <KIcon icon="call" size={14} sx={{ color: color.danger.ink, flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: color.danger.ink, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {c.title}
                  {c.subtitle ? ` — ${c.subtitle}` : ""}
                </Typography>
                {c.phone ? (
                  <Box
                    component="a"
                    href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
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
            ))}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: color.danger.ink, fontWeight: 600, display: "block", mt: 1 }}>
            Call the KIZ office or college security directly.
          </Typography>
        )}
      </Box>
    </Box>
  )
}
