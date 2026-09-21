import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { saveUpload, UploadError } from "@/lib/image-upload"

export const runtime = "nodejs"

const MAX_AVATAR = 8 * 1024 * 1024

/** Upload/replace the signed-in user's avatar. Multipart field: `file`. */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return badRequest("No file provided.")

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url } = await saveUpload(buffer, {
      prefix: auth.user.id,
      maxBytes: MAX_AVATAR,
    })

    await prisma.user.update({ where: { id: auth.user.id }, data: { avatarUrl: url } })

    return NextResponse.json({ data: { avatarUrl: url } })
  } catch (err) {
    if (err instanceof UploadError) return badRequest(err.message)
    console.error("[api/v1/avatar] upload failed", err)
    return serverError("Upload didn't go through.")
  }
}
