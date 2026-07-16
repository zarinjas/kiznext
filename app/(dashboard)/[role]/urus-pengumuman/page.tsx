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
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">Manage Announcements</h1>
      <p className="mt-1 text-muted-foreground">Add, edit, and manage KIZ announcements.</p>

      <div className="mt-8 rounded-lg border bg-card p-6">
        <h2 className="font-heading text-lg text-primary-foreground mb-4">New Announcement</h2>
        <AnnouncementForm role={session.user.role} />
      </div>

      <div className="mt-8 space-y-2">
        {announcements.map((a) => (
          <details key={a.id} className="rounded-lg border bg-card">
            <summary className="flex cursor-pointer items-center gap-3 p-4 hover:bg-muted/50">
              {a.isPinned && <span className="shrink-0 text-sm">📌</span>}
              <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                a.tag === "penting" ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary-foreground"
              }`}>
                {a.tag}
              </span>
              <span className="flex-1 font-medium text-foreground truncate">{a.title}</span>
              {a.attachmentUrl && <span className="shrink-0 text-xs text-muted-foreground">{a.attachmentType === "pdf" ? "📎" : "🖼️"}</span>}
              <span className="shrink-0 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString("ms-MY")}
              </span>
            </summary>
            <div className="border-t border-border p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>
              {a.attachmentUrl && (
                <a href={a.attachmentUrl} target="_blank" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-2 text-xs font-medium hover:bg-primary/10">
                  {a.attachmentType === "pdf" ? "📎 Open PDF" : "🖼️ Open Image"}
                </a>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{a.poster.name} {a.scheduledAt && `· Scheduled: ${new Date(a.scheduledAt).toLocaleDateString("ms-MY")}`}</span>
                <AnnouncementForm role={session.user.role} edit={{
                  id: a.id,
                  title: a.title,
                  content: a.content,
                  tag: a.tag,
                  attachmentUrl: a.attachmentUrl,
                  attachmentType: a.attachmentType,
                  isPinned: a.isPinned,
                  scheduledAt: a.scheduledAt?.toISOString() || null,
                  expiresAt: a.expiresAt?.toISOString() || null,
                }} />
              </div>
            </div>
          </details>
        ))}
        {announcements.length === 0 && (
          <p className="text-center text-muted-foreground py-8">No announcements.</p>
        )}
      </div>
    </div>
  )
}
