"use client"

import { useState, useTransition } from "react"
import Box from "@mui/material/Box"
import Typography from "@mui/material/Typography"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import Dialog from "@mui/material/Dialog"
import DialogTitle from "@mui/material/DialogTitle"
import DialogContent from "@mui/material/DialogContent"
import DialogActions from "@mui/material/DialogActions"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KButton } from "@/components/kiz/primitives/k-button"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { WindowStatusBanner } from "./window-status-banner"
import type { RoomApplicationState } from "@/lib/bilik"
import { canSelect } from "@/lib/room-selection"

type Type = "single" | "double" | "flexible"
type Result = { ok: boolean; error?: string }

const copy: Record<Type, { title: string; body: string; icon: string }> = {
  single: { title: "Single Room", body: "I prefer a room to myself.", icon: "bed" },
  double: { title: "Twin-Sharing Room", body: "I prefer to share a room with another student.", icon: "group" },
  flexible: { title: "No Preference", body: "I\u2019m happy for KIZ to assign my room type and roommate.", icon: "shuffle" },
}

export function RoomApplicationFlow({ initial, checkRoommate, submit, respond, withdraw }: {
  initial: RoomApplicationState
  checkRoommate: (matricId: string) => Promise<{ ok: boolean; race?: string | null; religion?: string | null; error?: string }>
  submit: (input: { type: Type; roommateMatricId?: string }) => Promise<Result>
  respond: (response: "approved" | "rejected") => Promise<Result>
  withdraw: () => Promise<Result>
}) {
  const [type, setType] = useState<Type>("single")
  const [matricId, setMatricId] = useState("")
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null)
  const [roommate, setRoommate] = useState<{ race: string | null; religion: string | null } | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const pageSubtitle = "Tell us your preferred room type. We\u2019ll do our best to accommodate your choice, subject to approval and availability."
  if (!initial.eligible) return <Box sx={{ maxWidth: 820, mx: "auto" }}><PageHeader overline="Residence" title="Choose Your Room Preference" subtitle={pageSubtitle} /><ApplicationResultBanner eligible={false} /></Box>
  const actionable = canSelect(initial.windowState)
  const app = initial.application
  const submitChoice = () => start(async () => {
    const result = await submit({ type, roommateMatricId: type === "double" ? matricId : undefined })
    setNotice(result.ok ? { message: type === "double" ? "Request sent. Your roommate must approve it before the deadline." : "Your accommodation request has been submitted." } : { message: result.error ?? "Could not submit your request.", error: true })
  })

  return <Box sx={{ maxWidth: 820, mx: "auto" }}>
    <PageHeader overline="Residence" title="Choose Your Room Preference" subtitle={pageSubtitle} />
    <ApplicationResultBanner eligible />
    <WindowStatusBanner state={initial.windowState} windowName={initial.window?.name ?? null} opensAt={initial.window?.opensAt ?? null} closesAt={initial.window?.closesAt ?? null} />
    {notice && <Alert severity={notice.error ? "error" : "success"} sx={{ mb: 2, borderRadius: 2 }}>{notice.message}</Alert>}
    {initial.allocation && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>Your room allocation: <b>{initial.allocation}</b></Alert>}
    {initial.incomingRequest && actionable && (
      <FormSection title="Roommate request awaiting you" subtitle="The requester is only identified by compatibility details. Your decision is final once confirmed." icon="mark_email_unread">
        <Typography variant="body2" sx={{ mb: 2 }}>Bangsa: <b>{initial.incomingRequest.applicantRace ?? "Not provided"}</b> · Agama: <b>{initial.incomingRequest.applicantReligion ?? "Not provided"}</b></Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}><KButton color="error" variant="outlined" disabled={pending} onClick={() => start(async () => { const r = await respond("rejected"); setNotice(r.ok ? { message: "Roommate request declined." } : { message: r.error ?? "Could not decline request.", error: true }) })}>Reject</KButton><KButton loading={pending} onClick={() => setConfirm(true)}>Approve request</KButton></Box>
      </FormSection>
    )}
    {app ? <ApplicationSummary app={app} actionable={actionable} pending={pending} onWithdraw={() => start(async () => { const r = await withdraw(); setNotice(r.ok ? { message: "Application withdrawn. You may submit a new preference while the window is open." } : { message: r.error ?? "Could not withdraw application.", error: true }) })} /> : actionable ? <FormSection title="Select a Room Type" icon="assignment">
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 1.25, mb: 2.5 }}>
        {(Object.keys(copy) as Type[]).map((key) => {
          const fee = key === "single" ? initial.fees.single : key === "double" ? initial.fees.double : null
          return (
            <Box key={key} component="button" onClick={() => setType(key)} sx={{ textAlign: "left", cursor: "pointer", p: 2, borderRadius: 2, border: "1px solid", borderColor: type === key ? "primary.main" : "divider", backgroundColor: type === key ? "action.selected" : "background.paper" }}>
              <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{copy[key].title}</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>{copy[key].body}</Typography>
              {fee != null && (
                <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
                  <Typography sx={{ fontWeight: 750, lineHeight: 1.2 }}>RM {fee.toFixed(2)}<Typography component="span" variant="caption" sx={{ color: "text.secondary", fontWeight: 500 }}> / month</Typography></Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>Plus a one-month deposit</Typography>
                </Box>
              )}
            </Box>
          )
        })}
      </Box>
      {type === "double" && <Box sx={{ maxWidth: 460 }}><Alert severity="info" sx={{ mb: 1.5, borderRadius: 2 }}>Enter your preferred roommate&apos;s matric ID. They must be of the same gender and have received an accommodation offer. Limited profile information will be displayed to help you confirm your selection.</Alert><TextField fullWidth label="Roommate matric ID" value={matricId} onChange={(e) => { setMatricId(e.target.value.toUpperCase()); setRoommate(null) }} onBlur={() => start(async () => { if (!matricId.trim()) return; const r = await checkRoommate(matricId); if (r.ok) setRoommate({ race: r.race ?? null, religion: r.religion ?? null }); else setNotice({ message: r.error ?? "We could not verify that roommate.", error: true }) })} placeholder="e.g. A123456" />{roommate && <Alert severity="success" sx={{ mt: 1.25, borderRadius: 2 }}>Bangsa: <b>{roommate.race ?? "Not provided"}</b> · Agama: <b>{roommate.religion ?? "Not provided"}</b></Alert>}</Box>}
      <KButton loading={pending} disabled={type === "double" && !matricId.trim()} sx={{ mt: 2.5 }} onClick={submitChoice}>{type === "double" ? "Send roommate request" : "Submit preference"}</KButton>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 1.5 }}>Room preferences are subject to approval and availability. Final placement will be confirmed by the KIZ office.</Typography>
    </FormSection> : <KEmpty icon="schedule" title="Application is not available" body="Please wait for the application window to open, or contact the KIZ office after it closes." />}
    <Dialog open={confirm} onClose={() => setConfirm(false)}><DialogTitle>Confirm roommate request?</DialogTitle><DialogContent><Typography variant="body2">Are you sure? Approving this request is final. You and this student will be recorded as a double-room pair for the KIZ office to allocate.</Typography></DialogContent><DialogActions><KButton variant="text" onClick={() => setConfirm(false)}>Cancel</KButton><KButton loading={pending} onClick={() => start(async () => { const r = await respond("approved"); setConfirm(false); setNotice(r.ok ? { message: "Roommate request confirmed. The KIZ office will allocate your room later." } : { message: r.error ?? "Could not confirm request.", error: true }) })}>Approve & confirm</KButton></DialogActions></Dialog>
  </Box>
}

