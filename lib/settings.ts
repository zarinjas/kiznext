"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { unlink } from "fs/promises"
import path from "path"
import { saveUpload } from "@/lib/image-upload"

const MAX_SIZE = 2 * 1024 * 1024
const LOGO_KEY = "app_logo"

const CARD_BG_MAX_SIZE = 4 * 1024 * 1024
const STUDENT_CARD_BG_KEY = "student_card_bg"
const STUDENT_CARD_COLOR_KEY = "student_card_color"
const STUDENT_CARD_COLOR_END_KEY = "student_card_color_end"
const DEFAULT_STUDENT_CARD_COLOR = "#0891B2"
const HEX_RE = /^#[0-9a-fA-F]{6}$/

// Resend email config — admin-settable from App Settings so no server-side
// `.env` edit is needed to switch the API key. Key names match lib/email.ts.
const RESEND_API_KEY_SETTING = "resend_api_key"
const RESEND_FROM_SETTING = "resend_from"
const DEFAULT_RESEND_FROM = "KIZ Super App <no-reply@mykiz.my>"
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/


export async function getAppSetting(key: string): Promise<string | null> {
  const setting = await prisma.appSetting.findUnique({ where: { key } })
  return setting?.value ?? null
}

export async function getAppLogoUrl(): Promise<string | null> {
  return getAppSetting(LOGO_KEY)
}

export async function uploadAppLogo(formData: FormData): Promise<{ success: boolean; error?: string; url?: string }> {
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
}

export async function removeAppLogo(): Promise<{ success: boolean; error?: string }> {
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
}

/** Student Digital Card design — background image + name-bar colour/gradient, admin-configurable. */
export interface StudentCardDesign {
  backgroundUrl: string | null
  color: string
  colorEnd: string | null
}

export async function getStudentCardDesign(): Promise<StudentCardDesign> {
  const [bg, colorStart, colorEnd] = await Promise.all([
    getAppSetting(STUDENT_CARD_BG_KEY),
    getAppSetting(STUDENT_CARD_COLOR_KEY),
    getAppSetting(STUDENT_CARD_COLOR_END_KEY),
  ])
  return {
    backgroundUrl: bg,
    color: colorStart ?? DEFAULT_STUDENT_CARD_COLOR,
    colorEnd: colorEnd || null,
  }
}

export async function uploadStudentCardBackground(
  formData: FormData
): Promise<{ success: boolean; error?: string; url?: string }> {
  const session = await auth()
  if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
    return { success: false, error: "Unauthorized" }
  }

  const file = formData.get("background") as File | null
  if (!file || file.size === 0) {
    return { success: false, error: "No file selected" }
  }

  const existing = await prisma.appSetting.findUnique({ where: { key: STUDENT_CARD_BG_KEY } })
  if (existing?.value) {
    const oldPath = path.join(process.cwd(), "public", existing.value)
    try { await unlink(oldPath) } catch {}
  }

  let url: string
  try {
    const result = await saveUpload(Buffer.from(await file.arrayBuffer()), {
      prefix: "student-card-bg",
      maxBytes: CARD_BG_MAX_SIZE,
    })
    url = result.url
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
  }

  await prisma.appSetting.upsert({
    where: { key: STUDENT_CARD_BG_KEY },
    update: { value: url },
    create: { key: STUDENT_CARD_BG_KEY, value: url },
  })

  revalidatePath("/", "layout")
  return { success: true, url }
}

export async function removeStudentCardBackground(): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
    return { success: false, error: "Unauthorized" }
  }

  const existing = await prisma.appSetting.findUnique({ where: { key: STUDENT_CARD_BG_KEY } })
  if (existing?.value) {
    const filePath = path.join(process.cwd(), "public", existing.value)
    try { await unlink(filePath) } catch {}
  }

  await prisma.appSetting.deleteMany({ where: { key: STUDENT_CARD_BG_KEY } })

  revalidatePath("/", "layout")
  return { success: true }
}

export async function setStudentCardColor(
  colorHex: string
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
    return { success: false, error: "Unauthorized" }
  }

  if (!HEX_RE.test(colorHex)) {
    return { success: false, error: "Invalid colour value" }
  }

  await prisma.appSetting.upsert({
    where: { key: STUDENT_CARD_COLOR_KEY },
    update: { value: colorHex },
    create: { key: STUDENT_CARD_COLOR_KEY, value: colorHex },
  })

  revalidatePath("/", "layout")
  return { success: true }
}

export async function setStudentCardColorEnd(
  colorHex: string | null
): Promise<{ success: boolean; error?: string }> {
  const session = await auth()
  if (!session?.user || (session.user.role !== "superadmin" && session.user.role !== "admin_kiz")) {
    return { success: false, error: "Unauthorized" }
  }

  if (colorHex === null) {
    await prisma.appSetting.deleteMany({ where: { key: STUDENT_CARD_COLOR_END_KEY } })
    revalidatePath("/", "layout")
    return { success: true }
  }

  if (!HEX_RE.test(colorHex)) {
    return { success: false, error: "Invalid colour value" }
  }

  await prisma.appSetting.upsert({
    where: { key: STUDENT_CARD_COLOR_END_KEY },
    update: { value: colorHex },
    create: { key: STUDENT_CARD_COLOR_END_KEY, value: colorHex },
  })

  revalidatePath("/", "layout")
  return { success: true }
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
}
