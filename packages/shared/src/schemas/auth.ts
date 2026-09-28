import { z } from "zod"

export const loginSchema = z.object({
  matricId: z.string().trim().min(1, "Enter your matric number."),
  password: z.string().min(1, "Enter your password."),
})

export type LoginInput = z.infer<typeof loginSchema>

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export const deviceTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["ios", "android", "web"]),
  deviceName: z.string().max(200).optional(),
})

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty.").max(120),
  email: z.string().trim().email("That email doesn't look right.").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
