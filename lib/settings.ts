"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { writeFile, unlink, mkdir } from "fs/promises"
import path from "path"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
const MAX_SIZE = 2 * 1024 * 1024
const LOGO_KEY = "app_logo"

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

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { success: false, error: "Only PNG, JPEG, WebP, and SVG files are allowed" }
  }

  if (file.size > MAX_SIZE) {
    return { success: false, error: "File must be under 2MB" }
  }

  const existing = await prisma.appSetting.findUnique({ where: { key: LOGO_KEY } })
  if (existing?.value) {
    const oldPath = path.join(process.cwd(), "public", existing.value)
    try { await unlink(oldPath) } catch {}
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1]
  const filename = `logo-${Date.now()}.${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(uploadDir, filename), buffer)

  const url = `/uploads/${filename}`

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
