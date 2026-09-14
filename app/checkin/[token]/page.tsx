import { auth } from "@/lib/auth"
import { getCheckInSession, getCheckinDirectionsImage } from "@/lib/checkin"
import { getAppLogoUrl } from "@/lib/settings"
import { CheckinFlow } from "./checkin-flow"
import { SessionErrorCard } from "./session-error-card"

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [session, logoUrl, directionsImageUrl, authSession] = await Promise.all([
    getCheckInSession(token),
    getAppLogoUrl(),
    getCheckinDirectionsImage(),
    auth(),
  ])

  if (!session.ok || !session.type) {
    return <SessionErrorCard logoUrl={logoUrl} message={session.error ?? "This QR code isn't valid."} />
  }

  // The logged-in matric (if any) just prefills the field and satisfies the
  // "account holders must sign in" check — students always confirm their matric.
  const loggedInMatric = authSession?.user?.matricId ?? null

  return (
    <CheckinFlow
      token={token}
      type={session.type}
      sessionName={session.name ?? ""}
      logoUrl={logoUrl}
      directionsImageUrl={directionsImageUrl}
      loggedInMatric={loggedInMatric}
    />
  )
}
