import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@/lib/rbac"
import { prisma } from "@/lib/db"
import { nowMalaysia } from "@/lib/timezone"
import { getResidentHomeData } from "@/lib/dashboard"
import { getDashboardHeroBackground, getDashboardPoster } from "@/lib/settings"
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
  fellow: {
    title: "Fellow Dashboard",
    description: "Book facilities, check announcements, and more.",
  },
  ahli: {
    title: "Student Dashboard",
    description: "Book facilities, check announcements, and more.",
  },
  staf: {
    title: "Staff Dashboard",
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

  // Students (ahli), staff (staf) and fellows all get the resident-style member
  // home. Only students can apply for accommodation, so the room reminder is
  // ahli-only (handled inside `getResidentHomeData`).
  const memberRoles = new Set(["ahli", "staf", "fellow"])
  const isMember = memberRoles.has(userRole)

  if (isMember) {
    const role = userRole as "ahli" | "staf" | "fellow"
    const [user, data, heroBackgroundUrl, posterUrl] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, matricId: true, avatarUrl: true },
      }),
      getResidentHomeData({
        userId: session.user.id,
        matricId: session.user.matricId ?? "",
        role,
      }),
      getDashboardHeroBackground("web"),
      getDashboardPoster(),
    ])

    if (!user) redirect("/login")

    return (
      <AhliHome
        user={user}
        role={role}
        memberTag={userRole === "staf" ? "Staff" : userRole === "fellow" ? "Fellow" : "Resident"}
        greeting={greetingFor(nowMalaysia())}
        data={data}
        heroBackgroundUrl={heroBackgroundUrl}
        posterUrl={posterUrl}
      />
    )
  }

  const info = welcomeMessages[session.user.role]

  const [pendingFacility, pendingGuestHouse, openTickets, activeLostFound] =
    await Promise.all([
      prisma.facilityBooking.count({ where: { status: "pending", deletedAt: null } }),
      prisma.guestHouseBooking.count({ where: { status: "pending", deletedAt: null } }),
      prisma.helpdeskTicket.count({
        where: { status: { in: ["submitted", "under_review", "in_progress", "more_info_required"] }, deletedAt: null },
      }),
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
