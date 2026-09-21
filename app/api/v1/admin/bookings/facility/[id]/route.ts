import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { ADMIN_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"

/** Approve or reject a facility booking. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!ADMIN_ROLES.includes(auth.user.role)) return forbidden("Admins only.")

  const { id } = await params
  const body = await req.json().catch(() => null)
  const action = body?.action
  if (action !== "approve" && action !== "reject") return badRequest("Unknown action.")

  try {
    const booking = await prisma.facilityBooking.findUnique({ where: { id } })
    if (!booking || booking.deletedAt) return badRequest("Booking not found.")

    await prisma.facilityBooking.update({
      where: { id },
      data:
        action === "approve"
          ? { status: "approved", approvedById: auth.user.id }
          : { status: "rejected" },
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/admin/bookings/facility] failed", err)
    return serverError("Couldn't update the booking.")
  }
}
