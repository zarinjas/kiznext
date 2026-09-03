import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { color, gradient, glass } from "@/lib/theme"
import { SignOutButton } from "@/components/shared/sign-out-button"
import type { AccountStatus } from "@/lib/rbac"

interface Props {
  name: string
  matricId: string
  status: AccountStatus
}

/**
 * Rendered instead of the whole app shell for accounts that exist but aren't
 * usable yet (email not confirmed / matric not yet matched to the KIZ list).
 */
export function PendingGate({ name, matricId, status }: Props) {
  const pending = status === "pending"
  const title = pending ? "Almost there — just a quick check" : "Confirm your email first"
  const body = pending
    ? "Your email is confirmed, but your Matric No. isn't on the KIZ student list yet. The office unlocks accounts automatically once this session's list is uploaded — check back soon."
    : "We've sent a verification link to your inbox. Click it to confirm your email, then sign in again."

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        backgroundColor: "background.default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box sx={{ position: "absolute", inset: 0, backgroundImage: gradient.mesh, pointerEvents: "none", opacity: 0.5 }} />
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: glass.background,
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.warning.soft,
            color: color.warning.ink,
          }}
        >
          <span className="material-symbols-rounded" style={{ fontSize: 28 }}>hourglass_top</span>
        </Box>

        <Typography sx={{ fontSize: 22, fontWeight: 640, letterSpacing: "-0.025em", mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "inherit", display: "block", mb: 2 }}>
          {name} · {matricId}
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
          {body}
        </Typography>

        <Box sx={{ mt: 3 }}>
          <SignOutButton>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 3,
                py: 1.25,
                minHeight: 44,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                color: "text.secondary",
                fontWeight: 550,
                fontSize: 14,
                backgroundColor: "transparent",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <span className="material-symbols-rounded" style={{ fontSize: 18 }}>logout</span>
              Sign out
            </Box>
          </SignOutButton>
        </Box>

        <Typography variant="caption" sx={{ display: "block", mt: 3, color: color.ink[300] }}>
          Questions? Contact the KIZ management office.
        </Typography>
      </Box>
    </Box>
  )
}
