"use server"

import { requestPasswordReset, resetPasswordWithToken } from "@/lib/registration"

export async function requestReset(matricId: string) {
  return requestPasswordReset(matricId)
}

export async function submitNewPassword(token: string, password: string) {
  return resetPasswordWithToken(token, password)
}
