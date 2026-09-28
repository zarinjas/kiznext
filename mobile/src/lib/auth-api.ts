import { apiGet, apiPost } from "./api"

/** Auth flows that don't need a session (register / verify / reset). */

export function registerAccount(input: {
  matricId: string
  name: string
  email: string
  password: string
  inviteToken?: string
}) {
  return apiPost<{ role: string; message: string; resent: boolean }>("/auth/register", input)
}

export function resendVerification(matricId: string, password: string) {
  return apiPost<{ ok: boolean; message: string }>("/auth/resend-verification", { matricId, password })
}

export function requestPasswordReset(matricId: string) {
  return apiPost<{ message: string }>("/auth/forgot-password", { matricId })
}

export function getResetInfo(token: string) {
  return apiGet<{ name: string; matricId: string }>(
    `/auth/reset-password?token=${encodeURIComponent(token)}`
  )
}

export function resetPassword(token: string, password: string) {
  return apiPost<{ ok: boolean }>("/auth/reset-password", { token, password })
}
