import { API_PREFIX } from "./config"
import { clearToken, getToken } from "./storage"

export class ApiError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.status = status
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE"
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
}

/**
 * Thin fetch wrapper around the web app's `/api/v1` surface. Attaches the
 * bearer token, unwraps `{ data }`, and turns `{ error }` into an `ApiError`.
 * A 401 clears the stored token so the app falls back to the login screen.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = await getToken()

  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.formData) {
    body = options.formData
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
    body = JSON.stringify(options.body)
  }

  const res = await fetch(`${API_PREFIX}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
    signal: options.signal,
  })

  const json = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; message?: string } }
    | null

  if (!res.ok) {
    if (res.status === 401) await clearToken()
    throw new ApiError(
      json?.error?.message ?? "Something went wrong.",
      json?.error?.code ?? "ERROR",
      res.status
    )
  }

  return json?.data as T
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiFetch<T>(path, { method: "GET", signal })
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "POST", body })
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiFetch<T>(path, { method: "PATCH", body })
}

export function apiDelete<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "DELETE" })
}
