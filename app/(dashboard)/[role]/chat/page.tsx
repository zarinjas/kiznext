import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ChatRoom } from "./chat-room"

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const messages = await prisma.communityChatMessage.findMany({
    where: { deletedAt: null },
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" },
  })

  return (
    <ChatRoom
      initialMessages={
        messages as unknown as Array<{
          id: string
          message: string
          createdAt: Date
          user: { id: string; name: string; role: string }
        }>
      }
      role={session.user.role}
      userId={session.user.id}
    />
  )
}
