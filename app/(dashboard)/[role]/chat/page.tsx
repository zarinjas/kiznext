import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ChatRoom } from "./chat-room"

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const isAhli = session.user.role === "ahli"

  const messages = await prisma.communityChatMessage.findMany({
    where: { deletedAt: null },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <div className={isAhli ? "flex h-[calc(100vh-8.5rem)] flex-col px-4 py-4" : "mx-auto max-w-3xl"}>
      <div className={isAhli ? "shrink-0" : ""}>
        <h1 className={isAhli ? "font-heading text-xl text-primary-foreground" : "font-heading text-2xl text-primary-foreground"}>
          Chat Komuniti
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ruang perbualan untuk semua penghuni KIZ.
        </p>
      </div>

      <div className={isAhli ? "mt-3 flex-1 overflow-hidden" : "mt-6"}>
        <ChatRoom
          initialMessages={messages as unknown as Array<{ id: string; message: string; createdAt: Date; user: { id: string; name: string; role: string } }>}
          role={session.user.role}
          userId={session.user.id}
          compact={isAhli}
        />
      </div>
    </div>
  )
}
