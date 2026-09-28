"use server"

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { requireRole, ADMIN_ROLES } from "@/lib/rbac"
import { isOfficeHours } from "@/lib/office-hours"
import { getAppSetting } from "@/lib/settings"
import { revalidatePath } from "next/cache"
import type { Role } from "@/lib/rbac"

/**
 * SOS — emergency call routing.
 *
 * During office hours the SOS button dials the KIZ management office; outside
 * them (nights, weekends, public holidays) it dials the on-call duty fellow.
 * Both numbers are admin-configurable AppSettings (never hardcoded) so the
 * office can swap them without a deploy. The routing decision reuses the single
 * source of truth in lib/office-hours.ts.
 */

const OFFICE_PHONE_KEY = "sos_office_phone"
const FELLOW_PHONE_KEY = "sos_fellow_phone"
const FELLOW_NAME_KEY = "sos_fellow_name"

const DEFAULT_FELLOW_LABEL = "Duty Fellow (on-call)"

export interface SosTarget {
  /** True when the KIZ office is open right now (Asia/Kuala_Lumpur). */
  officeOpen: boolean
  /** Number to dial right now, or null when SOS isn't configured yet. */
  phone: string | null
  /** Human label for the target (office vs duty fellow). */
  label: string
  /** False when the phone for the current window isn't set. */
  configured: boolean
}

export interface SosSettings {
  officePhone: string
  fellowPhone: string
  fellowName: string
}

export async function getSosSettings(): Promise<SosSettings> {
  const [officePhone, fellowPhone, fellowName] = await Promise.all([
    getAppSetting(OFFICE_PHONE_KEY),
    getAppSetting(FELLOW_PHONE_KEY),
    getAppSetting(FELLOW_NAME_KEY),
  ])
  return {
    officePhone: officePhone ?? "",
    fellowPhone: fellowPhone ?? "",
    fellowName: fellowName ?? "",
  }
}

/**
 * Resolve the number the SOS button should dial *right now* based on office
 * hours. Returns an unconfigured target (phone: null) when the admin hasn't set
 * the number for the current window — the UI falls back to the static emergency
 * contact list instead.
 */
export async function resolveSosTarget(now: Date = new Date()): Promise<SosTarget> {
  const { officePhone, fellowPhone, fellowName } = await getSosSettings()
  const officeOpen = isOfficeHours(now)
  const fellowLabel = fellowName.trim() || DEFAULT_FELLOW_LABEL

  if (officeOpen) {
    const phone = officePhone.trim() || null
    return { officeOpen: true, phone, label: "KIZ Management Office", configured: phone !== null }
  }

  const phone = fellowPhone.trim() || null
  return { officeOpen: false, phone, label: fellowLabel, configured: phone !== null }
}

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ADMIN_ROLES)
  return session.user.role as Role
}

async function setOrClear(key: string, value: string) {
  const clean = value.trim()
  if (!clean) {
    await prisma.appSetting.deleteMany({ where: { key } })
    return
  }
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: clean },
    create: { key, value: clean },
  })
}

export async function saveSosSettings(input: SosSettings): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdmin()
    await Promise.all([
      setOrClear(OFFICE_PHONE_KEY, input.officePhone),
      setOrClear(FELLOW_PHONE_KEY, input.fellowPhone),
      setOrClear(FELLOW_NAME_KEY, input.fellowName),
    ])
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong — try again.",
    }
  }
}
