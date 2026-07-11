import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { requireRole } from "@/lib/rbac"
import type { Role } from "@/lib/rbac"
import { AnnouncementForm } from "./announcement-form"

export default async function UrusPengumumanPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  requireRole(session.user.role as Role, ["admin_kiz", "superadmin"])

  const announcements = await prisma.announcement.findMany({
    where: { deletedAt: null },
    include: { poster: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Urus Pengumuman
      </h1>
      <p className="mt-1 text-muted-foreground">Tambah dan urus pengumuman KIZ.</p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-heading text-lg text-primary-foreground mb-4">Pengumuman Baru</h2>
        <AnnouncementForm role={session.user.role} />
      </div>

      <div className="mt-8 space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary-foreground mb-1">
                  {a.tag}
                </span>
                <h3 className="font-heading text-lg text-primary-foreground">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {a.poster.name} · {a.createdAt.toLocaleDateString("ms-MY")}
                </p>
              </div>
            </div>
          </div>
        ))}
        {announcements.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Tiada pengumuman.</p>
        )}
      </div>
    </div>
  )
}
