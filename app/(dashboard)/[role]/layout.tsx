import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

/**
 * Enforces that the `[role]` URL segment matches the session role for every
 * nested page, not just the dashboard home. A student visiting /superadmin/...
 * is bounced back to their own role segment.
 */
export default async function RoleSegmentLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ role: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { role } = await params
  if (role !== session.user.role) {
    redirect(`/${session.user.role}`)
  }

  return children
}
