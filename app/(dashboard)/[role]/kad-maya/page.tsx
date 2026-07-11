import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { KadMayaCard } from "@/components/shared/kad-maya-card"

export default async function KadMayaPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      matricId: true,
      block: true,
      roomNumber: true,
    },
  })

  if (!user) redirect("/login")

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Kad Maya
      </h1>
      <p className="mt-1 text-muted-foreground">
        Kad Pengenalan Digital KIZ anda.
      </p>

      <div className="mt-8">
        <KadMayaCard
          name={user.name}
          matricId={user.matricId}
          block={user.block}
          roomNumber={user.roomNumber}
        />
      </div>
    </div>
  )
}
