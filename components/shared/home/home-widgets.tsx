"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { Surface } from "@/components/kiz/primitives/list-group"
import { StatusChip } from "@/components/kiz/primitives/status-chip"
import { OfficeOpenBadge } from "@/components/shared/office-open-badge"
import { ticketRef } from "@/lib/helpdesk-meta"
import { formatRemaining } from "@/lib/laundry-meta"
import { color, radius } from "@/lib/theme"
import type {
  ImportantNoticeView,
  EventView,
  HelpdeskSummaryView,
  EmergencyContactView,
  LivingGuideView,
  LaundryWidgetView,
} from "@/lib/dashboard"

/**
 * The small "living at KIZ" widgets under the member dashboard hero:
 * Important Notice · Upcoming at KIZ · My Helpdesk Request · Emergency Contact ·
 * Life at KIZ. Purely presentational — the parent fetches the views.
 */

function WidgetCard({
  icon,
  title,
  tint,
  right,
  children,
  footer,
}: {
  icon: string
  title: string
  tint: { main: string; soft: string; ink: string }
  right?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <Surface
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        p: { xs: 2, sm: 2.25 },
        borderRadius: `${radius.cardLg}px`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: `${radius.input}px`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: tint.soft,
              color: tint.ink,
            }}
          >
            <KIcon icon={icon} size={18} />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 600, letterSpacing: "-0.008em" }}>
            {title}
          </Typography>
        </Box>
        {right}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      {footer && <Box sx={{ minWidth: 0 }}>{footer}</Box>}
    </Surface>
  )
}

const clamp = (lines: number) => ({
  display: "-webkit-box",
  WebkitLineClamp: lines,
  WebkitBoxOrient: "vertical" as const,
  overflow: "hidden",
})

function NoticeCard({ notice, href }: { notice: ImportantNoticeView; href: string }) {
  return (
    <WidgetCard icon="notification_important" title="Important Notice" tint={color.danger} footer={
      <Link href={href} style={{ textDecoration: "none" }}>
        <Typography variant="caption" sx={{ color: color.danger.ink, fontWeight: 650, display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          Read more <KIcon icon="arrow_forward" size={13} />
        </Typography>
      </Link>
    }>
      <Typography sx={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, mb: 0.5, ...clamp(2) }}>
        {notice.title}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.secondary", ...clamp(2) }}>
        {notice.content}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.75 }}>
        {notice.when}
      </Typography>
    </WidgetCard>
  )
}

function EventsCard({ events, href }: { events: EventView[]; href: string }) {
  return (
    <WidgetCard icon="event" title="Upcoming at KIZ" tint={{ main: color.accent[600], soft: color.accent[100], ink: color.accent[700] }} footer={
      events.length > 1 ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          +{events.length - 1} more soon
        </Typography>
      ) : null
    }>
      {events.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Nothing planned yet.
        </Typography>
      ) : (
        events.slice(0, 3).map((e, i) => (
          <Box key={e.id} sx={{ display: "flex", gap: 1.25, py: 0.625, ...(i > 0 && { borderTop: "1px solid", borderColor: "divider" }) }}>
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: `${radius.input}px`,
                backgroundColor: color.accent[100],
                color: color.accent[700],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <KIcon icon="event" size={15} />
            </Box>
            <Box sx={{ minWidth: 0, alignSelf: "center" }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.35, ...clamp(2) }}>{e.title}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", ...clamp(1) }}>
                {e.when}
                {e.venue ? ` · ${e.venue}` : ""}
              </Typography>
            </Box>
          </Box>
        ))
      )}
      {events.length > 0 && (
        <Link href={href} style={{ textDecoration: "none" }}>
          <Typography variant="caption" sx={{ color: color.accent[700], fontWeight: 650, display: "inline-flex", alignItems: "center", gap: 0.25, mt: 0.5 }}>
            View all <KIcon icon="arrow_forward" size={13} />
          </Typography>
        </Link>
      )}
    </WidgetCard>
  )
}

function HelpdeskCard({ ticket, href, officeOpen }: { ticket: HelpdeskSummaryView; href: string; officeOpen: boolean }) {
  return (
    <WidgetCard
      icon="support_agent"
      title="My Helpdesk Request"
      tint={color.info}
      right={officeOpen ? <OfficeOpenBadge open /> : undefined}
      footer={
        <Link href={href} style={{ textDecoration: "none" }}>
          <Typography variant="caption" sx={{ color: color.info.ink, fontWeight: 650, display: "inline-flex", alignItems: "center", gap: 0.25 }}>
            {officeOpen ? "Ask a new question" : "Open helpdesk"} <KIcon icon="arrow_forward" size={13} />
          </Typography>
        </Link>
      }
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 650, fontFamily: "var(--font-mono), monospace" }}>
          #{ticketRef(ticket.displayId)}
        </Typography>
        <StatusChip status={ticket.status} />
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary", mt: 0.5, ...clamp(2) }}>
        {ticket.subject}
      </Typography>
      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.75 }}>
        Updated {ticket.updatedWhen}
      </Typography>
    </WidgetCard>
  )
}

/**
 * Shown on the member dashboard while the office is open and the student has no
 * ticket yet — the direct "office is open, ask here" entry point that keeps
 * small questions off the counter.
 */
function AskOfficeCard({ href }: { href: string }) {
  return (
    <WidgetCard icon="forum" title="The KIZ office is open" tint={color.success} footer={
      <Link href={href} style={{ textDecoration: "none" }}>
        <Typography variant="caption" sx={{ color: color.success.ink, fontWeight: 650, display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          Send your question <KIcon icon="arrow_forward" size={13} />
        </Typography>
      </Link>
    }>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        <OfficeOpenBadge open />
      </Box>
      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.45 }}>
        Need help with something small? Ask here instead of queuing at the counter — we reply right on this
        page during office hours.
      </Typography>
    </WidgetCard>
  )
}

