import { getAppLogoUrl } from "@/lib/settings"
import { getInvitationPreview, type InvitationPreview } from "@/lib/invitations"
import { RegisterForm } from "./register-form"

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ matric?: string; name?: string; invite?: string }>
}) {
  const { matric, name, invite } = await searchParams
  const logoUrl = await getAppLogoUrl()

  let invitation: InvitationPreview | undefined
  let invitationToken: string | undefined
  let invitationError: string | undefined

  if (invite) {
    invitationToken = invite
    const preview = await getInvitationPreview(invite)
    if (preview.ok) {
      invitation = {
        email: preview.email,
        name: preview.name,
        matricId: preview.matricId,
        role: preview.role,
        resident: preview.resident,
      }
    } else {
      invitationError = preview.error
    }
  }

  return (
    <RegisterForm
      logoUrl={logoUrl}
      defaultMatric={matric?.trim().toUpperCase() || undefined}
      defaultName={name?.trim() || undefined}
      invitation={invitation}
      invitationToken={invitationToken}
      invitationError={invitationError}
    />
  )
}
