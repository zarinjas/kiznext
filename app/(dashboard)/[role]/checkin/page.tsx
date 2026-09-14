import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getStudentCheckInOverview, getCheckinDirectionsImage } from "@/lib/checkin"
import { StudentCheckInFlow } from "./student-checkin-flow"

export default async function CheckinPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (session.user.role !== "ahli") redirect(`/${session.user.role}`)

  const [overview, directionsImageUrl] = await Promise.all([
    getStudentCheckInOverview(),
    getCheckinDirectionsImage(),
  ])

  return <StudentCheckInFlow overview={overview} directionsImageUrl={directionsImageUrl} />
}
