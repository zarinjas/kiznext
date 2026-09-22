/**
 * Wallet pass credentials, read from the server `.env`.
 *
 * Both integrations are opt-in: when the relevant env vars are absent the
 * builders return `null` and the mobile UI simply hides that button. Nothing
 * here ever reaches the client — the PEM material is server-only.
 *
 * Google Wallet (generic pass):
 *   GOOGLE_WALLET_ISSUER_ID            numeric issuer id from the Wallet console
 *   GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL  service-account email (JWT `iss`)
 *   GOOGLE_WALLET_PRIVATE_KEY          service-account private key (PEM)
 *   GOOGLE_WALLET_CLASS_ID             optional, defaults to "mykiz_resident_id"
 *
 * Apple Wallet (.pkpass):
 *   APPLE_WALLET_PASS_TYPE_ID          e.g. "pass.my.kiz.app.resident"
 *   APPLE_WALLET_TEAM_ID               Apple Developer team id
 *   APPLE_WALLET_SIGNER_CERT           Pass Type ID certificate (PEM)
 *   APPLE_WALLET_SIGNER_KEY            certificate private key (PEM)
 *   APPLE_WALLET_SIGNER_KEY_PASSPHRASE optional passphrase for the key
 *   APPLE_WALLET_WWDR_CERT             Apple WWDR intermediate cert (PEM)
 *   APPLE_WALLET_ORG_NAME              optional, defaults to "Kolej Ibu Zain"
 *
 * PEM values may be single-line with escaped newlines (`\n`) — common when
 * secrets are pasted into a hosting dashboard — and are un-escaped here.
 */

function env(name: string): string | null {
  const raw = process.env[name]
  const trimmed = raw?.trim()
  return trimmed ? trimmed : null
}

/** Normalise a PEM secret: tolerate `\n` escapes from single-line env storage. */
function pem(name: string): string | null {
  const value = env(name)
  if (!value) return null
  return value.includes("\\n") ? value.replace(/\\n/g, "\n") : value
}

export interface GoogleWalletConfig {
  issuerId: string
  serviceAccountEmail: string
  privateKey: string
  classId: string
}

export function getGoogleWalletConfig(): GoogleWalletConfig | null {
  const issuerId = env("GOOGLE_WALLET_ISSUER_ID")
  const serviceAccountEmail = env("GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL")
  const privateKey = pem("GOOGLE_WALLET_PRIVATE_KEY")
  if (!issuerId || !serviceAccountEmail || !privateKey) return null

  return {
    issuerId,
    serviceAccountEmail,
    privateKey,
    classId: env("GOOGLE_WALLET_CLASS_ID") ?? "mykiz_resident_id",
  }
}

export function isGoogleWalletConfigured(): boolean {
  return getGoogleWalletConfig() !== null
}

export interface AppleWalletConfig {
  passTypeIdentifier: string
  teamIdentifier: string
  organizationName: string
  signerCert: string
  signerKey: string
  signerKeyPassphrase: string | null
  wwdr: string
}

export function getAppleWalletConfig(): AppleWalletConfig | null {
  const passTypeIdentifier = env("APPLE_WALLET_PASS_TYPE_ID")
  const teamIdentifier = env("APPLE_WALLET_TEAM_ID")
  const signerCert = pem("APPLE_WALLET_SIGNER_CERT")
  const signerKey = pem("APPLE_WALLET_SIGNER_KEY")
  const wwdr = pem("APPLE_WALLET_WWDR_CERT")
  if (!passTypeIdentifier || !teamIdentifier || !signerCert || !signerKey || !wwdr) return null

  return {
    passTypeIdentifier,
    teamIdentifier,
    organizationName: env("APPLE_WALLET_ORG_NAME") ?? "Kolej Ibu Zain",
    signerCert,
    signerKey,
    signerKeyPassphrase: env("APPLE_WALLET_SIGNER_KEY_PASSPHRASE"),
    wwdr,
  }
}

export function isAppleWalletConfigured(): boolean {
  return getAppleWalletConfig() !== null
}
