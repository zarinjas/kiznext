import { NextRequest, NextResponse } from "next/server"
import {
  authenticate,
  unauthorized,
  badRequest,
  serverError,
} from "@/lib/mobile-auth"
import {
  listNotificationsForUser,
  unreadCountForUser,
  markNotificationReadForUser,
  markAllNotificationsReadForUser,
} from "@/lib/notifications"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** The signed-in user's in-app notification feed + unread badge count. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(auth.user.id, 50),
      unreadCountForUser(auth.user.id),
    ])
    return NextResponse.json({ data: { notifications, unreadCount } })
  } catch (err) {
    console.error("[api/v1/notifications] failed", err)
    return serverError("Couldn't load notifications.")
  }
}

/** Mark one notification read (`{ id }`) or all of them (`{ all: true }`). */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)

  try {
    if (body?.all === true) {
      await markAllNotificationsReadForUser(auth.user.id)
    } else if (typeof body?.id === "string" && body.id) {
      await markNotificationReadForUser(auth.user.id, body.id)
    } else {
      return badRequest("Missing notification id.")
    }
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    console.error("[api/v1/notifications] mark read failed", err)
    return serverError("Couldn't update notifications.")
  }
}
