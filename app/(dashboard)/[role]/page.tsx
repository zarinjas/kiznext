import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@/lib/rbac"
import { prisma } from "@/lib/db"
import { getBilikReminder } from "@/lib/bilik"
import { nowMalaysia } from "@/lib/timezone"
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

/** Time-of-day greeting, computed server-side so it can never mismatch on hydration. */
function greetingFor(now: Date): string {
  const h = now.getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
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
    const [user, announcements, bookings, roomReminder] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, matricId: true, block: true, roomNumber: true, avatarUrl: true },
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
      getBilikReminder(session.user.id, session.user.matricId),
    ])

    if (!user) redirect("/login")

    return (
      <AhliHome
        user={user}
        announcements={announcements}
        bookings={bookings}
        role={session.user.role}
        roomReminder={roomReminder}
        greeting={greetingFor(nowMalaysia())}
      />
    )
  }

  const info = welcomeMessages[session.user.role]

  const [pendingFacility, pendingGuestHouse, openTickets, activeLostFound] =
    await Promise.all([
      prisma.facilityBooking.count({ where: { status: "pending", deletedAt: null } }),
      prisma.guestHouseBooking.count({ where: { status: "pending", deletedAt: null } }),
      prisma.helpdeskTicket.count({ where: { status: { not: "closed" }, deletedAt: null } }),
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
        activeLostFound,
      }}
    />
  )
}
