import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Box from "@mui/material/Box"
import { requireRole, CAFE_MANAGE_ROLES } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getCafeConfig, getAllCafeItems } from "@/lib/cafe"
import { isAiEnabled } from "@/lib/ai/config"
import { CafeAdmin } from "./cafe-admin"

export default async function UrusKafePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, CAFE_MANAGE_ROLES)

  const [config, items, aiEnabled] = await Promise.all([
    getCafeConfig(),
    getAllCafeItems(),
    isAiEnabled(),
  ])

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto" }}>
      <PageHeader
        overline="Smart Ordering"
        title="KIZ Cafe"
        subtitle="Upload the menu photo, let KIZ-AI read it into orderable items, and set the cafe's WhatsApp number. Students order in-app and hand off to WhatsApp."
      />
      <CafeAdmin config={config} items={items} aiEnabled={aiEnabled} />
    </Box>
  )
}
