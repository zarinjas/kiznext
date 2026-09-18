import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SUPPORT_ROLES, type Role } from "@/lib/rbac"
import { prisma } from "@/lib/db"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { HelpdeskList } from "./helpdesk-list"
import { NewTicketForm } from "./new-ticket-form"
import { LiveChatForm } from "./live-chat-form"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { OfficeOpenBadge } from "@/components/shared/office-open-badge"
import { EmergencyNote } from "./emergency-note"
import { Bento, BentoItem } from "@/components/kiz/patterns/bento"
import { isOfficeHours } from "@/lib/office-hours"
import { getResidentRoomDetail } from "@/lib/bilik"
import { color, radius, font } from "@/lib/theme"

export default async function HelpdeskPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  // The support desk (admins, staff, fellows) runs support from the helpdesk
  // inbox, never the resident ask flow.
  if (SUPPORT_ROLES.includes(session.user.role as Role)) {
    redirect(`/${session.user.role}/urus-helpdesk`)
  }

  const [tickets, blocks, contacts, room] = await Promise.all([
    prisma.helpdeskTicket.findMany({
      where: { userId: session.user.id, deletedAt: null },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { sender: { select: { name: true, role: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.block.findMany({
      where: { deletedAt: null },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    prisma.contentItem.findMany({
      where: { kind: "emergency_contact", deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
    getResidentRoomDetail(session.user.id),
  ])

  const unreadCount = tickets.filter((t) => {
    if (t.status === "closed") return false
    const lastMsg = t.messages[0]
    if (!lastMsg) return false
    const isAdmin = SUPPORT_ROLES.includes(lastMsg.sender.role as Role)
    return isAdmin && !lastMsg.isAutoReply
  }).length

  const inHours = isOfficeHours()
  const blockNames = blocks.map((b) => b.name)

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Support"
        title="Help & Support"
        subtitle="Ask us anything or report an issue — no queueing at the counter."
        actions={
          <Box sx={{ display: "inline-flex" }}>
            <OfficeOpenBadge open={inHours} />
          </Box>
        }
      />

      <Bento>
        {/* Office status + emergency guidance */}
        <BentoItem span={8} spanXs={2}>
          <EmergencyNote contacts={contacts} />
        </BentoItem>
        <BentoItem span={4} spanXs={2}>
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              p: { xs: 1.75, sm: 2 },
              borderRadius: `${radius.card}px`,
              border: "1px solid",
              borderColor: "divider",
              backgroundColor: "background.paper",
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
                backgroundColor: inHours ? color.success.soft : color.neutral.soft,
                color: inHours ? color.success.ink : "text.secondary",
              }}
            >
              <KIcon icon={inHours ? "wifi" : "schedule"} size={18} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: 13.5, lineHeight: 1.35 }}>
                {inHours ? "We're online and replying now." : "The office is closed right now."}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25 }}>
                Monday–Friday, 8:00 AM – 5:00 PM (Malaysian time).
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5 }}>
                {inHours
                  ? "Send your question and we'll jump in."
                  : " Your request is still saved — we'll reply when the office reopens."}
              </Typography>
            </Box>
          </Box>
        </BentoItem>

        {/* Live chat — quick questions, no form */}
        <BentoItem span={12} spanXs={2}>
          <FormSection
            title="Live Chat"
            subtitle="Quick questions for the KIZ office — just type and send. No form, no queue."
            icon="forum"
          >
            <LiveChatForm role={session.user.role} officeOpen={inHours} />
          </FormSection>
        </BentoItem>

        {/* Support ticket — structured, tracked requests */}
        <BentoItem span={12} spanXs={2}>
          <FormSection
            title="Support Ticket"
            subtitle="Formal requests and applications you can track — room changes, repairs, and more."
            icon="assignment"
          >
            <NewTicketForm
              role={session.user.role}
              blocks={blockNames}
              defaultBlock={room?.blockName ?? null}
              defaultRoom={room?.roomNumber ?? null}
            />
          </FormSection>
        </BentoItem>

        {/* Request history */}
        <BentoItem span={12} spanXs={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, px: { xs: 0.5, sm: 0 } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              Your Requests
            </Typography>
            {tickets.length > 0 && (
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                {tickets.length} total
              </Typography>
            )}
            {unreadCount > 0 && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1,
                  py: 0.375,
                  borderRadius: 999,
                  color: color.brand[700],
                  backgroundColor: color.brand[50],
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: font.mono,
                }}
              >
                {unreadCount} unread
              </Box>
            )}
          </Box>
          <HelpdeskList tickets={tickets} role={session.user.role} />
        </BentoItem>
      </Bento>
    </Box>
  )
}
