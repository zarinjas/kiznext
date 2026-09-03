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
  const authUrl = process.env.AUTH_URL
  if (!authUrl) return undefined

  try {
    const { host } = new URL(authUrl) // includes port if present, e.g. "mykiz.my"

    // If the incoming request already presents the public host on BOTH the
    // Host and x-forwarded-host headers, there's nothing to fix.
    const reqHost = req.headers.get("host")
    const xfHost = req.headers.get("x-forwarded-host")
    if (reqHost === host && (!xfHost || xfHost === host)) return undefined

    // Otherwise force the public host. The old guard bailed out whenever the
    // reverse proxy had *already* set x-forwarded-host — but OpenLiteSpeed sets
    // it to the internal upstream (127.0.0.1:3010), which is exactly the value
    // that makes Next's Server-Action origin check reject `Origin: mykiz.my`
    // with a 500. We overwrite it unconditionally.
    return host
  } catch {
    return undefined
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── Fix reverse-proxy host mismatch for Server-Action CSRF ──────────────
  // Next's Server-Action origin check compares the browser `Origin` against the
  // request host. Behind OpenLiteSpeed the upstream host is 127.0.0.1:3010, so
  // we rewrite both `x-forwarded-host` and `host` to the public host from
  // AUTH_URL so the check sees a match.
  const xfHost = forwardedHost(req)
  let nextOpts: { request: { headers: Headers } } | undefined
  if (xfHost) {
    const headers = new Headers(req.headers)
    headers.set("x-forwarded-host", xfHost)
    headers.set("host", xfHost)
    headers.set("x-forwarded-proto", "https")
    nextOpts = { request: { headers } }
  }

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
