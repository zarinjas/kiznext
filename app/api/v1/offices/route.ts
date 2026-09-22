import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Administrative offices + the block panorama (labels positioned by office order). */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [offices, blocks] = await Promise.all([
      prisma.office.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" } }),
      prisma.block.findMany({ where: { deletedAt: null } }),
    ])

    const panoramaBlock = blocks.find((b) => b.panoramaImage) ?? null

    return NextResponse.json({
      data: {
        offices: offices.map((o) => ({
          id: o.id,
          name: o.name,
          nameEn: o.nameEn,
          description: o.description,
          categoryLabel: o.categoryLabel,
          categoryIcon: o.categoryIcon,
          categoryTone: o.categoryTone,
          services: o.services,
          location: o.location,
          hoursLabel: o.hoursLabel,
          phone: o.phone,
          featuredImage: o.featuredImage,
          gallery: o.gallery,
        })),
        panorama:
          panoramaBlock?.panoramaImage != null
            ? {
                image: panoramaBlock.panoramaImage,
                leftLabel: offices[0]?.name ?? "KIZ Administration Office",
                leftX: panoramaBlock.panoramaLeftX,
                rightLabel: offices[1]?.name ?? "UKM Real Estate Office",
                rightX: panoramaBlock.panoramaRightX,
              }
            : null,
      },
    })
  } catch (err) {
    console.error("[api/v1/offices] failed", err)
    return serverError("Couldn't load the offices.")
  }
}
