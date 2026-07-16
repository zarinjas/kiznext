import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@/lib/rbac"
import { prisma } from "@/lib/db"
import { AhliHome } from "./ahli-home"
import { AdminHome } from "./admin-home"

const welcomeMessages: Record<Role, { title: string; description: string }> = {
  superadmin: {
    title: "Super Admin Dashboard",
    description: "Manage system, users, and monitor all activity.",
  },
  admin_kiz: {
    title: "KIZ Admin Dashboard",
    description: "Manage bookings, announcements, and student support.",
  },
  pengetua: {
    title: "Principal Dashboard",
    description: "College management reports and statistics.",
  },
  ahli: {
    title: "Student Dashboard",
    description: "Book facilities, check announcements, and more.",
  },
}

export default async function RoleDashboardPage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const session = await auth()
  const { role } = await params

  if (!session?.user) redirect("/login")

  const userRole = session.user.role as string
  if (role !== userRole) redirect(`/${userRole}`)

  if (userRole === "ahli") {
    const [user, announcements, bookings] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, matricId: true, block: true, roomNumber: true },
      }),
      prisma.announcement.findMany({
        where: { deletedAt: null },
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        take: 5,
        select: {
          id: true,
          title: true,
          tag: true,
          isPinned: true,
          attachmentType: true,
          createdAt: true,
        },
      }),
      prisma.facilityBooking.findMany({
        where: { userId: session.user.id, deletedAt: null },
        include: { facility: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ])

    if (!user) redirect("/login")

    return (
      <AhliHome
        user={user}
        announcements={announcements}
        bookings={bookings}
        role={session.user.role}
      />
    )
  }

  const info = welcomeMessages[session.user.role]

  const [pendingFacility, pendingGuestHouse, openTickets, activeParcels, activeLostFound] =
    await Promise.all([
      prisma.facilityBooking.count({ where: { status: "pending", deletedAt: null } }),
      prisma.guestHouseBooking.count({ where: { status: "pending", deletedAt: null } }),
      prisma.helpdeskTicket.count({ where: { status: { not: "closed" }, deletedAt: null } }),
      prisma.parcel.count({ where: { status: "arrived", deletedAt: null } }),
      prisma.lostFoundItem.count({ where: { status: { not: "claimed" }, deletedAt: null } }),
    ])

  return (
    <AdminHome
      title={info.title}
      description={info.description}
      userName={session.user.name ?? ""}
      role={session.user.role}
      stats={{
        pendingFacility,
        pendingGuestHouse,
        openTickets,
        activeParcels,
        activeLostFound,
      }}
    />
  )
}
