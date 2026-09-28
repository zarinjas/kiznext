import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, forbidden, badRequest, serverError } from "@/lib/mobile-auth"
import { ADMIN_ROLES } from "@/lib/rbac"

export const runtime = "nodejs"

type Action = "approve" | "reject" | "check_in" | "check_out" | "mark_paid"

/** Guest-house booking lifecycle: approve / reject / check in / out / mark paid. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (!ADMIN_ROLES.includes(auth.user.role)) return forbidden("Admins only.")

  const { id } = await params
  const body = await req.json().catch(() => null)
  const action = body?.action as Action
  if (!["approve", "reject", "check_in", "check_out", "mark_paid"].includes(action)) {
    return badRequest("Unknown action.")
  }

  try {
    const booking = await prisma.guestHouseBooking.findUnique({ where: { id } })
    if (!booking || booking.deletedAt) return badRequest("Booking not found.")

    const data =
      action === "approve"
        ? { status: "approved" as const, approvedById: auth.user.id }
        : action === "reject"
          ? { status: "rejected" as const }
          : action === "check_in"
            ? { status: "checked_in" as const }
            : action === "check_out"
              ? { status: "checked_out" as const }
              : { paymentStatus: "paid_manual" as const }

    await prisma.guestHouseBooking.update({ where: { id }, data })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/admin/bookings/guest-house] failed", err)
    return serverError("Couldn't update the booking.")
  }
}
