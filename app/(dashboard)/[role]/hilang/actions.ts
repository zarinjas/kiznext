"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function reportItem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const itemName = formData.get("itemName") as string
  const description = formData.get("description") as string
  const status = formData.get("status") as string
  const locationFound = formData.get("locationFound") as string
  const photo = formData.get("photo") as File | null

  if (!itemName || !description) throw new Error("Please fill in the required fields")

  let photoUrl: string | null = null

  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg"
    const filename = `${session.user.id}-${Date.now()}.${ext}`
    const uploadDir = join(process.cwd(), "public", "uploads")
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await photo.arrayBuffer())
    await writeFile(join(uploadDir, filename), buffer)
    photoUrl = `/uploads/${filename}`
  }

  await prisma.lostFoundItem.create({
    data: {
      reportedBy: session.user.id,
      itemName,
      description,
      status: status === "found" ? "found" : "lost",
      locationFound: locationFound || null,
      photoUrl,
    },
  })

  revalidatePath(`/${session.user.role}/hilang`)
}

export async function markClaimed(itemId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const item = await prisma.lostFoundItem.findUnique({ where: { id: itemId } })
  if (!item) throw new Error("Item not found")

  if (item.reportedBy === session.user.id) {
    await prisma.lostFoundItem.update({
      where: { id: itemId },
      data: { status: "claimed" },
    })
  }

  revalidatePath(`/${session.user.role}/hilang`)
}
