import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getChatSnapshot } from "./chat-data"
import { ChatRoom } from "./chat-room"

export default async function ChatPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const snapshot = await getChatSnapshot(session.user.id, session.user.role as string)

  return (
    <ChatRoom
      role={session.user.role}
      userId={session.user.id}
      initialSnapshot={snapshot}
    />
  )
}
