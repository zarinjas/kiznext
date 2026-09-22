import crypto from "node:crypto"
import sharp from "sharp"
import { PKPass, PassType } from "passkit-generator"
import type { Barcode, OverridablePassProps } from "passkit-generator"
import type { EcardCard } from "@/lib/ecard"
import { getAppleWalletConfig } from "./config"

/**
 * Apple Wallet `.pkpass` builder.
 *
 * Apple has no "save link" — a pass must be a signed bundle served with the
 * `application/vnd.apple.pkpass` MIME type, which iOS/Safari recognises and
 * offers to add to Wallet. `passkit-generator` produces the PKCS#7 signature
 * from the Pass Type ID certificate; the icon is drawn on the fly with `sharp`
 * so no binary assets need to be committed.
 */

const BRAND_BACKGROUND = "#26262B"
const BRAND_FOREGROUND = "#FFFFFF"
const BRAND_LABEL = "#B4B4BE"
const TOKEN_TTL_MS = 10 * 60 * 1000

/** Person silhouette on a brand tile — vector-only, so it renders fontless. */
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="87" height="87" viewBox="0 0 87 87">
  <rect width="87" height="87" rx="19" fill="${BRAND_BACKGROUND}"/>
  <circle cx="43.5" cy="33" r="12" fill="${BRAND_FOREGROUND}"/>
  <path d="M19 76c0-13.5 11-24.5 24.5-24.5S68 62.5 68 76z" fill="${BRAND_FOREGROUND}"/>
</svg>`

export function isAppleWalletConfigured(): boolean {
  return getAppleWalletConfig() !== null
}

/** Render the required icon resolutions from the single source SVG. */
async function buildIconBuffers(): Promise<Record<string, Buffer>> {
  const source = await sharp(Buffer.from(ICON_SVG)).png().toBuffer()
  const [icon, icon2x, icon3x] = await Promise.all([
    sharp(source).resize(29, 29).png().toBuffer(),
    sharp(source).resize(58, 58).png().toBuffer(),
    sharp(source).resize(87, 87).png().toBuffer(),
  ])
  return {
    "icon.png": icon,
    "icon@2x.png": icon2x,
    "icon@3x.png": icon3x,
  }
}

function roomLine(card: EcardCard): string | null {
  if (!card.block) return null
  const parts = [`Blok ${card.block}`]
  if (card.roomNumber) parts.push(`Bilik ${card.roomNumber}`)
  if (card.bed) parts.push(card.bed)
  return parts.join(" · ")
}

/** Build the signed `.pkpass` for a resident. Throws when not configured. */
export async function buildApplePass(card: EcardCard, userId: string): Promise<Buffer> {
  const config = getAppleWalletConfig()
  if (!config) throw new Error("Apple Wallet is not configured.")

  const room = roomLine(card)
  const barcode: Barcode = {
    format: "PKBarcodeFormatQR",
    message: card.matricId,
    messageEncoding: "iso-8859-1",
    altText: card.matricId,
  }

  const props: OverridablePassProps = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    serialNumber: userId,
    organizationName: config.organizationName,
    description: "MyKIZ Digital Resident ID",
    logoText: "MyKIZ",
    backgroundColor: BRAND_BACKGROUND,
    foregroundColor: BRAND_FOREGROUND,
    labelColor: BRAND_LABEL,
  }

  const pass = new PKPass(
    await buildIconBuffers(),
    {
      wwdr: config.wwdr,
      signerCert: config.signerCert,
      signerKey: config.signerKey,
      signerKeyPassphrase: config.signerKeyPassphrase ?? undefined,
    },
    props
  )

  const generic = new PassType("generic")
  generic.primaryFields.push({ key: "name", label: "NAME", value: card.name })
  generic.secondaryFields.push({ key: "matric", label: "NO. MATRIK", value: card.matricId })
  if (room) generic.auxiliaryFields.push({ key: "room", label: "KEDIAMAN", value: room })
  if (card.session) {
    generic.backFields.push({ key: "session", label: "Sesi Kediaman", value: card.session })
  }
  if (card.validUntil) {
    generic.backFields.push({ key: "valid", label: "Sah Sehingga", value: card.validUntil })
  }
  generic.backFields.push({
    key: "note",
    label: "Pengesahan",
    value: "Tunjukkan pas ini kepada petugas keselamatan atau staf KIZ untuk pengesahan identiti.",
  })
  pass.types.push(generic)

  pass.setBarcodes(barcode)

  return pass.getAsBuffer()
}

// ── Short-lived download token ────────────────────────────────────────────────
// Safari fetches the .pkpass without our bearer header, so the URL itself has to
// carry proof of identity. This is an HMAC (AUTH_SECRET) over `userId.exp`,
// valid for ten minutes — long enough to open, short enough to be harmless if a
// URL leaks into a log.

function tokenSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not set.")
  return secret
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", tokenSecret()).update(payload).digest("base64url")
}

export function signAppleWalletToken(userId: string): string {
  const payload = `${userId}.${Date.now() + TOKEN_TTL_MS}`
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sign(payload)}`
}

/** Resolve a download token back to its user id, or `null` when invalid/expired. */
export function verifyAppleWalletToken(token: string): string | null {
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature) return null

  let payload: string
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8")
  } catch {
    return null
  }

  const expected = sign(payload)
  const given = Buffer.from(signature)
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null

  const [userId, expiresAt] = payload.split(".")
  const expiry = Number(expiresAt)
  if (!userId || !Number.isFinite(expiry) || expiry < Date.now()) return null
  return userId
}
