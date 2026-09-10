import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { EventsAdmin } from "./events-admin"

export default async function UrusAktivitiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const events = await prisma.event.findMany({
    where: { deletedAt: null },
    orderBy: { startsAt: "asc" },
  })

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Content"
        title="Upcoming Activities"
        subtitle="Programmes and activities shown in the “Upcoming at KIZ” widget on every member dashboard."
      />
      <EventsAdmin
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          description: e.description,
          venue: e.venue,
          startsAt: e.startsAt.toISOString(),
          displayWhen: new Intl.DateTimeFormat("en-MY", {
            timeZone: "Asia/Kuala_Lumpur",
            dateStyle: "medium",
            timeStyle: "short",
          }).format(e.startsAt),
        }))}
      />
    </Box>
  )
}
