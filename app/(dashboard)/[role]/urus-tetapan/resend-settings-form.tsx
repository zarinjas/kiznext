"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import { saveResendConfig } from "@/lib/settings"
import { FormSection } from "@/components/kiz/patterns/form-section"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color } from "@/lib/theme"

interface Props {
  apiKeySet: boolean
  initialFrom: string
}

export function ResendSettingsForm({ apiKeySet, initialFrom }: Props) {
  const router = useRouter()
  const [from, setFrom] = useState(initialFrom)
  const [apiKey, setApiKey] = useState("")
  const [removeKey, setRemoveKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    const result = await saveResendConfig({ apiKey, from, removeKey })
    setLoading(false)

    if (result.success) {
      setSuccess(removeKey ? "API key removed. Email needs a key again to send." : "Resend config saved! Verification emails will use it.")
      setApiKey("")
      setRemoveKey(false)
      router.refresh()
    } else {
      setError(result.error ?? "Couldn't save — try again.")
    }
  }

  return (
    <FormSection
      title="Email (Resend)"
      subtitle="API key for account-verification emails. Saved on this server only — never committed to the repo."
      icon="mail"
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <TextField
          id="resendApiKey"
          name="resendApiKey"
          label="Resend API key"
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value)
            if (e.target.value && removeKey) setRemoveKey(false)
          }}
          placeholder={apiKeySet ? "Saved — leave blank to keep it" : "re_…"}
          autoComplete="off"
          fullWidth
          disabled={removeKey}
          helperText={
            removeKey
              ? "The stored key will be removed when you save."
              : apiKeySet
                ? "The key is hidden. Leave blank to keep the current one, or paste a new key to replace it."
                : "Paste your Resend API key (starts with 're_'). Find it under resend.com → API Keys."
          }
        />

        {apiKeySet && !removeKey && (
          <Box>
            <Button
              size="small"
              onClick={() => {
                setRemoveKey(true)
                setApiKey("")
              }}
              startIcon={<KIcon icon="delete" size={15} />}
              sx={{ color: color.danger.main, textTransform: "none" }}
            >
              Remove API key
            </Button>
          </Box>
        )}

        <TextField
          id="resendFrom"
          name="resendFrom"
          label="From address"
          type="text"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder="KIZ Super App <no-reply@mykiz.my>"
          helperText="The address (and optional display name) emails are sent from. Must be on your verified Resend domain."
          fullWidth
        />

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant="contained" disabled={loading} startIcon={loading ? undefined : <KIcon icon="save" size={16} />}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </Box>
      </form>
    </FormSection>
  )
}
