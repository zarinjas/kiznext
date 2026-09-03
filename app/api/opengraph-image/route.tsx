import { ImageResponse } from "next/og"
import { readFile } from "fs/promises"
import path from "path"
import sharp from "sharp"
import { prisma } from "@/lib/db"

// Serves a branded 1200x630 Open Graph image so shared links get a rich
// link preview (WhatsApp/Telegram/etc.) instead of "plain" text. Derives the
// logo from the admin-uploaded app logo (AppSetting `app_logo`) — same source
// as the browser icon — and falls back to a text-only card when no logo is set.
export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const APP_LOGO_KEY = "app_logo"

const CANVAS = { width: 1200, height: 630 }

// Load the uploaded logo and normalise it to a PNG/A data-URI src that
// next/og's <img> can render. Raster files (incl. transparent PNGs) are
// re-encoded to PNG via sharp; SVGs are base64'd and injected as-is.
async function logoDataUri(): Promise<string | null> {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key: APP_LOGO_KEY } })
    const url = setting?.value
    if (!url || !url.startsWith("/uploads/") || url.includes("..")) return null

    const absPath = path.join(process.cwd(), "public", url)
    const ext = path.extname(absPath).slice(1).toLowerCase()
    let bytes: Buffer
    try {
      bytes = await readFile(absPath)
    } catch {
      return null
    }

    if (ext === "svg") {
      return `data:image/svg+xml;base64,${bytes.toString("base64")}`
    }

    const png = await sharp(bytes, { failOn: "none" }).png().toBuffer()
    return `data:image/png;base64,${png.toString("base64")}`
  } catch {
    return null
  }
}

export async function GET() {
  const logoDataUriResolved = await logoDataUri()

  return new ImageResponse(
    (
      // 1200x630 frame with a soft teal gradient and faint corner glows.
      <div
        style={{
          width: CANVAS.width,
          height: CANVAS.height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          backgroundImage:
            "radial-gradient(1200px 420px at 82% -10%, rgba(34,211,238,0.22), transparent 60%)," +
            "radial-gradient(1000px 480px at 4% 108%, rgba(255,255,255,0.16), transparent 55%)," +
            "linear-gradient(135deg, #155E75 0%, #0891B2 52%, #22D3EE 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 96px",
          }}
        >
          {logoDataUriResolved ? (
            <img
              src={logoDataUriResolved}
              width={220}
              height={220}
              style={{ objectFit: "contain", marginBottom: 40 }}
              alt="KIZ Super App logo"
            />
          ) : null}
          <div
            style={{
              display: "flex",
              color: "#FFFFFF",
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: -2,
              lineHeight: 1,
            }}
          >
            KIZ Super App
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              color: "rgba(255,255,255,0.92)",
              fontSize: 34,
              letterSpacing: 0.2,
            }}
          >
            Platform digital bersepadu Kolej Ibu Zain, UKM
          </div>
        </div>
      </div>
    ),
    { ...CANVAS }
  )
}
