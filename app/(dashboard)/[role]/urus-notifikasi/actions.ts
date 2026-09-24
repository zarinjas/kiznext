"use server"

import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { requireRole, NOTIFICATION_SEND_ROLES, type Role } from "@/lib/rbac"
import {
  sendNotification,
  deleteNotification,
  type SendNotificationInput,
  type SendNotificationResult,
} from "@/lib/notifications"

/**
 * Admin actions for the broadcast notification module. Access is limited to
 * `NOTIFICATION_SEND_ROLES` (superadmin / admin_kiz / pengetua + deputy).
 */

async function requireSender(): Promise<{ id: string; role: Role }> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  const role = session.user.role as Role
  requireRole(role, NOTIFICATION_SEND_ROLES)
  return { id: session.user.id, role }
}

export async function sendNotificationAction(
  input: SendNotificationInput
): Promise<{ success: true; result: SendNotificationResult } | { success: false; error: string }> {
  try {
    const { id, role } = await requireSender()
    const result = await sendNotification(id, input)
    revalidatePath(`/${role}/urus-notifikasi`)
    revalidatePath("/", "layout")
    return { success: true, result }
  } catch (err) {
    console.error("[notifications:send]", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Couldn't send the notification — try again.",
    }
  }
}

export async function deleteNotificationAction(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { role } = await requireSender()
    await deleteNotification(id)
    revalidatePath(`/${role}/urus-notifikasi`)
    return { success: true }
  } catch (err) {
    console.error("[notifications:delete]", err)
    return {
      success: false,
      error: err instanceof Error ? err.message : "Couldn't delete the notification.",
    }
  }
}
