import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { getCafeConfig, getCafeMenu, getMyCafeOrders } from "@/lib/cafe"
import { CafeClient } from "./cafe-client"

export default async function KafePage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const [config, menu, orders] = await Promise.all([
    getCafeConfig(),
    getCafeMenu(),
    getMyCafeOrders(),
  ])

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Smart Ordering"
        title={config.name}
        subtitle="Order from the menu — your order opens straight in WhatsApp for the cafe to prepare. Pick up when it's ready, pay at the counter."
      />
      <CafeClient config={config} menu={menu} orders={orders} />
    </Box>
  )
}
