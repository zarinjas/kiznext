"use server"

import { auth } from "@/lib/auth"
import { requireRole, RESIDENCE_MANAGE_ROLES, type Role } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { fetchSheetCsv } from "@/lib/google-sheets"
import { runApplySync, type SyncResult } from "@/lib/bilik-sync"

/**
 * Pull the configured Google Sheet and apply it to the active intake, then
 * refresh the Student Data page. Write action — residence managers only
 * (pengetua sees the page read-only and never gets this button).
 */
export async function syncNow(): Promise<SyncResult> {
  const session = await auth()
  requireRole(session?.user?.role as Role | undefined, RESIDENCE_MANAGE_ROLES)
  try {
    const csv = await fetchSheetCsv()
    const result = await runApplySync(csv)
    if (result.ok) {
      const role = session!.user.role
      revalidatePath(`/${role}/urus-pelajar`)
      revalidatePath(`/${role}/urus-bilik`)
      revalidatePath(`/${role}/urus-checkin`)
    }
    return result
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed" }
  }
}
