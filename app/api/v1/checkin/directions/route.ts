import { NextResponse } from "next/server"
import { serverError } from "@/lib/mobile-auth"
import { getCheckinDirectionsImage } from "@/lib/checkin"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** Public: the "go to Counter 2" directions image shown after a check-in. */
export async function GET() {
  try {
    const url = await getCheckinDirectionsImage()
    return NextResponse.json({ data: { url } })
  } catch (err) {
    console.error("[api/v1/checkin/directions] failed", err)
    return serverError("Couldn't load the directions image.")
  }
}
