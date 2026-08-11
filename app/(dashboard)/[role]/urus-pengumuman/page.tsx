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
import { color } from "@/lib/theme"

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
          <KEmpty icon="campaign" title="No announcements yet" body="Publish the first one above." />
        </Box>
      ) : (
        <Box sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="h3" sx={{ fontFamily: "var(--font-sans), sans-serif" }}>
            All Announcements ({announcements.length})
          </Typography>
          {announcements.map((a) => (
            <Box
              key={a.id}
              sx={{
                borderRadius: 2.5,
                border: "1px solid",
                borderColor: "divider",
                backgroundColor: "background.paper",
                overflow: "hidden",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, p: 1.5 }}>
                {a.isPinned && <KIcon icon="push_pin" size={16} sx={{ color: color.brand[700] }} />}
                <Box
                  component="span"
                  sx={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "capitalize",
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                    backgroundColor: a.tag === "penting" ? color.danger.soft : color.brand[50],
                    color: a.tag === "penting" ? color.danger.ink : color.brand[700],
                  }}
                >
                  {a.tag}
                </Box>
                <Typography variant="body1" sx={{ fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.title}
                </Typography>
                {a.attachmentUrl && (
                  <KIcon icon={a.attachmentType === "pdf" ? "description" : "image"} size={16} sx={{ color: "text.secondary" }} />
                )}
                {a.scheduledAt && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, color: color.warning.ink, fontSize: 11.5, fontWeight: 600 }}>
                    <KIcon icon="schedule" size={13} />
                    {new Date(a.scheduledAt).toLocaleDateString("ms-MY")}
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: "text.disabled" }}>
                  {new Date(a.createdAt).toLocaleDateString("ms-MY")}
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
              <Box sx={{ borderTop: "1px solid", borderColor: "divider", px: 1.5, py: 1.25 }}>
                <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-wrap" }}>
                  {a.content}
                </Typography>
                {a.attachmentUrl && (
                  <Box
                    component="a"
                    href={a.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, mt: 1.5, px: 1.5, py: 0.75, borderRadius: 1.5, backgroundColor: "action.hover", fontSize: 12.5, fontWeight: 600, textDecoration: "none", color: "text.primary", "&:hover": { color: color.brand[700] } }}
                  >
                    <KIcon icon={a.attachmentType === "pdf" ? "description" : "image"} size={15} />
                    {a.attachmentType === "pdf" ? "Open PDF" : "Open Image"}
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
