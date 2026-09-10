"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { saveUpload } from "@/lib/image-upload"
import { OTHER_LOCATION, KIZ_LOCATIONS } from "@/lib/lost-found-meta"

/** KL calendar "today" as an integer YYYYMMDD for a not-in-the-future check. */
function malaysiaTodayCode(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return Number(`${value.year}${value.month}${value.day}`)
}

function parseHappenedDate(raw: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new Error("Pick the date this happened.")
  const date = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) throw new Error("Pick the date this happened.")
  const code = Number(raw.replace(/-/g, ""))
  if (code > malaysiaTodayCode()) throw new Error("That date is in the future — pick when it actually happened.")
  return date
}

function parseHappenedTime(raw: string): string | null {
  const value = raw.trim()
  if (!value) return null
  if (!/^\d{1,2}:\d{2}$/.test(value)) throw new Error("That approximate time doesn't look right.")
  const [h, m] = value.split(":").map(Number)
  if (h > 23 || m > 59) throw new Error("That approximate time doesn't look right.")
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

export async function reportItem(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const type = formData.get("type") as string
  const itemName = (formData.get("itemName") as string)?.trim() ?? ""
  const description = (formData.get("description") as string)?.trim() ?? ""
  const locationSelect = (formData.get("location") as string) ?? ""
  const locationOther = (formData.get("locationOtherText") as string)?.trim() ?? ""
  const happenedDateRaw = (formData.get("happenedDate") as string) ?? ""
  const happenedTimeRaw = (formData.get("happenedTime") as string) ?? ""
  const photo = formData.get("photo") as File | null

  if (type !== "lost" && type !== "found") throw new Error("Pick one first — did you lose or find something?")
  if (!itemName) throw new Error("Tell us what the item is.")
  if (!description) throw new Error("Add a short description so it can be recognised.")

  let locationFound: string | null = null
  if (locationSelect === OTHER_LOCATION) {
    if (!locationOther) throw new Error("Tell us the exact location.")
    locationFound = locationOther
  } else if (locationSelect) {
    if (!KIZ_LOCATIONS.includes(locationSelect)) throw new Error("Pick a location from the list.")
    locationFound = locationSelect
  }

  const happenedDate = parseHappenedDate(happenedDateRaw)
  const happenedTime = parseHappenedTime(happenedTimeRaw)

  let photoUrl: string | null = null

  if (photo && photo.size > 0) {
    const result = await saveUpload(Buffer.from(await photo.arrayBuffer()), {
      prefix: session.user.id,
      maxBytes: 12 * 1024 * 1024,
    })
    photoUrl = result.url
  }

  await prisma.lostFoundItem.create({
    data: {
      reportedBy: session.user.id,
      itemName,
      description,
      status: type,
      locationFound,
      happenedDate,
      happenedTime,
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
