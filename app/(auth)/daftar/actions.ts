"use server"

import {
  registerAccount,
  resendVerificationEmail,
  type RegisterInput,
} from "@/lib/registration"

export async function register(input: RegisterInput) {
  return registerAccount(input)
}

export async function resendVerification(matricId: string, password: string) {
  return resendVerificationEmail(matricId, password)
}
