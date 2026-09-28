import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import Box from "@mui/material/Box"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { FacilityList } from "./facility-list"
import { CategoryAdmin } from "./category-admin"
import { FacilityTabs } from "./tabs"

export default async function UrusFasilitiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ADMIN_ROLES)

  const { tab } = await searchParams
  const showCategories = tab === "categories"

  const role = session.user.role

  if (showCategories) {
    const categories = await prisma.facilityCategory.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { facilities: { where: { deletedAt: null } } } } },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    })

    return (
      <Box sx={{ maxWidth: 820, mx: "auto" }}>
        <PageHeader
          overline="Admin"
          title="Facility Categories"
          subtitle="Group facilities into the sections residents browse."
        />
        <FacilityTabs role={role} tab={tab} />
        <CategoryAdmin
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            section: c.section,
            sortOrder: c.sortOrder,
            facilityCount: c._count.facilities,
          }))}
          role={role}
        />
      </Box>
    )
  }

  const [facilities, blocks, categories] = await Promise.all([
    prisma.facility.findMany({
      where: { deletedAt: null },
      include: { block: true, category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.block.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.facilityCategory.findMany({
      where: { deletedAt: null },
      orderBy: [{ section: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ])

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <PageHeader
        overline="Admin"
        title="Manage Facilities"
        subtitle="Add, edit, and manage KIZ facilities."
      />
      <FacilityTabs role={role} tab={tab} />
      <FacilityList
        facilities={facilities.map((f) => ({
          id: f.id,
          name: f.name,
          blockName: f.block.name,
          description: f.description,
          featuredImage: f.featuredImage,
          gallery: f.gallery,
          price: f.price,
          capacity: f.capacity,
          timeSlotDuration: f.timeSlotDuration,
          maxPerDay: f.maxPerDay,
          requiresApproval: f.requiresApproval,
          categoryName: f.category?.name ?? null,
          categorySection: f.category?.section ?? null,
          categoryId: f.category?.id ?? null,
          bookable: f.bookable,
          status: f.status,
        }))}
        blocks={blocks.map((b) => ({ id: b.id, name: b.name }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          section: c.section,
          sortOrder: c.sortOrder,
        }))}
        role={role}
      />
    </Box>
  )
}