function ContactsCard({ contacts }: { contacts: EmergencyContactView[] }) {
  return (
    <WidgetCard icon="sos" title="Emergency Contact" tint={color.warning}>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {contacts.map((c, i) => (
          <Box key={c.id} sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.625, ...(i > 0 && { borderTop: "1px solid", borderColor: "divider" }) }}>
            <KIcon icon="call" size={15} sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3, ...clamp(1) }}>{c.title}</Typography>
              {c.subtitle && (
                <Typography variant="caption" sx={{ color: "text.secondary", ...clamp(1) }}>
                  {c.subtitle}
                </Typography>
              )}
            </Box>
            {c.phone ? (
              <Box
                component="a"
                href={`tel:${c.phone.replace(/[^+\d]/g, "")}`}
                sx={{ fontSize: 13, fontWeight: 650, color: color.warning.ink, textDecoration: "none", whiteSpace: "nowrap", "&:hover": { textDecoration: "underline" } }}
              >
                {c.phone}
              </Box>
            ) : null}
          </Box>
        ))}
      </Box>
    </WidgetCard>
  )
}

function laundryClock(iso: string): string {
  return new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso))
}

function LaundryCard({ machineName, endsAt, href }: { machineName: string; endsAt: string; href: string }) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const endMs = new Date(endsAt).getTime()
  const remaining = now === null ? null : endMs - now
  const isRunning = remaining !== null && remaining > 0

  return (
    <WidgetCard
      icon="local_laundry_service"
      title="Laundry"
      tint={{ main: color.brand[600], soft: color.brand[50], ink: color.brand[700] }}
      footer={
        <Link href={href} style={{ textDecoration: "none" }}>
          <Typography variant="caption" sx={{ color: color.brand[700], fontWeight: 650, display: "inline-flex", alignItems: "center", gap: 0.25 }}>
            Open laundry <KIcon icon="arrow_forward" size={13} />
          </Typography>
        </Link>
      }
    >
      <Typography sx={{ fontSize: 14, fontWeight: 650, lineHeight: 1.35, ...clamp(1) }}>{machineName}</Typography>
      <Typography variant="caption" sx={{ color: isRunning ? "warning.main" : "text.secondary", fontWeight: isRunning ? 650 : 400, display: "block", mt: 0.5 }}>
        {isRunning && remaining !== null ? `${formatRemaining(remaining)} · ` : ""}
        {isRunning ? "ends" : "ended"} at {laundryClock(endsAt)}
      </Typography>
    </WidgetCard>
  )
}

function GuidesCard({ guides }: { guides: LivingGuideView[] }) {
  return (
    <WidgetCard icon="menu_book" title="Life at KIZ" tint={{ main: color.success.main, soft: color.success.soft, ink: color.success.ink }}>
      {guides.length === 0 ? (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          The digital living guide isn&apos;t ready yet.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          {guides.map((g) => {
            const content = (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.625, width: "100%" }}>
                <KIcon icon="auto_stories" size={17} sx={{ color: color.success.main, flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, ...clamp(1) }}>{g.title}</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", ...clamp(1) }}>
                    {g.body ?? g.subtitle ?? "Your digital guide to living at KIZ."}
                  </Typography>
                </Box>
                {g.link ? (
                  <KIcon icon="open_in_new" size={15} sx={{ color: "var(--mui-palette-text-disabled)", flexShrink: 0 }} />
                ) : null}
              </Box>
            )
            if (g.link) {
              return (
                <Box
                  key={g.id}
                  component="a"
                  href={g.link}
                  target={g.link.startsWith("http") ? "_blank" : undefined}
                  rel={g.link.startsWith("http") ? "noopener noreferrer" : undefined}
                  sx={{ display: "flex", textDecoration: "none", color: "inherit", "&:hover": { opacity: 0.75 } }}
                >
                  {content}
                </Box>
              )
            }
            return <Box key={g.id}>{content}</Box>
          })}
        </Box>
      )}
    </WidgetCard>
  )
}

export function HomeWidgets({
  role,
  importantNotice,
  nextEvents,
  helpdesk,
  officeOpen,
  emergencyContacts,
  livingGuides,
  laundry,
}: {
  role: string
  importantNotice: ImportantNoticeView | null
  nextEvents: EventView[]
  helpdesk: HelpdeskSummaryView | null
  officeOpen: boolean
  emergencyContacts: EmergencyContactView[]
  livingGuides: LivingGuideView[]
  laundry: LaundryWidgetView | null
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(auto-fit, minmax(215px, 1fr))" },
        gap: { xs: 1.25, sm: 1.5, md: 2 },
      }}
    >
      {importantNotice && <NoticeCard notice={importantNotice} href={`/${role}/pengumuman`} />}
      {nextEvents.length > 0 && <EventsCard events={nextEvents} href={`/${role}/pengumuman`} />}
      {laundry && <LaundryCard machineName={laundry.machineName} endsAt={laundry.endsAt} href={`/${role}/laundry`} />}
      {officeOpen && !helpdesk && <AskOfficeCard href={`/${role}/helpdesk`} />}
      {helpdesk && <HelpdeskCard ticket={helpdesk} href={`/${role}/helpdesk`} officeOpen={officeOpen} />}
      {emergencyContacts.length > 0 && <ContactsCard contacts={emergencyContacts} />}
      {livingGuides.length > 0 && <GuidesCard guides={livingGuides} />}
    </Box>
  )
}
