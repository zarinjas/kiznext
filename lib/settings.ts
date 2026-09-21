"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import path from "path"
import { saveUpload } from "@/lib/image-upload"

const MAX_SIZE = 2 * 1024 * 1024
const LOGO_KEY = "app_logo"
const LOGIN_BACKGROUND_KEY = "login_background"
const LOGIN_BACKGROUND_MAX_SIZE = 12 * 1024 * 1024
const DASHBOARD_HERO_BG_KEY = "dashboard_hero_bg"
const DASHBOARD_HERO_BG_MAX_SIZE = 12 * 1024 * 1024
const DASHBOARD_POSTER_KEY = "dashboard_poster"
const DASHBOARD_POSTER_MAX_SIZE = 12 * 1024 * 1024

const CARD_BG_MAX_SIZE = 4 * 1024 * 1024
const STUDENT_CARD_BG_KEY = "student_card_bg"
const FELLOW_CARD_BG_KEY = "fellow_card_bg"
/** Principal, Deputy Principal, staff and admins share this card background. */
const STAFF_CARD_BG_KEY = "staff_card_bg"
const STUDENT_CARD_UKM_LOGO_KEY = "student_card_ukm_logo"
const STUDENT_CARD_KIZ_LOGO_KEY = "student_card_kiz_logo"
/** Superadmin-set residential session shown on the student card, e.g. "2026/2027". */
const RESIDENTIAL_SESSION_KEY = "residential_session"

// Resend email config — admin-settable from App Settings so no server-side
// `.env` edit is needed to switch the API key. Key names match lib/email.ts.
const RESEND_API_KEY_SETTING = "resend_api_key"
const RESEND_FROM_SETTING = "resend_from"
const DEFAULT_RESEND_FROM = "KIZ Super App <no-reply@mykiz.my>"
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/

/**
 * Log an unexpected server-action failure and turn it into a plain result so
 * the client never hangs and always surfaces a readable message. The raw error
 * is written to the server log (journalctl) for diagnosis.
 */
function actionError(label: string, err: unknown): { success: false; error: string } {
  console.error(`[settings:${label}]`, err)
  return {
    success: false,
    error: err instanceof Error ? err.message : "Something went wrong — try again.",
  }
}

export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function getAppLogoUrl(): Promise<string | null> {
  return getAppSetting(LOGO_KEY)
}

export async function getLoginBackgroundUrl(): Promise<string | null> {
  return getAppSetting(LOGIN_BACKGROUND_KEY)
}

export async function uploadAppLogo(formData: FormData): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("logo") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No file selected" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: LOGO_KEY } })
    if (existing?.value) {
      const oldPath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(oldPath) } catch {}
    }

    let url: string
    try {
      const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
        prefix: "logo",
        maxBytes: MAX_SIZE,
        allowSvg: true,
      })
      url = result.url
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
    }

    await prisma.appSetting.upsert({
      where: { key: LOGO_KEY },
      update: { value: url },
      create: { key: LOGO_KEY, value: url },
    })

    revalidatePath("/", "layout")
    return { success: true, url }
  } catch (err) {
    return actionError("uploadAppLogo", err)
  }
}

export async function removeAppLogo(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: LOGO_KEY } })
    if (existing?.value) {
      const filePath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(filePath) } catch {}
    }

    await prisma.appSetting.deleteMany({ where: { key: LOGO_KEY } })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError("removeAppLogo", err)
  }
}

/** Digital Resident ID design — admin-configurable background image + logos. */
export interface StudentCardDesign {
  backgroundUrl: string | null
  /** UKM crest — left logo slot on the card. */
  ukmLogoUrl: string | null
  /** KIZ logo — right logo slot on the card. */
  kizLogoUrl: string | null
  /** "Residential Session" line shown on the card, e.g. "2026/2027". */
  session: string | null
}

/**
 * Which uploaded background a role uses. Students keep their own design,
 * fellows get a dedicated one, and everyone else (principal, deputy principal,
 * staff, admins) shares a third.
 */
export type CardDesignSlot = "student" | "fellow" | "staff"

