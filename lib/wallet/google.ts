import crypto from "node:crypto"
import { siteUrl } from "@/lib/site-url"
import type { EcardCard } from "@/lib/ecard"
import { getGoogleWalletConfig } from "./config"

/**
 * Google Wallet generic pass ("Add to Google Wallet").
 *
 * Google's save flow is a single signed link — no Android SDK and no native
 * module required. We build an RS256 JWT with the service-account key, inline
 * the pass class + object in the JWT payload, and hand back the
 * `pay.google.com/gp/v/save/<jwt>` URL the client opens with `Linking`.
 *
 * Signing is done with Node's built-in `crypto` (no extra dependency).
 * Requires a Google Wallet API Issuer account; a `generic` pass is the right
 * type for a resident/membership card.
 */

const SAVE_BASE = "https://pay.google.com/gp/v/save"
const BRAND_BACKGROUND = "#26262B"

interface LocalizedString {
  defaultValue: { language: string; value: string }
}

function localized(value: string): LocalizedString {
  return { defaultValue: { language: "en", value } }
}

function base64url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url")
}

/** A public https image URL, or null when the stored path is empty. */
function publicImageUrl(path: string | null): string | null {
  if (!path) return null
  return siteUrl(path)
}

export function isGoogleWalletConfigured(): boolean {
  return getGoogleWalletConfig() !== null
}

/**
 * Build the "Add to Google Wallet" save URL for a resident, or `null` when the
 * integration isn't configured. `userId` makes the object id stable so saving
 * again updates the same pass instead of creating duplicates.
 */
export function buildGoogleWalletSaveUrl(card: EcardCard, userId: string): string | null {
  const config = getGoogleWalletConfig()
  if (!config) return null

  const classId = `${config.issuerId}.${config.classId}`
  const objectId = `${config.issuerId}.resident_${userId}`
  const logo = publicImageUrl(card.kizLogoUrl)

  const genericClass: Record<string, unknown> = {
    id: classId,
  }

  const textModules = [
    { id: "matric", header: "No. Matrik", body: card.matricId },
    ...(card.block
      ? [
          {
            id: "room",
            header: "Kediaman",
            body: `Blok ${card.block}${card.roomNumber ? ` · Bilik ${card.roomNumber}` : ""}${
              card.bed ? ` · ${card.bed}` : ""
            }`,
          },
        ]
      : []),
    ...(card.session ? [{ id: "session", header: "Sesi", body: card.session }] : []),
    ...(card.validUntil ? [{ id: "valid", header: "Sah sehingga", body: card.validUntil }] : []),
  ]

  const genericObject: Record<string, unknown> = {
    id: objectId,
    classId,
    genericType: "GENERIC_TYPE_UNSPECIFIED",
    state: "ACTIVE",
    cardTitle: localized("KOLEJ IBU ZAIN"),
    header: localized(card.name),
    subheader: localized(card.roleLabel ?? "ACTIVE STUDENT"),
    hexBackgroundColor: BRAND_BACKGROUND,
    barcode: {
      type: "QR_CODE",
      value: card.matricId,
      alternateText: card.matricId,
    },
    textModulesData: textModules,
    ...(logo ? { logo: { sourceUri: { uri: logo } } } : {}),
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: config.serviceAccountEmail,
    aud: "google",
    typ: "savetowallet",
    iat: now,
    origins: [siteUrl()],
    payload: {
      genericClasses: [genericClass],
      genericObjects: [genericObject],
    },
  }

  const header = { alg: "RS256", typ: "JWT" }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(signingInput), config.privateKey)
    .toString("base64url")

  return `${SAVE_BASE}/${signingInput}.${signature}`
}
