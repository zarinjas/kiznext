import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { FacilitiesList } from "./facilities-list"

export default async function TempahanFasilitiPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const facilities = await prisma.facility.findMany({
    where: { deletedAt: null },
    include: {
      block: { select: { name: true } },
      bookings: {
        where: {
          deletedAt: null,
          status: { notIn: ["rejected", "cancelled"] },
        },
        select: { timeSlotStart: true, timeSlotEnd: true },
      },
    },
    orderBy: { name: "asc" },
  })

  const isAhli = session.user.role === "ahli"

  return (
    <div className={isAhli ? "px-4 py-5" : "mx-auto max-w-5xl"}>
      <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
        Facility Booking
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Browse and book available facilities at KIZ.
      </p>

      <div className="mt-5">
        <FacilitiesList
          facilities={facilities}
          role={session.user.role}
          compact={isAhli}
          userId={session.user.id}
        />
      </div>
    </div>
  )
}
