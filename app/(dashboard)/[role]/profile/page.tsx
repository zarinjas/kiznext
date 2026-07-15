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

  const isAhli = session.user.role === "ahli"

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-2xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>Profil</h1>
      <p className="mt-1 text-sm text-muted-foreground">Kemaskini maklumat peribadi anda.</p>

      <div className={isAhli ? "mt-5 rounded-2xl border border-border bg-card p-5" : "mt-8 rounded-lg border bg-card p-6"}>
        <ProfileForm user={user} />
      </div>
    </div>
  )
}
