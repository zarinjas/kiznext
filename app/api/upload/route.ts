import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { saveUpload, UploadError } from "@/lib/image-upload"

const MAX_UPLOAD = 15 * 1024 * 1024
const MAX_GUIDE_UPLOAD = 30 * 1024 * 1024

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Whitelisted subdirectory — chat attachments go to /uploads/chat, Digital
  // Guide PDFs to /uploads/guides, laundry machine photos to /uploads/laundry,
  // everything else stays under /uploads/fasiliti.
  const requestedDir = String(formData.get("dir") ?? "fasiliti")
  const dir =
    requestedDir === "chat"
      ? "chat"
      : requestedDir === "guides"
        ? "guides"
        : requestedDir === "laundry"
          ? "laundry"
          : requestedDir === "onboarding"
            ? "onboarding"
            : "fasiliti"

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const { url, filename } = await saveUpload(buffer, {
      dir,
      prefix: dir === "guides" ? "guide" : "upload",
      maxBytes: dir === "guides" ? MAX_GUIDE_UPLOAD : MAX_UPLOAD,
      allowPdf: true,
    })
    return NextResponse.json({ url, filename })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
