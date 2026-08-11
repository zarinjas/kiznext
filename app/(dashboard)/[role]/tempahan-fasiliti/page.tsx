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

  return (
    <FacilitiesList
      facilities={facilities}
      role={session.user.role}
      userId={session.user.id}
    />
  )
}
