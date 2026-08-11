import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KIcon } from "@/components/kiz/primitives/icon"
import { SignOutButton } from "@/components/shared/sign-out-button"

const menuItems = [
  { label: "Guest House", description: "Book accommodation for guests", href: "rumah-tamu", icon: "hotel" },
  { label: "Helpdesk", description: "Contact KIZ management", href: "helpdesk", icon: "support_agent" },
  { label: "My Parcels", description: "Check your parcel status", href: "parcel", icon: "inventory_2" },
  { label: "Lost & Found", description: "Report or check lost items", href: "hilang", icon: "search" },
  { label: "Block Directory", description: "Guide to block & facility locations", href: "direktori", icon: "map" },
  { label: "My Profile", description: "Update personal info", href: "profile", icon: "person" },
  { label: "My Bookings", description: "View all your bookings", href: "tempahan", icon: "calendar_month" },
]

export default async function LagiPage({ params }: { params: Promise<{ role: string }> }) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const { role } = await params

  return (
    <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <PageHeader overline="Menu" title="More" subtitle="All other KIZ Super App features." />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 2.5,
          border: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
          backgroundColor: "background.paper",
        }}
      >
        {menuItems.map((item, i) => (
          <Link key={item.href} href={`/${role}/${item.href}`} style={{ textDecoration: "none", color: "inherit" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                px: 2,
                py: 1.5,
                borderBottom: i !== menuItems.length - 1 ? "1px solid" : "none",
                borderColor: "divider",
                "&:hover": { backgroundColor: "action.hover" },
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "action.hover",
                  color: "primary.main",
                  flexShrink: 0,
                }}
              >
                <KIcon icon={item.icon} size={20} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>{item.label}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>{item.description}</Typography>
              </Box>
              <KIcon icon="chevron_right" size={18} sx={{ color: "text.disabled" }} />
            </Box>
          </Link>
        ))}
      </Box>

      <Box sx={{ mt: 3 }}>
        <SignOutButton>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1.5, borderRadius: 2, border: "1px solid", borderColor: "divider", color: "error.main", backgroundColor: "background.paper", fontWeight: 600, fontSize: 14 }}>
            <KIcon icon="logout" size={18} />
            Log Out
          </Box>
        </SignOutButton>
      </Box>
    </Box>
  )
}
