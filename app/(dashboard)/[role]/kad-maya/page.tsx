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
    <div className="flex flex-col items-center px-4 py-5">
      <h1 className="self-start font-heading text-xl text-primary-foreground">
        Kad Maya
      </h1>
      <p className="mt-1 self-start text-sm text-muted-foreground">
        Kad Pengenalan Digital KIZ anda.
      </p>

      <div className="mt-6">
        <KadMayaCard
          name={user.name}
          matricId={user.matricId}
          block={user.block}
          roomNumber={user.roomNumber}
        />
      </div>

      <p className="mt-5 max-w-xs text-center text-xs text-muted-foreground">
        Tunjukkan QR code ini kepada pegawai keselamatan atau kakitangan KIZ untuk pengesahan identiti.
      </p>
    </div>
  )
}
