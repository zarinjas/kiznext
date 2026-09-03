import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { saveUpload, UploadError } from "@/lib/image-upload"

const MAX_UPLOAD = 15 * 1024 * 1024

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

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const { url, filename } = await saveUpload(buffer, {
      dir: "fasiliti",
      prefix: "upload",
      maxBytes: MAX_UPLOAD,
      allowPdf: true,
    })
    return NextResponse.json({ url, filename })
  } catch (err) {
    const message = err instanceof UploadError ? err.message : "Upload failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
