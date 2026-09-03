import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getApplicationState } from "@/lib/bilik"
import { RoomApplicationFlow } from "@/components/shared/bilik/room-application-flow"
import { checkRoommate, submitRoomApplication, respondToRoommateRequest, withdrawRoomApplication } from "./actions"

export default async function BilikPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ahli") redirect(`/${session.user.role}`)
  return <RoomApplicationFlow initial={await getApplicationState(session.user.id, session.user.matricId)} checkRoommate={checkRoommate} submit={submitRoomApplication} respond={respondToRoommateRequest} withdraw={withdrawRoomApplication} />
}
