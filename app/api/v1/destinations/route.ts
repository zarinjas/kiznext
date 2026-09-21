import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, serverError } from "@/lib/mobile-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** AR Directory destination pins. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const destinations = await prisma.destination.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json({
      data: {
        destinations: destinations.map((d) => ({
          id: d.id,
          name: d.name,
          type: d.type,
          icon: d.icon,
          latitude: d.latitude,
          longitude: d.longitude,
          indoor: d.indoor,
          building: d.building,
          description: d.description,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/destinations] failed", err)
    return serverError("Couldn't load the directory.")
  }
}
