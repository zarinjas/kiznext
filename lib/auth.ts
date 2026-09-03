import NextAuth, { CredentialsSignin } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { autoUpgradePendingUser } from "@/lib/registration"
import type { AccountStatus, Role } from "@/lib/rbac"

declare module "next-auth" {
  interface User {
    role: Role
    matricId: string
    accountStatus: AccountStatus
  }
  interface Session {
    user: {
      id: string
      role: Role
      matricId: string
      accountStatus: AccountStatus
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
    accountStatus: AccountStatus
  }
}

/**
 * Thrown from `authorize()` when the email link has not been clicked yet. The
 * custom `code` surfaces as the `signIn` error so the login form can show a
 * "check your inbox / resend" state instead of a generic wrong-password message.
 */
class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED"
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

        // Self-service accounts must click the emailed link before their first
        // sign-in. Admin-created accounts default to `active` and skip this.
        if (user.accountStatus === "unverified") {
          throw new EmailNotVerifiedError()
        }

        // A student whose intake was uploaded after they registered is upgraded
        // here, so the next login always reflects the latest office list.
        const accountStatus =
          user.accountStatus === "active" ? user.accountStatus : await autoUpgradePendingUser(user.id)

        return {
          id: user.id,
          matricId: user.matricId,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus,
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
        token.accountStatus = user.accountStatus as AccountStatus
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.matricId = token.matricId
      session.user.accountStatus = token.accountStatus
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
