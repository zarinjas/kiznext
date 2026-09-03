import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { AnnouncementForm } from "./announcement-form"
import { EditAnnouncementButton } from "./edit-announcement-button"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { color, radius } from "@/lib/theme"

export default async function UrusPengumumanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  })

  return (
    <Box sx={{ maxWidth: 820, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Manage Announcements"
        subtitle="Add, edit, and manage KIZ announcements."
      />

      <FormSection title="New Announcement" subtitle="Publish to all residents." icon="campaign">
        <AnnouncementForm role={session.user.role} />
      </FormSection>

      {announcements.length === 0 ? (
        <Box sx={{ mt: 3 }}>
          <KEmpty icon="campaign" title="Nothing posted yet" body="Publish the first one above and get the word out!" />
        </Box>
      ) : (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
            All announcements · {announcements.length}
          </Typography>
          {announcements.map((a) => (
            <Box
              key={a.id}
              sx={{
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                overflow: "hidden",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 2 }}>
                {a.isPinned && <KIcon icon="push_pin" size={15} filled sx={{ flexShrink: 0 }} />}
                <Box
                  component="span"
                  sx={{
                    fontSize: 11.5,
                    fontWeight: 550,
                    textTransform: "capitalize",
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    flexShrink: 0,
                    backgroundColor: a.tag === "important" ? color.danger.soft : "action.hover",
                    color: a.tag === "important" ? color.danger.ink : "text.secondary",
                  }}
                >
                  {a.tag}
                </Box>
                <Typography sx={{ fontWeight: 550, flex: 1, minWidth: 0, letterSpacing: "-0.011em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </Typography>
                {a.scheduledAt && (
                  <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.25, color: color.warning.ink, fontSize: 11.5, fontWeight: 550 }}>
                    <KIcon icon="schedule" size={13} />
                    {new Date(a.scheduledAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: "text.disabled", display: { xs: "none", sm: "block" }, flexShrink: 0 }}>
                  {new Date(a.createdAt).toLocaleDateString("en-MY", { day: "numeric", month: "short" })}
                </Typography>
                <EditAnnouncementButton
                  role={session.user.role}
                  announcement={{
                    id: a.id,
                    title: a.title,
                    content: a.content,
                    tag: a.tag,
                    attachmentUrl: a.attachmentUrl,
                    attachmentType: a.attachmentType,
                    isPinned: a.isPinned,
                    scheduledAt: a.scheduledAt?.toISOString() || null,
                    expiresAt: a.expiresAt?.toISOString() || null,
                  }}
                />
              </Box>
              <Box sx={{ borderTop: "1px solid", borderColor: "divider", px: 2, py: 1.75 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {a.content}
                </Typography>
                {a.attachmentUrl && (
                  <Box
                    component="a"
                    href={a.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      mt: 1.5,
                      px: 1.5,
                      py: 0.875,
                      borderRadius: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      fontSize: 13,
                      fontWeight: 550,
                      textDecoration: "none",
                      color: "text.primary",
                      "&:hover": { backgroundColor: "action.hover" },
                    }}
                  >
                    <KIcon icon={a.attachmentType === "pdf" ? "description" : "image"} size={15} />
                    {a.attachmentType === "pdf" ? "Open PDF" : "Open image"}
                  </Box>
                )}
                <Typography variant="caption" sx={{ display: "block", color: "text.disabled", mt: 1 }}>
                  Posted by {a.poster.name}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
