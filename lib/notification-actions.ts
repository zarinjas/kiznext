"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { markAllNotificationsReadForUser, markNotificationReadForUser } from "@/lib/notifications"

/**
 * Session-scoped notification actions for the shell. Every call resolves the
 * current user from the Auth.js session, so a client can only ever mark its
 * own notifications read. The list itself is read server-side in the dashboard
 * layout (`listNotificationsForUser`).
 */

export async function markAllNotificationsRead(): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return
  await markAllNotificationsReadForUser(session.user.id)
  revalidatePath("/", "layout")
}

export async function markNotificationRead(id: string): Promise<void> {
  const session = await auth()
  if (!session?.user?.id) return
  await markNotificationReadForUser(session.user.id, id)
  revalidatePath("/", "layout")
}
