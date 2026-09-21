import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { saveUpload, UploadError } from "@/lib/image-upload"
import { OTHER_LOCATION, KIZ_LOCATIONS } from "@/lib/lost-found-meta"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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
  if (Number(raw.replace(/-/g, "")) > malaysiaTodayCode()) {
    throw new Error("That date is in the future — pick when it actually happened.")
  }
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

/** Lost & Found feed — every non-deleted report, newest first. */
export async function GET(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  try {
    const items = await prisma.lostFoundItem.findMany({
      where: { deletedAt: null },
      include: { reporter: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({
      data: {
        items: items.map((i) => ({
          id: i.id,
          itemName: i.itemName,
          description: i.description,
          photoUrl: i.photoUrl,
          status: i.status,
          locationFound: i.locationFound,
          happenedDate: i.happenedDate?.toISOString() ?? null,
          happenedTime: i.happenedTime,
          createdAt: i.createdAt.toISOString(),
          reportedBy: i.reportedBy,
          reporterName: i.reporter?.name ?? null,
        })),
      },
    })
  } catch (err) {
    console.error("[api/v1/lost-found] failed", err)
    return serverError("Couldn't load Lost & Found.")
  }
}

/** Report a lost/found item. Multipart — optional `photo` file. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return badRequest("Invalid form data.")
  }

  const type = String(form.get("type") ?? "")
  const itemName = String(form.get("itemName") ?? "").trim()
  const description = String(form.get("description") ?? "").trim()
  const locationSelect = String(form.get("location") ?? "")
  const locationOther = String(form.get("locationOtherText") ?? "").trim()
  const happenedDateRaw = String(form.get("happenedDate") ?? "")
  const happenedTimeRaw = String(form.get("happenedTime") ?? "")
  const photo = form.get("photo") as File | null

  if (type !== "lost" && type !== "found") {
    return badRequest("Pick one first — did you lose or find something?")
  }
  if (!itemName) return badRequest("Tell us what the item is.")
  if (!description) return badRequest("Add a short description so it can be recognised.")

  let locationFound: string | null = null
  if (locationSelect === OTHER_LOCATION) {
    if (!locationOther) return badRequest("Tell us the exact location.")
    locationFound = locationOther
  } else if (locationSelect) {
    if (!KIZ_LOCATIONS.includes(locationSelect)) return badRequest("Pick a location from the list.")
    locationFound = locationSelect
  }

  try {
    const happenedDate = parseHappenedDate(happenedDateRaw)
    const happenedTime = parseHappenedTime(happenedTimeRaw)

    let photoUrl: string | null = null
    if (photo && photo.size > 0) {
      const result = await saveUpload(Buffer.from(await photo.arrayBuffer()), {
        prefix: auth.user.id,
        maxBytes: 12 * 1024 * 1024,
      })
      photoUrl = result.url
    }

    await prisma.lostFoundItem.create({
      data: {
        reportedBy: auth.user.id,
        itemName,
        description,
        status: type,
        locationFound,
        happenedDate,
        happenedTime,
        photoUrl,
      },
    })

    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    if (err instanceof UploadError) return badRequest(err.message)
    const message = err instanceof Error ? err.message : "Couldn't save the report."
    console.error("[api/v1/lost-found report] failed", err)
    return badRequest(message)
  }
}
