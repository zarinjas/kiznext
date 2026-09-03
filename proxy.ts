import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/daftar", "/sahkan"]

/** Take the first comma-separated value and strip any scheme. */
function cleanSingle(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const first = value.split(",")[0].trim()
  return first || undefined
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── TEMP DIAG: log every POST (server action) forwarded headers ─────────
  if (req.method === "POST") {
    console.error("[HEADER-DIAG]", JSON.stringify({
      origin: req.headers.get("origin"),
      xForwardedHost: req.headers.get("x-forwarded-host"),
      xForwardedProto: req.headers.get("x-forwarded-proto"),
      host: req.headers.get("host"),
      path: pathname,
    }))
  }

  // ── Normalize forwarded headers ─────────────────────────────────────────
  // OpenLiteSpeed AND any outer proxy can each append to the same header,
  // producing comma-joined values like "mykiz.my, https://mykiz.my". When that
  // string reaches `new URL()` in Auth.js / Next's action origin check it
  // throws ERR_INVALID_URL → every Server Action 500s. Clean each to its first
  // value before the request continues downstream.
  const headers = new Headers(req.headers)
  const origin = cleanSingle(req.headers.get("origin"))
  const host = cleanSingle(req.headers.get("host"))
  const xfHost = cleanSingle(req.headers.get("x-forwarded-host"))
  const xfProto = cleanSingle(req.headers.get("x-forwarded-proto"))
  if (origin) headers.set("origin", origin)
  if (host) headers.set("host", host)
  if (xfHost) headers.set("x-forwarded-host", xfHost)
  if (xfProto) headers.set("x-forwarded-proto", xfProto)

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: req.nextUrl.protocol === "https:"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  })

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (!token && !isPublic) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|uploads).*)"],
}
