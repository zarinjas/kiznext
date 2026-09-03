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