const CARD_BG_KEYS: Record<CardDesignSlot, string> = {
  student: STUDENT_CARD_BG_KEY,
  fellow: FELLOW_CARD_BG_KEY,
  staff: STAFF_CARD_BG_KEY,
}

function cardSlotForRole(role: string): CardDesignSlot {
  if (role === "ahli") return "student"
  if (role === "fellow") return "fellow"
  return "staff"
}

/** Resolve the uploaded student-card logos, falling UI-side to a monogram tile. */
export async function getStudentCardLogos(): Promise<{ ukmLogoUrl: string | null; kizLogoUrl: string | null }> {
  const [ukm, kiz] = await Promise.all([
    getAppSetting(STUDENT_CARD_UKM_LOGO_KEY),
    getAppSetting(STUDENT_CARD_KIZ_LOGO_KEY),
  ])
  return { ukmLogoUrl: ukm || null, kizLogoUrl: kiz || null }
}

/**
 * The Residential Session printed on the student card ("Residential Session
 * 2026/2027"). Superadmin sets it in App Settings; until then it falls back to
 * the active intake's name so the card never looks empty.
 */
export async function getResidentialSession(): Promise<string | null> {
  const stored = await getAppSetting(RESIDENTIAL_SESSION_KEY)
  if (stored?.trim()) return stored.trim()
  const intake = await prisma.intake.findFirst({
    where: { status: "active", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { name: true },
  })
  return intake?.name ?? null
}

export async function setResidentialSession(
  value: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }
    const clean = value.trim()
    if (!clean) return { success: false, error: "Session can't be empty." }

    await prisma.appSetting.upsert({
      where: { key: RESIDENTIAL_SESSION_KEY },
      update: { value: clean },
      create: { key: RESIDENTIAL_SESSION_KEY, value: clean },
    })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError("setResidentialSession", err)
  }
}

export async function getStudentCardDesign(): Promise<StudentCardDesign> {
  return getCardDesign("ahli")
}

/**
 * Resolve the Digital Resident ID design for a role — picks the right uploaded
 * background (student / fellow / shared staff) plus the shared logos + session.
 */
export async function getCardDesign(role: string): Promise<StudentCardDesign> {
  const [bg, logos, session] = await Promise.all([
    getAppSetting(CARD_BG_KEYS[cardSlotForRole(role)]),
    getStudentCardLogos(),
    getResidentialSession(),
  ])
  return { backgroundUrl: bg ?? null, ...logos, session }
}

/** All three uploaded card backgrounds, for the admin settings form. */
export async function getAllCardBackgrounds(): Promise<Record<CardDesignSlot, string | null>> {
  const [student, fellow, staff] = await Promise.all([
    getAppSetting(STUDENT_CARD_BG_KEY),
    getAppSetting(FELLOW_CARD_BG_KEY),
    getAppSetting(STAFF_CARD_BG_KEY),
  ])
  return { student: student ?? null, fellow: fellow ?? null, staff: staff ?? null }
}

export async function uploadStudentCardLogo(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  const key = formData.get("slot") as string | null
  const settingKey =
    key === "ukm" ? STUDENT_CARD_UKM_LOGO_KEY : key === "kiz" ? STUDENT_CARD_KIZ_LOGO_KEY : null
  if (!settingKey) return { success: false, error: "Invalid logo slot" }

  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("logo") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No file selected" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: settingKey } })
    if (existing?.value) {
      const oldPath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(oldPath) } catch {}
    }

    let url: string
    try {
      const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
        prefix: key === "ukm" ? "ukm-logo" : "kiz-logo",
        maxBytes: MAX_SIZE,
        allowSvg: true,
      })
      url = result.url
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
    }

    await prisma.appSetting.upsert({
      where: { key: settingKey },
      update: { value: url },
      create: { key: settingKey, value: url },
    })

    revalidatePath("/", "layout")
    return { success: true, url }
  } catch (err) {
    return actionError("uploadStudentCardLogo", err)
  }
}

export async function removeStudentCardLogo(
  slot: "ukm" | "kiz"
): Promise<{ success: boolean; error?: string }> {
  const settingKey = slot === "ukm" ? STUDENT_CARD_UKM_LOGO_KEY : STUDENT_CARD_KIZ_LOGO_KEY
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: settingKey } })
    if (existing?.value) {
      const filePath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(filePath) } catch {}
    }

    await prisma.appSetting.deleteMany({ where: { key: settingKey } })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError("removeStudentCardLogo", err)
  }
}

