import { NextRequest, NextResponse } from "next/server"
import {
  authenticate,
  unauthorized,
  forbidden,
  badRequest,
  serverError,
} from "@/lib/mobile-auth"
import {
  cancelLaundryReminder,
  getLaundrySnapshot,
  startLaundryReminder,
} from "@/lib/laundry"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Laundry is student-only (mirrors the web `/{role}/laundry` page). */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Laundry is for students only.")

  try {
    const snapshot = await getLaundrySnapshot(auth.user.id)
    return NextResponse.json({ data: snapshot })
  } catch (err) {
    console.error("[api/v1/laundry] failed", err)
    return serverError("Couldn't load laundry.")
  }
}

type Body = {
  action?: "start" | "cancel"
  machineId?: string
  durationMinutes?: number
  reminderId?: string
}

/** Start a reminder (`action: "start"`) or cancel your own (`action: "cancel"`). */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()
  if (auth.user.role !== "ahli") return forbidden("Laundry is for students only.")

  const body = (await req.json().catch(() => null)) as Body | null

  try {
    if (body?.action === "start") {
      if (!body.machineId) return badRequest("Pick a machine.")
      const duration = Number(body.durationMinutes)
      await startLaundryReminder(auth.user.id, body.machineId, duration)
    } else if (body?.action === "cancel") {
      if (!body.reminderId) return badRequest("Which reminder?")
      await cancelLaundryReminder(auth.user.id, body.reminderId)
    } else {
      return badRequest("Unknown action.")
    }

    const snapshot = await getLaundrySnapshot(auth.user.id)
    return NextResponse.json({ data: snapshot })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't update the reminder."
    console.error("[api/v1/laundry] action failed", err)
    return badRequest(message)
  }
}
