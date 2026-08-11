import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import Button from "@mui/material/Button"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { HelpdeskList } from "./helpdesk-list"
import { NewTicketForm } from "./new-ticket-form"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { isOfficeHours } from "@/lib/office-hours"
import { color } from "@/lib/theme"

export default async function HelpdeskPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const tickets = await prisma.helpdeskTicket.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { sender: { select: { name: true, role: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })

  const unreadCount = tickets.filter((t) => {
    if (t.status === "closed") return false
    const lastMsg = t.messages[0]
    if (!lastMsg) return false
    const isAdmin = lastMsg.sender.role === "admin_kiz" || lastMsg.sender.role === "superadmin"
    return isAdmin && !lastMsg.isAutoReply
  }).length

  const inHours = isOfficeHours()

  return (
    <Box sx={{ maxWidth: 760, mx: "auto" }}>
      <PageHeader
        overline="Support"
        title="Help & Support"
        subtitle="Ask questions or get help from KIZ management."
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 2,
          mb: 2.5,
          borderRadius: 2,
          backgroundColor: inHours ? color.success.soft : color.warning.soft,
          color: inHours ? color.success.ink : color.warning.ink,
        }}
      >
        <KIcon icon={inHours ? "wifi" : "schedule"} size={22} />
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {inHours ? "Office hours — we're online!" : "Outside office hours"}
          </Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            Monday–Friday, 8:00 AM – 5:00 PM (Malaysian Time).
            {!inHours && " Your message will be replied when office hours start."}
          </Typography>
        </Box>
      </Box>

      <FormSection title="New Question" subtitle="We usually reply within office hours." icon="add_comment">
        <NewTicketForm role={session.user.role} />
      </FormSection>

      <Box sx={{ mt: 3, mb: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
        <Typography variant="h3" sx={{ fontFamily: "var(--font-fraunces), serif" }}>
          Your Conversations
        </Typography>
        {unreadCount > 0 && (
          <Button
            size="small"
            startIcon={<KIcon icon="mark_email_unread" size={16} />}
            sx={{ textTransform: "none", color: color.brand[700], backgroundColor: color.brand[50] }}
          >
            {unreadCount} unread
          </Button>
        )}
      </Box>

      <HelpdeskList tickets={tickets} role={session.user.role} />
    </Box>
  )
}
