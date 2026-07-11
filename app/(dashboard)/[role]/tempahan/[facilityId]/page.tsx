import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { BookingForm } from "./booking-form"

export default async function BookFacilityPage({
  params,
}: {
  params: Promise<{ role: string; facilityId: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const { facilityId } = await params

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    include: { block: true },
  })
  if (!facility || facility.deletedAt) notFound()

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Tempah: {facility.name}
      </h1>
      <p className="mt-1 text-muted-foreground">
        {facility.block.name} — {facility.description}
      </p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <BookingForm
          facilityId={facility.id}
          requiresApproval={facility.requiresApproval}
          role={session.user.role}
        />
      </div>
    </div>
  )
}
