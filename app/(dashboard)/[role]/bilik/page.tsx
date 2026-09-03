import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { buildPickerState } from "@/lib/bilik"
import { RoomPicker } from "@/components/shared/bilik/room-picker"
import { refreshPickerState, selectBed, releaseBed } from "./actions"

export default async function BilikPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  // Room selection is a student feature — admins manage it from `urus-bilik`.
  if (session.user.role !== "ahli") redirect(`/${session.user.role}`)

  const initial = await buildPickerState(session.user.id, session.user.matricId)

  return (
    <RoomPicker
      initial={initial}
      selectBed={selectBed}
      releaseBed={releaseBed}
      refresh={refreshPickerState}
    />
  )
}
