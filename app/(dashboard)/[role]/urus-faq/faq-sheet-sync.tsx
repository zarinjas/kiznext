"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"
import TextField from "@mui/material/TextField"
import Alert from "@mui/material/Alert"
import Typography from "@mui/material/Typography"
import Accordion from "@mui/material/Accordion"
import AccordionSummary from "@mui/material/AccordionSummary"
import AccordionDetails from "@mui/material/AccordionDetails"
import { Surface } from "@/components/kiz/primitives/list-group"
import { KIcon } from "@/components/kiz/primitives/icon"
import { color, radius } from "@/lib/theme"
import { saveFaqSheetConfig, syncFaqsFromSheet } from "@/lib/ai/faq-actions"

interface Props {
  serviceAccountSet: boolean
  initialSpreadsheetId: string
  initialRange: string
}

export function FaqSheetSync({ serviceAccountSet, initialSpreadsheetId, initialRange }: Props) {
  const router = useRouter()
  const [serviceAccount, setServiceAccount] = useState("")
  const [spreadsheetId, setSpreadsheetId] = useState(initialSpreadsheetId)
  const [range, setRange] = useState(initialRange)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  async function handleSave() {
    setError("")
    setSuccess("")
    setSaving(true)
    try {
      const result = await saveFaqSheetConfig({ serviceAccount, spreadsheetId, range })
      if (result.success) {
        setSuccess("Google Sheet settings saved.")
        setServiceAccount("")
        router.refresh()
      } else {
        setError(result.error ?? "Couldn't save.")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setError("")
    setSuccess("")
    setSyncing(true)
    try {
      const result = await syncFaqsFromSheet()
      if (result.success) {
        setSuccess(
          `Synced from Google Sheet: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped. Re-index to make them live.`,
        )
        router.refresh()
      } else {
        setError(result.error ?? "Sync failed.")
      }
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Surface>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 0.5 }}>
        <KIcon icon="table_view" size={20} sx={{ color: color.brand[600] }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Sync from Google Sheet
        </Typography>
        <Box
          sx={{
            ml: "auto",
            px: 1,
            py: 0.25,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            backgroundColor: serviceAccountSet ? color.success.soft : color.warning.soft,
            color: serviceAccountSet ? color.success.ink : color.warning.ink,
          }}
        >
          {serviceAccountSet ? "Service account ready" : "Service account not set"}
        </Box>
      </Box>
      <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
        Let staff edit the FAQ directly in a shared Google Sheet — then pull it here. No re-uploading.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Google service account key (JSON)"
          value={serviceAccount}
          onChange={(e) => setServiceAccount(e.target.value)}
          placeholder={serviceAccountSet ? "Saved — leave blank to keep it" : "Paste the whole JSON key…"}
          multiline
          minRows={2}
          maxRows={5}
          fullWidth
          helperText={
            serviceAccountSet
              ? "A key is already configured (shared with the accommodation sync). Leave blank to keep it."
              : "Paste the service-account JSON key. Shared with the accommodation sync."
          }
        />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1.4fr 1fr" }, gap: 2 }}>
          <TextField
            label="FAQ spreadsheet ID"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
            placeholder="e.g. 1AbC…xyz"
            fullWidth
            helperText="The long id in the sheet URL between /d/ and /edit."
          />
          <TextField
            label="Range / tab"
            value={range}
            onChange={(e) => setRange(e.target.value)}
            placeholder="e.g. FAQ!A1:F1000"
            fullWidth
            helperText="Tab name, optionally with a range. Blank = first sheet."
          />
        </Box>

        {error && <Alert severity="error">{error}</Alert>}
        {success && (
          <Alert severity="success" onClose={() => setSuccess("")}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<KIcon icon="save" size={16} />} sx={{ textTransform: "none" }}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button
            variant="outlined"
            onClick={handleSync}
            disabled={syncing || !spreadsheetId.trim() || !serviceAccountSet}
            startIcon={<KIcon icon="cloud_sync" size={16} />}
            sx={{ textTransform: "none" }}
          >
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </Box>

        <Accordion
          disableGutters
          elevation={0}
          sx={{ border: "1px solid", borderColor: "divider", borderRadius: `${radius.input}px`, "&:before": { display: "none" } }}
        >
          <AccordionSummary expandIcon={<KIcon icon="expand_more" size={20} />}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Cara setup (Google Sheet + API)
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <Box component="ol" sx={{ m: 0, pl: 2.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
              {[
                "Buka console.cloud.google.com → cipta projek (atau guna yang sedia ada).",
                "Menu 'APIs & Services' → 'Library' → cari 'Google Sheets API' → Enable.",
                "Menu 'APIs & Services' → 'Credentials' → 'Create credentials' → 'Service account'. Namakan apa-apa sahaja.",
                "Buka service account tu → tab 'Keys' → 'Add key' → 'Create new key' → pilih JSON → fail akan dimuat turun.",
                "Buka fail JSON tu, salin SEMUA kandungan dan tampal dalam medan 'Google service account key' di atas.",
                "Dalam fail JSON tu juga, salin 'client_email' (bentuk …@….iam.gserviceaccount.com).",
                "Buka Google Sheet FAQ kau → klik 'Share' → tampal email tu → tetapkan akses 'Viewer' → Send.",
                "Salin Spreadsheet ID dari URL sheet: docs.google.com/spreadsheets/d/<ID_INI>/edit.",
                "Isi 'Range / tab' dengan nama tab FAQ (contoh: FAQ!A1:F1000). Baris pertama tab mesti ada lajur 'question'.",
                "Tekan 'Save settings', kemudian 'Sync now'. Selepas itu, pergi ke AI → KIZ-AI dan tekan 'Re-index now'.",
              ].map((step, i) => (
                <Box component="li" key={i} sx={{ fontSize: 13, color: "text.secondary", lineHeight: 1.5 }}>
                  {step}
                </Box>
              ))}
            </Box>
            <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1.5 }}>
              Lajur yang dibaca: category, question, answer, keywords, language, published. Baris yang padan dengan soalan sedia ada akan dikemas kini (bukan bertindih).
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Surface>
  )
}
