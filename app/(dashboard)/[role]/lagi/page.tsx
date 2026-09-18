import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { ListGroup, ListRow } from "@/components/kiz/primitives/list-group"
import { SignOutButton } from "@/components/shared/sign-out-button"
import { getBilikWindowState, getResidentRoomLabel } from "@/lib/bilik"
import { navForRole } from "@/components/kiz/shell/nav-config"
import type { Role } from "@/lib/rbac"
import { color, font, radius } from "@/lib/theme"

export default async function LagiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [user, bilikState, roomLabel] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, matricId: true, avatarUrl: true },
    }),
    getBilikWindowState(),
    session.user.role === "ahli" ? getResidentRoomLabel(session.user.id) : Promise.resolve(null),
  ])
  const bilikOpen = bilikState === "open" || bilikState === "closing_soon"
  const groups = navForRole(session.user.role as Role)

  const initial = (user?.name?.trim().charAt(0) || "K").toUpperCase()

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader overline="Menu" title="More" />

      {/* Identity card */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          p: 2,
          mb: 3,
          borderRadius: `${radius.cardLg}px`,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: "background.paper",
        }}
      >
        {user?.avatarUrl ? (
          <Box
            component="img"
            src={user.avatarUrl}
            alt=""
            sx={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
          />
        ) : (
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: "action.hover",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {initial}
          </Box>
        )}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontWeight: 600, letterSpacing: "-0.015em" }}>
            {user?.name}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: font.mono }}>
            {user?.matricId}
            {roomLabel && ` · ${roomLabel}`}
          </Typography>
        </Box>
        <KIcon icon="chevron_right" size={18} sx={{ color: "var(--mui-palette-text-disabled)" }} />
      </Box>

      {/* Grouped menu */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {groups.map((g) => (
          <ListGroup key={g.label} title={g.label}>
            {g.items.map((item) => (
              <ListRow
                key={item.href}
                href={item.href}
                icon={item.icon}
                title={item.label}
                trailing={
                  item.href.endsWith("/bilik") && bilikOpen ? (
                    <Box
                      sx={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: color.warning.ink,
                        backgroundColor: color.warning.soft,
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 999,
                      }}
                    >
                      Open
                    </Box>
                  ) : undefined
                }
              />
            ))}
          </ListGroup>
        ))}

        <ListGroup>
          <SignOutButton>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.75,
                minHeight: 56,
                width: "100%",
                color: "error.main",
                fontWeight: 550,
                fontSize: 14,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                WebkitTapHighlightColor: "transparent",
                "&:active": { backgroundColor: "action.hover" },
              }}
            >
              <KIcon icon="logout" size={20} />
              Log out
            </Box>
          </SignOutButton>
        </ListGroup>
      </Box>
    </Box>
  )
}
