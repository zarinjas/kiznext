"use client"

import { useState } from "react"
import Link from "next/link"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Typography from "@mui/material/Typography"
import Alert from "@mui/material/Alert"
import CircularProgress from "@mui/material/CircularProgress"
import { color, radius } from "@/lib/theme"
import { KIcon } from "@/components/kiz/primitives/icon"
import { SignaturePad } from "@/components/shared/signature-pad"
import {
  lookupCheckInStudent,
  submitCheckInRecord,
  type StudentLookup,
} from "@/lib/checkin"

type Step =
  | { name: "matric" }
  | { name: "confirm" }
  | { name: "already" }
  | { name: "noRoom" }
  | { name: "done" }

interface Props {
  token: string
  type: "check_in" | "check_out"
  sessionName: string
  logoUrl: string | null
}

const ACTION_LABEL: Record<"check_in" | "check_out", string> = {
  check_in: "Check-in",
  check_out: "Check-out",
}

/** KIZ college green (matches lib/pdf.ts). */
const KIZ_GREEN = { deep: "#004B23", mid: "#0B6B33", soft: "#EAF7EE" }

export function CheckinFlow({ token, type, sessionName, logoUrl }: Props) {
  const [step, setStep] = useState<Step>({ name: "matric" })
  const [matric, setMatric] = useState("")
  const [lookup, setLookup] = useState<StudentLookup | null>(null)
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<string>("")
  const [busy, setBusy] = useState(false)

  const action = ACTION_LABEL[type]
  const verbPast = type === "check_in" ? "checked in" : "checked out"

  async function findStudent() {
    setError("")
    setBusy(true)
    try {
      const res = await lookupCheckInStudent(token, matric)
      if (!res.ok || !res.name) {
        setError(res.error ?? "We couldn't find that Matric No.")
        return
      }
      setLookup(res)
      if (!res.canSign) {
        setStep({ name: "already" })
      } else if (!res.roomLabel) {
        setStep({ name: "noRoom" })
      } else {
        setStep({ name: "confirm" })
      }
    } finally {
      setBusy(false)
    }
  }

  async function confirm() {
    if (!signature) {
      setError("Please sign in the box before confirming.")
      return
    }
    setError("")
    setBusy(true)
    try {
      const res = await submitCheckInRecord(token, matric, signature)
      if (!res.ok) {
        setError(res.error ?? "We couldn't save your signature — try again.")
        return
      }
      setStep({ name: "done" })
    } finally {
      setBusy(false)
    }
  }

  function restart() {
    setError("")
    setLookup(null)
    setSignature(null)
    setMatric("")
    setStep({ name: "matric" })
  }

  const resetMatric = () => {
    setError("")
    setLookup(null)
    setSignature(null)
    setMatric("")
    setStep({ name: "matric" })
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 3,
        backgroundColor: "background.default",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        {/* Brand */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 3, textAlign: "center" }}>
          {logoUrl ? (
            <Box component="img" src={logoUrl} alt="KIZ" sx={{ height: 40, mb: 1.5, objectFit: "contain" }} />
          ) : (
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 2.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: KIZ_GREEN.deep,
                color: "#fff",
                fontSize: 18,
                fontWeight: 650,
                mb: 1.5,
              }}
            >
              K
            </Box>
          )}
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.25,
              py: 0.375,
              borderRadius: 999,
              backgroundColor: KIZ_GREEN.soft,
              color: KIZ_GREEN.mid,
              fontSize: 12,
              fontWeight: 700,
              mb: 0.75,
            }}
          >
            <KIcon icon={type === "check_in" ? "login" : "logout"} size={15} />
            {sessionName}
          </Box>
          <Typography variant="h1" sx={{ fontSize: { xs: 28, sm: 32 } }}>
            {action}
          </Typography>
        </Box>

        <Box
          sx={{
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: `${radius.sheet}px`,
            p: 3,
          }}
        >
          {step.name === "matric" && (
            <>
              <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
                Enter your Matric No.
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                We&apos;ll look you up on the KIZ list to confirm your details.
              </Typography>
              <TextField
                fullWidth
                label="Matric No."
                placeholder="A123456"
                value={matric}
                onChange={(e) => setMatric(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && findStudent()}
                autoFocus
                autoCapitalize="characters"
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
                disabled={busy || !matric.trim()}
                onClick={findStudent}
                sx={{ mt: 2 }}
                startIcon={busy ? <CircularProgress size={15} color="inherit" /> : <KIcon icon="arrow_forward" size={18} />}
              >
                {busy ? "Looking up…" : "Continue"}
              </Button>
            </>
          )}

          {step.name === "confirm" && lookup?.name && (
            <>
              <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 0.5 }}>
                {action} confirmed for {lookup.name}?
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Sign below to confirm — your block and room will appear after you finish.
              </Typography>

              <SignaturePad onSignatureChange={(d) => { setSignature(d); setError("") }} />

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
                startIcon={busy ? <CircularProgress size={15} color="inherit" /> : <KIcon icon={type === "check_in" ? "login" : "logout"} size={18} />}
              >
                {busy ? "Saving…" : `Confirm ${action}`}
              </Button>
              <Button size="small" color="inherit" fullWidth sx={{ mt: 1 }} onClick={resetMatric}>
                Not you? Use another Matric No.
              </Button>
            </>
          )}

          {step.name === "already" && (
            <>
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
                  backgroundColor: color.success.soft,
                  color: color.success.ink,
                }}
              >
                <KIcon icon="verified" size={30} />
              </Box>
              <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: 17 }}>
                You&apos;ve already {verbPast} for this session.
              </Typography>
              {lookup?.roomLabel && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    borderRadius: `${radius.card}px`,
                    border: "1px solid",
                    borderColor: "divider",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    Your room
                  </Typography>
                  <Typography sx={{ fontWeight: 700, fontSize: 20 }}>{lookup.roomLabel}</Typography>
                </Box>
              )}
              <Button variant="contained" size="large" fullWidth sx={{ mt: 2 }} onClick={restart}>
                Done
              </Button>
            </>
          )}

          {step.name === "noRoom" && (
            <>
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
              <Typography sx={{ textAlign: "center", fontWeight: 700, fontSize: 17 }}>
                No room assigned yet
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 1, mb: 2 }}>
                {lookup?.name} doesn&apos;t have a room on record. Please ask at the KIZ
                counter before checking in.
              </Typography>
              <Button variant="outlined" size="large" fullWidth onClick={restart}>
                OK
              </Button>
            </>
          )}

          {step.name === "done" && (
            <>
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
                You&apos;re {verbPast}!
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", mt: 0.5 }}>
                Welcome to Kolej Ibu Zain. Head to your room below.
              </Typography>

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
                  Your room
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.02em" }}>
                  {lookup?.roomLabel}
                </Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>
                  Collect your key at the UKM Real Estate counter.
                </Typography>
              </Box>

              {type === "check_in" && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: `${radius.cardLg}px`,
                    border: "1px solid",
                    borderColor: KIZ_GREEN.mid,
                    background: "linear-gradient(180deg, #EAF7EE, #FFFFFF)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: KIZ_GREEN.mid,
                        color: "#fff",
                        flexShrink: 0,
                      }}
                    >
                      <KIcon icon="apps" size={22} />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 16, color: KIZ_GREEN.deep }}>
                        Get the KIZ app
                      </Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                        One app for everything at Kolej Ibu Zain.
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 2 }}>
                    {[
                      { icon: "meeting_room", text: "Book facilities & the guest house" },
                      { icon: "support_agent", text: "Helpdesk, announcements & community chat" },
                      { icon: "qr_code_2", text: "Your digital eCard for the gate" },
                    ].map((b) => (
                      <Box key={b.text} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <KIcon icon={b.icon} size={18} sx={{ color: KIZ_GREEN.mid }} />
                        <Typography variant="body2" sx={{ color: "text.primary" }}>
                          {b.text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Button
                    component={Link}
                    href={`/daftar?matric=${encodeURIComponent(lookup?.matricId ?? "")}&name=${encodeURIComponent(lookup?.name ?? "")}`}
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{
                      backgroundColor: KIZ_GREEN.deep,
                      "&:hover": { backgroundColor: KIZ_GREEN.mid },
                    }}
                    startIcon={<KIcon icon="person_add" size={18} />}
                  >
                    Register now
                  </Button>
                  <Typography variant="caption" sx={{ display: "block", textAlign: "center", color: "text.secondary", mt: 0.75 }}>
                    Takes about a minute — just add your UKM email.
                  </Typography>
                  <Button component={Link} href="/login" size="small" color="inherit" fullWidth sx={{ mt: 0.5 }}>
                    Already have an account? Sign in
                  </Button>
                </Box>
              )}

              <Button variant="outlined" size="large" fullWidth sx={{ mt: 2 }} onClick={restart}>
                {type === "check_in" ? "Check someone else in" : "Done"}
              </Button>
            </>
          )}
        </Box>

        <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2.5, color: "text.disabled" }}>
          Recorded in Malaysia time (UTC+8) · Kolej Ibu Zain
        </Typography>
      </Box>
    </Box>
  )
}
