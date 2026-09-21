import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import type { AccountStatus, Role } from "@/lib/rbac"
import { requireRole } from "@/lib/rbac"

/**
 * Mobile bearer-token sessions.
 *
 * The web app signs in through Auth.js (JWT in an httpOnly cookie). React
 * Native has no cookie jar we want to depend on, so the mobile app uses an
 * opaque bearer token instead: the raw token lives in `expo-secure-store` on
 * the device and the DB only ever stores its SHA-256 hash — the same pattern
 * already used for email-verification and invitation tokens.
 *
 * Sessions are long-lived (90 days) with a sliding expiry: any authenticated
 * request more than an hour old bumps `lastUsedAt` and pushes `expiresAt`
 * forward, so an active user never gets logged out but a dormant stolen token
 * eventually dies.
 */

export const MOBILE_SESSION_DAYS = 90
const SLIDING_REFRESH_MS = 60 * 60 * 1000 // only touch the row once an hour

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

export interface MobileUser {
  id: string
  matricId: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  role: Role
  accountStatus: AccountStatus
}

function toMobileUser(user: {
  id: string
  matricId: string
  name: string
  email: string | null
  phone: string | null
  avatarUrl: string | null
  role: Role
  accountStatus: AccountStatus
}): MobileUser {
  return {
    id: user.id,
    matricId: user.matricId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    accountStatus: user.accountStatus,
  }
}

function expiryFromNow(): Date {
  return new Date(Date.now() + MOBILE_SESSION_DAYS * 24 * 60 * 60 * 1000)
}

/** Issue a new session token for a user. Returns the RAW token (shown once). */
export async function createMobileSession(
  userId: string,
  meta: { platform?: string; deviceName?: string } = {}
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken()
  const expiresAt = expiryFromNow()

  await prisma.mobileSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      platform: meta.platform ?? "unknown",
      deviceName: meta.deviceName ?? null,
      expiresAt,
    },
  })

  return { token, expiresAt }
}

/** Pull the raw bearer token out of an Authorization header. */
export function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get("authorization")
  if (!header) return null
  const [scheme, value] = header.split(" ")
  if (scheme?.toLowerCase() !== "bearer" || !value) return null
  return value.trim() || null
}

/**
 * Resolve a request to its mobile user, or `null` when the token is missing,
 * malformed, revoked, expired, or the account was soft-deleted. Also returns
 * the session id so callers can revoke it.
 */
export async function authenticate(
  req: NextRequest
): Promise<{ user: MobileUser; sessionId: string } | null> {
  const raw = bearerToken(req)
  if (!raw) return null

  const session = await prisma.mobileSession.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  })

  if (!session || session.deletedAt) return null
  if (session.expiresAt.getTime() < Date.now()) return null
  if (session.user.deletedAt) return null

  // Sliding expiry, throttled to at most one write per hour per session.
  if (Date.now() - session.lastUsedAt.getTime() > SLIDING_REFRESH_MS) {
    void prisma.mobileSession
      .update({
        where: { id: session.id },
        data: { lastUsedAt: new Date(), expiresAt: expiryFromNow() },
      })
      .catch(() => {})
  }

  return { user: toMobileUser(session.user), sessionId: session.id }
}

/** Revoke the session behind this request. Idempotent. */
export async function revokeSessionByRequest(req: NextRequest): Promise<void> {
  const raw = bearerToken(req)
  if (!raw) return
  await prisma.mobileSession.updateMany({
    where: { tokenHash: hashToken(raw), deletedAt: null },
    data: { deletedAt: new Date() },
  })
}

// ── Route helpers ────────────────────────────────────────────────────────────

export function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: { code: "UNAUTHORIZED", message } }, { status: 401 })
}

export function forbidden(message = "You don't have access to this."): NextResponse {
  return NextResponse.json({ error: { code: "FORBIDDEN", message } }, { status: 403 })
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ error: { code: "BAD_REQUEST", message } }, { status: 400 })
}

export function serverError(message = "Something went wrong."): NextResponse {
  return NextResponse.json({ error: { code: "SERVER_ERROR", message } }, { status: 500 })
}

/** Throws (caught by the caller as 403) when the role isn't allowed. */
export function assertRole(user: MobileUser, allowed: Role[]): boolean {
  try {
    requireRole(user.role, allowed)
    return true
  } catch {
    return false
  }
}
