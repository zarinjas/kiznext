import { getToken } from "next-auth/jwt"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_PATHS = ["/login", "/daftar", "/sahkan"]

/**
 * When running behind a reverse proxy (OpenLiteSpeed → 127.0.0.1:3010) the
 * backend never receives the original Host, so Next.js's Server-Action CSRF
 * check compares browser `Origin: mykiz.my` against `Host: 127.0.0.1:3010`
 * and aborts every action.  Injecting `x-forwarded-host` from AUTH_URL lets
 * the check pass.  In dev (no AUTH_URL or already matching) this is a no-op.
 */
function forwardedHost(req: NextRequest): string | undefined {
  // Already set by the proxy (e.g. a future proxy config fix) — leave it.
  if (req.headers.get("x-forwarded-host")) return undefined

  const authUrl = process.env.AUTH_URL
  if (!authUrl) return undefined

  try {
    const { hostname } = new URL(authUrl)
    // If the request host already matches, nothing to fix.
    const reqHost = req.headers.get("host")
    if (reqHost === hostname) return undefined
    return hostname
  } catch {
    return undefined
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Fix reverse-proxy host mismatch for Server-Action CSRF ──────────────
  const xfHost = forwardedHost(req)
  const nextOpts = xfHost
    ? { request: { headers: new Headers({ ...Object.fromEntries(req.headers), "x-forwarded-host": xfHost }) } }
    : undefined

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

  return NextResponse.next(nextOpts)
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|uploads).*)"],
}
