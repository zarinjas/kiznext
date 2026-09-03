"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { writeFile, unlink, mkdir } from "fs/promises"
import path from "path"
import type { Role } from "@/lib/rbac"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE = 12 * 1024 * 1024
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pejabat")

async function requireAdmin(): Promise<Role> {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])
  return session.user.role as Role
}

function revalidateFor(role: Role) {
  revalidatePath(`/${role}/pejabat`)
  revalidatePath(`/${role}/urus-pejabat`)
}

async function saveImage(file: File, prefix: string): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only PNG, JPEG, and WebP files are allowed")
  }
  if (file.size > MAX_SIZE) {
    throw new Error("File must be under 12MB")
  }
  const ext = file.type.split("/")[1]
  const filename = `${prefix}-${Date.now()}.${ext}`
  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(
    path.join(UPLOAD_DIR, filename),
    Buffer.from(await file.arrayBuffer()),
  )
  return `/uploads/pejabat/${filename}`
}

async function removeStoredFile(url: string | null | undefined) {
  if (!url) return
  const filePath = path.join(process.cwd(), "public", url)
  try {
    await unlink(filePath)
  } catch {}
}

export type OfficeInput = {
  name: string
  description: string | null
}

export async function updateOffice(id: string, data: OfficeInput) {
  const role = await requireAdmin()
  await prisma.office.update({
    where: { id },
    data: { name: data.name, description: data.description ?? null },
  })
  revalidateFor(role)
}

export async function uploadOfficeImage(
  id: string,
  kind: "featured" | "gallery",
  file: File,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const role = await requireAdmin()
    const url = await saveImage(file, `office-${id.slice(0, 8)}`)
    const office = await prisma.office.findUnique({ where: { id } })
    if (!office) throw new Error("Office not found")

    if (kind === "featured") {
      if (office.featuredImage) await removeStoredFile(office.featuredImage)
      await prisma.office.update({ where: { id }, data: { featuredImage: url } })
    } else {
      await prisma.office.update({
        where: { id },
        data: { gallery: { push: url } },
      })
    }
    revalidateFor(role)
    return { success: true, url }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
  }
}

export async function removeOfficeImage(
  id: string,
  kind: "featured" | "gallery",
  index?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireAdmin()
    const office = await prisma.office.findUnique({ where: { id } })
    if (!office) throw new Error("Office not found")

    if (kind === "featured") {
      await removeStoredFile(office.featuredImage)
      await prisma.office.update({ where: { id }, data: { featuredImage: null } })
    } else {
      const removed = office.gallery[index ?? -1]
      if (removed) await removeStoredFile(removed)
      await prisma.office.update({
        where: { id },
        data: { gallery: office.gallery.filter((_, i) => i !== index) },
      })
    }
    revalidateFor(role)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Remove failed" }
  }
}

export async function updateBlockPanorama(
  blockId: string,
  data: { panoramaLeftX: number; panoramaRightX: number },
) {
  const role = await requireAdmin()
  await prisma.block.update({
    where: { id: blockId },
    data: {
      panoramaLeftX: Math.min(100, Math.max(0, data.panoramaLeftX)),
      panoramaRightX: Math.min(100, Math.max(0, data.panoramaRightX)),
    },
  })
  revalidateFor(role)
}

export async function uploadBlockPanorama(
  blockId: string,
  file: File,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const role = await requireAdmin()
    const url = await saveImage(file, `block-${blockId.slice(0, 8)}`)
    const block = await prisma.block.findUnique({ where: { id: blockId } })
    if (!block) throw new Error("Block not found")
    if (block.panoramaImage) await removeStoredFile(block.panoramaImage)
    await prisma.block.update({ where: { id: blockId }, data: { panoramaImage: url } })
    revalidateFor(role)
    return { success: true, url }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Upload failed" }
  }
}

export async function removeBlockPanorama(
  blockId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const role = await requireAdmin()
    const block = await prisma.block.findUnique({ where: { id: blockId } })
    if (!block) throw new Error("Block not found")
    await removeStoredFile(block.panoramaImage)
    await prisma.block.update({ where: { id: blockId }, data: { panoramaImage: null } })
    revalidateFor(role)
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Remove failed" }
  }
}
