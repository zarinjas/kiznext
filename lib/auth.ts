import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import type { Role } from "@/lib/rbac"

declare module "next-auth" {
  interface User {
    role: Role
    matricId: string
  }
  interface Session {
    user: {
      id: string
      role: Role
      matricId: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string
    role: Role
    matricId: string
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        matricId: { label: "No. Matrik", type: "text" },
        password: { label: "Kata Laluan", type: "password" },
      },
      async authorize(credentials) {
        const matricId = credentials?.matricId as string | undefined
        const password = credentials?.password as string | undefined

        if (!matricId || !password) return null

        const user = await prisma.user.findUnique({
          where: { matricId },
        })

        if (!user || user.deletedAt) return null

        const isValid = await bcrypt.compare(password, user.passwordHash)
        if (!isValid) return null

        return {
          id: user.id,
          matricId: user.matricId,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = user.role as Role
        token.matricId = user.matricId as string
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.matricId = token.matricId
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