function ApplicationSummary({ app, actionable, pending, onWithdraw }: { app: NonNullable<RoomApplicationState["application"]>; actionable: boolean; pending: boolean; onWithdraw: () => void }) {
  const label = app.status === "single_pending" ? "Single room request under review" : app.status === "roommate_pending" ? "Waiting for roommate approval" : app.status === "roommate_confirmed" ? "Double room pair confirmed" : app.status === "roommate_rejected" ? "Roommate request was declined" : "Flexible placement requested"
  return <FormSection title={label} subtitle="Your final block and room will be shared after the KIZ office completes allocation." icon="task_alt" action={actionable && app.status !== "roommate_confirmed" ? <KButton variant="text" color="error" loading={pending} onClick={onWithdraw}>Withdraw</KButton> : undefined}>
    {app.roommate && <Typography variant="body2">Roommate compatibility: Bangsa <b>{app.roommate.race ?? "Not provided"}</b> · Agama <b>{app.roommate.religion ?? "Not provided"}</b></Typography>}
    {app.status === "roommate_rejected" && actionable && <Typography variant="body2" sx={{ color: "text.secondary" }}>You can withdraw this request and submit a new preference.</Typography>}
    {app.status === "roommate_confirmed" && <Alert severity="success" sx={{ mt: 1.5, borderRadius: 2 }}>This decision is final. Both students will be allocated together in a double room where possible.</Alert>}
  </FormSection>
}

/** Application-result banner shown at the top of the page. */
function ApplicationResultBanner({ eligible }: { eligible: boolean }) {
  if (eligible) {
    return (
      <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
        <Typography sx={{ fontWeight: 650 }}>Yay, you&apos;ve got a place at KIZ!</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>Your accommodation application was successful.</Typography>
      </Alert>
    )
  }
  return (
    <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
      <Typography sx={{ fontWeight: 650 }}>We&apos;re sorry, we couldn&apos;t offer you a room this time.</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>Your application was not successful this time. Please contact the KIZ Office for further assistance.</Typography>
    </Alert>
  )
}
