import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Role } from "@/lib/rbac"

const welcomeMessages: Record<Role, { title: string; description: string }> = {
  superadmin: {
    title: "Dashboard Super Admin",
    description: "Urus sistem, pengguna, dan pantau semua aktiviti.",
  },
  admin_kiz: {
    title: "Dashboard Admin KIZ",
    description: "Urus tempahan, pengumuman, dan sokongan pelajar.",
  },
  pengetua: {
    title: "Dashboard Pengetua",
    description: "Laporan dan statistik pengurusan kolej.",
  },
  ahli: {
    title: "Dashboard Pelajar",
    description: "Tempah fasiliti, semak pengumuman, dan banyak lagi.",
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

  const info = welcomeMessages[session.user.role]

  return (
    <div>
      <h1 className="font-heading text-2xl text-primary-foreground">
        {info.title}
      </h1>
      <p className="mt-1 text-muted-foreground">{info.description}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Selamat datang,</p>
          <p className="font-heading text-xl text-primary-foreground">
            {session.user.name}
          </p>
        </div>
      </div>
    </div>
  )
}
