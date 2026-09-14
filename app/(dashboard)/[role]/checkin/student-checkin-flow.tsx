"use client"

import { useState } from "react"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import { PageHeader } from "@/components/kiz/patterns/page-header"
import { KEmpty } from "@/components/kiz/primitives/empty-state"
import { KIcon } from "@/components/kiz/primitives/icon"
import { SignaturePad } from "@/components/shared/signature-pad"
import { submitOwnCheckIn, type StudentCheckInOverview, type SubmitResult } from "@/lib/checkin"
import { formatMalaysia } from "@/lib/timezone"
import { color, radius } from "@/lib/theme"

const ACTION_LABEL: Record<"check_in" | "check_out", string> = {
  check_in: "Check-in",
  check_out: "Check-out",
}

const VERB_PAST: Record<"check_in" | "check_out", string> = {
  check_in: "checked in",
  check_out: "checked out",
}

const ZH_COUNTER: Record<"check_in" | "check_out", string> = {
  check_in: "请前往 2 号柜台（UKM Real Estate）领取房间钥匙。",
  check_out: "请前往 2 号柜台（UKM Real Estate）交还房间钥匙。",
}

function SessionPill({ type, name }: { type: "check_in" | "check_out"; name: string }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: "999px",
        backgroundColor: color.brand[50],
        color: color.brand[700],
        fontSize: 12.5,
        fontWeight: 700,
      }}
    >
      <KIcon icon={type === "check_in" ? "login" : "logout"} size={15} />
      {name}
    </Box>
  )
}

function CounterPanel({ type, directionsImageUrl }: { type: "check_in" | "check_out"; directionsImageUrl: string | null }) {
  return (
    <Box
      sx={{
        mt: 2,
        p: 2.5,
        borderRadius: `${radius.cardLg}px`,
        border: "1px solid",
        borderColor: "divider",
        textAlign: "left",
      }}
    >
      <Box sx={{ display: "flex", gap: 1.25, alignItems: "flex-start" }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: color.warning.soft,
            color: color.warning.ink,
            flexShrink: 0,
          }}
        >
          <KIcon icon="key" size={22} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 15 }}>
            Next: go to Counter 2 (UKM Real Estate)
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.25 }}>
            {type === "check_in"
              ? "Collect your room key at the UKM Real Estate counter."
              : "Return your room key at the UKM Real Estate counter."}
          </Typography>
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 0.5 }}>
            {ZH_COUNTER[type]}
          </Typography>
        </Box>
      </Box>

      {directionsImageUrl && (
        <Box
          component="img"
          src={directionsImageUrl}
          alt="Directions to Counter 2 — UKM Real Estate"
          sx={{
            display: "block",
            width: "100%",
            mt: 1.75,
            borderRadius: `${radius.card}px`,
            border: "1px solid",
            borderColor: "divider",
          }}
        />
      )}
    </Box>
  )
}

function RoomPanel({ label }: { label: string | null }) {
  if (!label) return null
  return (
    <Box
      sx={{
        mt: 2.5,
        p: 3,
        borderRadius: `${radius.cardLg}px`,
        textAlign: "center",
        background: "linear-gradient(135deg, #EAF7EE 0%, #F1FAF2 55%, #F7FBF3 100%)",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
        Your room · 你的房间
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>{label}</Typography>
    </Box>
  )
}

export function StudentCheckInFlow({
  overview,
  directionsImageUrl,
}: {
  overview: StudentCheckInOverview
  directionsImageUrl: string | null
}) {
  const [signature, setSignature] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<SubmitResult | null>(null)

  const session = overview.session
  const type = session?.type

  async function confirm() {
    if (!signature) {
      setError("Please sign in the box before confirming.")
      return
    }
    setError("")
    setBusy(true)
    try {
      const res = await submitOwnCheckIn(signature)
      if (!res.ok) {
        setError(res.error ?? "We couldn't save your signature — try again.")
        return
      }
      setResult(res)
    } finally {
      setBusy(false)
    }
  }

  const done = result
  const finished = Boolean(done) || overview.alreadySigned
  const finishedType = (done?.type ?? type) as "check_in" | "check_out" | undefined
  const finishedRoom = done?.roomLabel ?? overview.roomLabel

  return (
    <Box sx={{ maxWidth: 560, mx: "auto" }}>
      <PageHeader
        overline="Residence"
        title="Check-in / Out"
        subtitle="Confirm your attendance at the KIZ counter with your signature — no queueing."
      />

      {!session || !type ? (
        <KEmpty
          icon="event_busy"
          title="No check-in open right now"
          body="The KIZ office hasn't opened a check-in or check-out session yet. Check back later."
        />
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap" }}>
            <SessionPill type={type} name={session.name} />
            {(session.opensAtIso || session.closesAtIso) && (
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                {session.opensAtIso && `Opens ${formatMalaysia(new Date(session.opensAtIso))}`}
                {session.opensAtIso && session.closesAtIso && " · "}
                {session.closesAtIso && `Closes ${formatMalaysia(new Date(session.closesAtIso))}`}
              </Typography>
            )}
          </Box>

          {!overview.roomLabel && !done ? (
            <Box
              sx={{
                p: 3,
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
                textAlign: "center",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  mx: "auto",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.warning.soft,
                  color: color.warning.ink,
                }}
              >
                <KIcon icon="meeting_room" size={30} />
              </Box>
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>No room assigned yet</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                You don&apos;t have a room on record. Please ask at the KIZ office before checking in.
              </Typography>
            </Box>
          ) : finished && finishedType ? (
            <Box
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  mx: "auto",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: color.success.soft,
                  color: color.success.ink,
                }}
              >
                <KIcon icon="check_circle" size={34} filled />
              </Box>
              <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: 20 }}>
                You&apos;re {VERB_PAST[finishedType]}!
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 0.5 }}>
                {overview.alreadySigned && !done
                  ? "This check-in is already recorded for this session."
                  : "Welcome to Kolej Ibu Zain. Head to your room below."}
              </Typography>

              <RoomPanel label={finishedRoom} />
              <CounterPanel type={finishedType} directionsImageUrl={directionsImageUrl} />
            </Box>
          ) : (
            <Box
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: `${radius.cardLg}px`,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 17 }}>
                {ACTION_LABEL[type]} for {overview.name ?? "you"}?
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Sign below to confirm — your block and room will appear after you finish.
              </Typography>

              <SignaturePad
                onSignatureChange={(d) => {
                  setSignature(d)
                  setError("")
                }}
              />

              {error && (
                <Alert severity="error" variant="standard" sx={{ mt: 1.5, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                variant="contained"
                size="large"
                fullWidth
                disabled={busy || !signature}
                onClick={confirm}
                sx={{ mt: 2 }}
                startIcon={
                  busy ? (
                    <CircularProgress size={15} color="inherit" />
                  ) : (
                    <KIcon icon={type === "check_in" ? "login" : "logout"} size={18} />
                  )
                }
              >
                {busy ? "Saving…" : `Confirm ${ACTION_LABEL[type]}`}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}
