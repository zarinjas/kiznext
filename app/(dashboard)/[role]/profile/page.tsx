import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      matricId: true,
      block: true,
      roomNumber: true,
      phone: true,
      role: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl text-primary-foreground">Profil</h1>
      <p className="mt-1 text-muted-foreground">Kemaskini maklumat peribadi anda.</p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <ProfileForm user={user} />
      </div>
    </div>
  )
}
