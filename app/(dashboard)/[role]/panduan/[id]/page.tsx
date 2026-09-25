import { auth } from "@/lib/auth"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { ADMIN_ROLES, type Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import { KIcon } from "@/components/kiz/primitives/icon"
import { GuideFlipbook } from "@/components/shared/guide/guide-flipbook"
import { guideCategoryMeta } from "@/lib/guide-meta"
import { color } from "@/lib/theme"

export default async function GuideReaderPage({
  params,
}: {
  params: Promise<{ role: string; id: string }>
}) {
  const { role: roleSegment, id } = await params
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role as Role

  const guide = await prisma.guide.findFirst({ where: { id, deletedAt: null } })
  if (!guide) notFound()
  if (!guide.published && !ADMIN_ROLES.includes(role)) notFound()

  // Opening the reader marks the guide as read — clears its "New" badge.
  await prisma.guideRead.upsert({
    where: { guideId_userId: { guideId: guide.id, userId: session.user.id } },
    create: { guideId: guide.id, userId: session.user.id },
    update: {},
  })

  const meta = guideCategoryMeta(guide.category)

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Link
        href={`/${roleSegment}/panduan`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 16,
          fontSize: 13.5,
          fontWeight: 550,
          color: "#71717A",
          textDecoration: "none",
        }}
      >
        <KIcon icon="arrow_back" size={17} />
        All guides
      </Link>

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: meta.tone.soft,
            color: meta.tone.ink,
            flexShrink: 0,
          }}
        >
          <KIcon icon={meta.icon} size={23} />
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Box
              sx={{
                px: 0.9,
                py: 0.2,
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: meta.tone.soft,
                color: meta.tone.ink,
              }}
            >
              {meta.label}
            </Box>
            {!guide.published && (
              <Box
                sx={{
                  px: 0.9,
                  py: 0.2,
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  backgroundColor: color.neutral.soft,
                  color: color.neutral.ink,
                }}
              >
                Draft preview
              </Box>
            )}
          </Box>
          <Typography
            sx={{ fontSize: { xs: 21, sm: 24 }, fontWeight: 640, letterSpacing: "-0.03em", mt: 0.5 }}
          >
            {guide.title}
          </Typography>
          {guide.description && (
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 640 }}>
              {guide.description}
            </Typography>
          )}
        </Box>
      </Box>

      <GuideFlipbook url={guide.fileUrl} title={guide.title} />
    </Box>
  )
}
