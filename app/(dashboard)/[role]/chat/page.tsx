import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ChatRoom } from "./chat-room"

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const messages = await prisma.communityChatMessage.findMany({
    where: { deletedAt: null },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-heading text-2xl text-primary-foreground">
        Chat Komuniti
      </h1>
      <p className="mt-1 text-muted-foreground">
        Ruang perbualan untuk semua penghuni KIZ.
      </p>

      <div className="mt-6">
        <ChatRoom
          initialMessages={messages as unknown as Array<{ id: string; message: string; createdAt: Date; user: { name: string; role: string } }>}
          role={session.user.role}
          userId={session.user.id}
        />
      </div>
    </div>
  )
}