export async function uploadCardBackground(
  slot: CardDesignSlot,
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  const settingKey = CARD_BG_KEYS[slot]
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("background") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No file selected" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: settingKey } })
    if (existing?.value) {
      const oldPath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(oldPath) } catch {}
    }

    let url: string
    try {
      const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
        prefix: `${slot}-card-bg`,
        maxBytes: CARD_BG_MAX_SIZE,
      })
      url = result.url
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
    }

    await prisma.appSetting.upsert({
      where: { key: settingKey },
      update: { value: url },
      create: { key: settingKey, value: url },
    })

    revalidatePath("/", "layout")
    return { success: true, url }
  } catch (err) {
    return actionError(`uploadCardBackground:${slot}`, err)
  }
}

export async function removeCardBackground(
  slot: CardDesignSlot
): Promise<{ success: boolean; error?: string }> {
  const settingKey = CARD_BG_KEYS[slot]
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: settingKey } })
    if (existing?.value) {
      const filePath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(filePath) } catch {}
    }

    await prisma.appSetting.deleteMany({ where: { key: settingKey } })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError(`removeCardBackground:${slot}`, err)
  }
}

export async function uploadLoginBackground(formData: FormData): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("background") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No file selected" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: LOGIN_BACKGROUND_KEY } })
    if (existing?.value) {
      try { await unlink(path.join(process.cwd(), "public", existing.value)) } catch {}
    }

    const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
      prefix: "login-background",
      maxBytes: LOGIN_BACKGROUND_MAX_SIZE,
    })

    await prisma.appSetting.upsert({
      where: { key: LOGIN_BACKGROUND_KEY },
      update: { value: result.url },
      create: { key: LOGIN_BACKGROUND_KEY, value: result.url },
    })

    revalidatePath("/login")
    return { success: true, url: result.url }
  } catch (err) {
    return actionError("uploadLoginBackground", err)
  }
}

export async function removeLoginBackground(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: LOGIN_BACKGROUND_KEY } })
    if (existing?.value) {
      try { await unlink(path.join(process.cwd(), "public", existing.value)) } catch {}
    }
    await prisma.appSetting.deleteMany({ where: { key: LOGIN_BACKGROUND_KEY } })

    revalidatePath("/login")
    return { success: true }
  } catch (err) {
    return actionError("removeLoginBackground", err)
  }
}

// ── Dashboard hero background ──────────────────────────────────────────────
// Optional full-width banner image behind the member dashboard hero card. When
// unset, the hero falls back to the default soft gradient. On mobile the image
// is anchored bottom-right so the designed focal point stays in view.

export async function getDashboardHeroBackground(): Promise<string | null> {
  return getAppSetting(DASHBOARD_HERO_BG_KEY)
}

export async function uploadDashboardHeroBackground(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("background") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No file selected" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: DASHBOARD_HERO_BG_KEY } })
    if (existing?.value) {
      const oldPath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(oldPath) } catch {}
    }

    const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
      prefix: "dashboard-hero",
      maxBytes: DASHBOARD_HERO_BG_MAX_SIZE,
    })

    await prisma.appSetting.upsert({
      where: { key: DASHBOARD_HERO_BG_KEY },
      update: { value: result.url },
      create: { key: DASHBOARD_HERO_BG_KEY, value: result.url },
    })

    revalidatePath("/", "layout")
    return { success: true, url: result.url }
  } catch (err) {
    return actionError("uploadDashboardHeroBackground", err)
  }
}

export async function removeDashboardHeroBackground(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: DASHBOARD_HERO_BG_KEY } })
    if (existing?.value) {
      try { await unlink(path.join(process.cwd(), "public", existing.value)) } catch {}
    }
    await prisma.appSetting.deleteMany({ where: { key: DASHBOARD_HERO_BG_KEY } })
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError("removeDashboardHeroBackground", err)
  }
}

