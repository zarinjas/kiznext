// Generates the mobile app icon set from the admin-uploaded logo.
// Run from the repo root:  node scripts/generate-app-icons.mjs [logoPath]
// Defaults to the current app_logo uploaded file.
import sharp from "sharp"
import path from "path"
import { fileURLToPath } from "url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(root, "mobile", "assets", "images")
const DEFAULT_LOGO = path.join(root, "public", "uploads", "logo-1788441912349.png")
const logoPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_LOGO

const TEAL = { r: 8, g: 145, b: 178, alpha: 1 }
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 }

const logo = sharp(logoPath)

// 1. iOS / universal icon — the full-bleed square logo.
await logo.clone().resize(1024, 1024, { fit: "cover" }).png().toFile(path.join(OUT, "icon.png"))

// 2. favicon
await logo.clone().resize(48, 48, { fit: "cover" }).png().toFile(path.join(OUT, "favicon.png"))

// 3. splash icon (shown ~120px over the splash background)
await logo.clone().resize(512, 512, { fit: "contain" }).png().toFile(path.join(OUT, "splash-icon.png"))

// 4. Android adaptive foreground — logo badge centred in the 66% safe zone.
const fg = await logo
  .clone()
  .resize(288, 288, { fit: "cover" })
  .extend({ top: 72, bottom: 72, left: 72, right: 72, background: TRANSPARENT })
  .png()
  .toBuffer()
await sharp(fg).toFile(path.join(OUT, "android-icon-foreground.png"))

// 5. Android adaptive background — solid brand teal.
await sharp({ create: { width: 432, height: 432, channels: 4, background: TEAL } })
  .png()
  .toFile(path.join(OUT, "android-icon-background.png"))

// 6. Android monochrome — reuse the foreground badge (themed-icon fallback).
await sharp(fg).toFile(path.join(OUT, "android-icon-monochrome.png"))

// 7. Notification icon — small logo badge.
await logo
  .clone()
  .resize(96, 96, { fit: "cover" })
  .png()
  .toFile(path.join(OUT, "notification-icon.png"))

console.log("Icons written to", OUT)
console.log("Source:", logoPath)
