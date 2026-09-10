import { getCheckInSession } from "@/lib/checkin"
import { getAppLogoUrl } from "@/lib/settings"
import { CheckinFlow } from "./checkin-flow"
import { SessionErrorCard } from "./session-error-card"

export default async function CheckinPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [session, logoUrl] = await Promise.all([getCheckInSession(token), getAppLogoUrl()])

  if (!session.ok || !session.type) {
    return <SessionErrorCard logoUrl={logoUrl} message={session.error ?? "This QR code isn't valid."} />
  }

  return (
    <CheckinFlow token={token} type={session.type} sessionName={session.name ?? ""} logoUrl={logoUrl} />
  )
}
