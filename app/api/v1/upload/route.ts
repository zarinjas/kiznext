import { NextRequest, NextResponse } from "next/server"
import { authenticate, unauthorized, badRequest, serverError } from "@/lib/mobile-auth"
import { saveUpload, UploadError } from "@/lib/image-upload"

export const runtime = "nodejs"

const MAX_UPLOAD = 15 * 1024 * 1024
const MAX_GUIDE_UPLOAD = 30 * 1024 * 1024

/**
 * Bearer-token twin of `POST /api/upload` for the mobile app. Whitelisted
 * subdirectory only — chat attachments, guide PDFs, or the default fasiliti.
 */
export async function POST(req: NextRequest) {
  const auth = await authenticate(req)
  if (!auth) return unauthorized()

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file || file.size === 0) return badRequest("No file provided.")

  const requestedDir = String(formData.get("dir") ?? "fasiliti")
  const dir = requestedDir === "chat" ? "chat" : requestedDir === "guides" ? "guides" : "fasiliti"

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const { url, filename } = await saveUpload(buffer, {
      dir,
      prefix: dir === "guides" ? "guide" : "upload",
      maxBytes: dir === "guides" ? MAX_GUIDE_UPLOAD : MAX_UPLOAD,
      allowPdf: true,
    })
    return NextResponse.json({ data: { url, filename } })
  } catch (err) {
    if (err instanceof UploadError) return badRequest(err.message)
    console.error("[api/v1/upload] upload failed", err)
    return serverError("Upload didn't go through.")
  }
}