// ── Dashboard poster ─────────────────────────────────────────────────────────
// Optional portrait poster (Instagram-style, 1080 × 1350) shown beside the
// Things-to-do card on the member dashboard. Hidden when not set.

export async function getDashboardPoster(): Promise<string | null> {
  return getAppSetting(DASHBOARD_POSTER_KEY)
}

export async function uploadDashboardPoster(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("poster") as File | null
    if (!file || file.size === 0) {
      return { success: false, error: "No file selected" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: DASHBOARD_POSTER_KEY } })
    if (existing?.value) {
      const oldPath = path.join(process.cwd(), "public", existing.value)
      try { await unlink(oldPath) } catch {}
    }

    const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
      prefix: "dashboard-poster",
      maxBytes: DASHBOARD_POSTER_MAX_SIZE,
    })

    await prisma.appSetting.upsert({
      where: { key: DASHBOARD_POSTER_KEY },
      update: { value: result.url },
      create: { key: DASHBOARD_POSTER_KEY, value: result.url },
    })

    revalidatePath("/", "layout")
    return { success: true, url: result.url }
  } catch (err) {
    return actionError("uploadDashboardPoster", err)
  }
}

export async function removeDashboardPoster(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
      return { success: false, error: "Unauthorized" }
    }

    const existing = await prisma.appSetting.findUnique({ where: { key: DASHBOARD_POSTER_KEY } })
    if (existing?.value) {
      try { await unlink(path.join(process.cwd(), "public", existing.value)) } catch {}
    }
    await prisma.appSetting.deleteMany({ where: { key: DASHBOARD_POSTER_KEY } })
    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError("removeDashboardPoster", err)
  }
}

// ── Resend email configuration ────────────────────────────────────────────────
// The API key is read back only as a "is it set?" flag — never sent to the
// browser. Replacing it means typing a new key; removing deletes the stored one.

export interface ResendConfig {
  apiKeySet: boolean
  /** Effective sender currently used by lib/email.ts (setting > env > default). */
  from: string
}

function isResendAdmin(session: { user?: { role?: string } | null } | null): boolean {
  return session?.user?.role === "superadmin" || session?.user?.role === "admin_kiz"
}

export async function getResendConfig(): Promise<ResendConfig> {
  const [storedKey, storedFrom] = await Promise.all([
    getAppSetting(RESEND_API_KEY_SETTING),
    getAppSetting(RESEND_FROM_SETTING),
  ])
  return {
    apiKeySet: Boolean(storedKey?.trim()),
    from: storedFrom?.trim() || process.env.RESEND_FROM || DEFAULT_RESEND_FROM,
  }
}

export async function saveResendConfig(input: {
  apiKey: string
  from: string
  removeKey: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth()
    if (!isResendAdmin(session)) {
      return { success: false, error: "Unauthorized" }
    }

    const from = input.from.trim()
    if (!from) {
      return { success: false, error: "From address is required" }
    }

    // "From" may carry a display name, e.g. "KIZ Super App <no-reply@mykiz.my>".
    const match = from.match(/^.*<([^>]+)>$/)
    const bareFrom = (match ? match[1] : from).trim()
    if (!EMAIL_RE.test(bareFrom)) {
      return { success: false, error: "From isn't a valid email address" }
    }

    if (input.removeKey) {
      await prisma.appSetting.deleteMany({ where: { key: RESEND_API_KEY_SETTING } })
    } else if (input.apiKey.trim()) {
      const apiKey = input.apiKey.trim()
      if (!apiKey.startsWith("re_") || apiKey.length < 20) {
        return { success: false, error: "That doesn't look like a Resend API key (starts with 're_')" }
      }
      await prisma.appSetting.upsert({
        where: { key: RESEND_API_KEY_SETTING },
        update: { value: apiKey },
        create: { key: RESEND_API_KEY_SETTING, value: apiKey },
      })
    }

    await prisma.appSetting.upsert({
      where: { key: RESEND_FROM_SETTING },
      update: { value: from },
      create: { key: RESEND_FROM_SETTING, value: from },
    })

    revalidatePath("/", "layout")
    return { success: true }
  } catch (err) {
    return actionError("saveResendConfig", err)
  }
}
