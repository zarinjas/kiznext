import { StudentCardFace } from "@/components/shared/student-card-face"

interface Props {
  name: string
  matricId: string
  /** Dormitory block name, e.g. "K18A". */
  block?: string | null
  /** Room number within the block, e.g. "101". */
  roomNumber?: string | null
  /** Bed letter "A"/"B", null for single rooms. */
  bed?: string | null
  /** Academic session, e.g. "Session 2026/2027". */
  session?: string | null
  /** Card "Valid until" line, e.g. "30 September 2027". */
  validUntil?: string | null
  avatarUrl: string | null
  /** The user's role. Only "ahli" (student) gets the student wording. */
  role?: string
  /** Non-student role label (e.g. "Admin KIZ", "Staff") shown on the card. */
  roleLabel?: string | null
  cardBackgroundUrl?: string | null
  ukmLogoUrl?: string | null
  kizLogoUrl?: string | null
  /** QR data URL rendered inside the card (bottom). */
  qrDataUrl?: string | null
}

/**
 * KadMayaCard — every role now uses the same institutional card layout. Students
 * keep the official "Digital Student Card" wording; other roles show their role
 * label in the status badge and a "Staff ID" label.
 */
export async function KadMayaCard({
  name,
  matricId,
  block,
  roomNumber,
  bed,
  session,
  validUntil,
  avatarUrl,
  role,
  roleLabel,
  cardBackgroundUrl,
  ukmLogoUrl,
  kizLogoUrl,
  qrDataUrl,
}: Props) {
  const isStudent = role === "ahli"

  return (
    <StudentCardFace
      name={name}
      matricId={matricId}
      blockName={isStudent ? block : null}
      roomNumber={isStudent ? roomNumber : null}
      bed={isStudent ? bed : null}
      session={isStudent ? session : null}
      avatarUrl={avatarUrl}
      backgroundUrl={cardBackgroundUrl ?? null}
      ukmLogoUrl={ukmLogoUrl ?? null}
      kizLogoUrl={kizLogoUrl ?? null}
      qrDataUrl={qrDataUrl ?? null}
      validUntil={isStudent ? validUntil ?? null : null}
      roleLabel={isStudent ? null : roleLabel ?? null}
      idLabel={isStudent ? "Student ID" : "Staff ID"}
    />
  )
}
